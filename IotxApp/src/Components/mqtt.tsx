import React, { useState, useCallback, useRef, useEffect } from 'react';
import mqtt from "mqtt";
import { DeviceModel } from './devices/models/deviceModel';
import config from '../config/config';
import ApiCalls from './apicalls';
import { useAuth } from '../Auth/auth';
import { usePageActive } from '../hooks/usePageActive';
import { MqttContext, MqttStatus } from './mqttContext';

// Connection to the MQTT broker (WebSocket).
//
// - The broker account is given by IotxApiServer after login (not in the app bundle).
// - Dropped connections are re-established automatically every RECONNECT_PERIOD.
// - When the page is hidden (tab in background, phone screen off) for more than
//   HIDDEN_CLOSE_DELAY the connection is closed to save battery and data; it is opened
//   again as soon as the page is visible. The device list is kept meanwhile, and the
//   retained messages refresh it right after the new connection.
// - When the page comes back after being hidden longer than STALE_AFTER_HIDDEN, a fresh
//   connection is opened anyway: after a sleep the old socket may look open but be dead.
// - When the browser reports that the network is gone, the connection is closed at once
//   (status "offline") and opened again when the network is back. If the network is up but
//   the broker is unreachable, the keepalive detects it within about 1.5 x KEEPALIVE_SECONDS.

const RECONNECT_PERIOD = 5 * 1000;
const CONNECT_TIMEOUT = 10 * 1000;
const KEEPALIVE_SECONDS = 10;
const HIDDEN_CLOSE_DELAY = 2 * 60 * 1000;
const STALE_AFTER_HIDDEN = 60 * 1000;
const DEVICE_TOPICS = 'iotx/out/#';

// Broker answers meaning "wrong username/password" or "not authorized"
// (MQTT 3.1.1 return codes 4, 5; MQTT 5 reason codes 134, 135): retrying is useless.
const AUTH_ERROR_CODES = [4, 5, 134, 135];

// Fields sent by the devices on iotx/out/<type>-<uid>
interface DevicePayload {
  device_id: string;
  type: string;
  value: number;
  value2?: number | null;
  timestamp: string;
  unit: string;
  unit2?: string;
  subscription: string;
  status: string;
  ip?: string;
}

// Returns the payload of a device message, or null (with a warning) if it is not usable.
function parseDevicePayload(topic: string, message: Uint8Array): DevicePayload | null {
  const text = new TextDecoder().decode(message);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    console.warn(`MQTT message ignored on "${topic}": not valid JSON: ${text.slice(0, 200)}`);
    return null;
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    console.warn(`MQTT message ignored on "${topic}": not a JSON object: ${text.slice(0, 200)}`);
    return null;
  }
  const deviceId = (payload as { device_id?: unknown }).device_id;
  if (deviceId === undefined || deviceId === null || deviceId === "") {
    console.warn(`MQTT message ignored on "${topic}": missing device_id`);
    return null;
  }
  return payload as DevicePayload;
}

function isAuthError(err: Error & { code?: number }): boolean {
  return typeof err.code === "number" && AUTH_ERROR_CODES.includes(err.code);
}

const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<MqttStatus>("disconnected");
  const [deviceList, setDeviceList] = useState<DeviceModel[]>([]);
  const { user, setAuth, setUser } = useAuth();
  const sessionToken = user?.data?.Token;
  const { visible, online, wakeup } = usePageActive();

  // The current client lives in a ref, so callbacks never see an old one
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  // True while the credentials are being requested (avoids double connections)
  const connectingRef = useRef(false);
  // Incremented on every close: a connection started before it is abandoned
  const generationRef = useRef(0);
  // When the page was hidden (0 = visible)
  const hiddenSinceRef = useRef(0);
  const hiddenCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Retry after the credentials could not be obtained (API not reachable)
  const credentialsRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [credentialsRetry, setCredentialsRetry] = useState(0);

  const handleMessage = useCallback((topic: string, message: Uint8Array, packet: mqtt.IPublishPacket) => {
    const payload = parseDevicePayload(topic, message);
    if (!payload) return;

    // Workaround for devices that do not send the timestamp
    if (!packet.retain && payload.timestamp === "0000-00-00T00:00:00Z") {
      payload.timestamp = new Date().toISOString().slice(0, 19) + "Z";
    }

    setDeviceList(prevDeviceList => {
      const newDeviceList = [...prevDeviceList];
      const deviceIndex = newDeviceList.findIndex(
        element => element.topic === topic && element.device_id === payload.device_id
      );
      const values = {
        type: payload.type,
        value: payload.value,
        value2: payload.value2 ?? 0,
        timestamp: payload.timestamp,
        unit: payload.unit,
        unit2: payload.unit2 ?? "",
        subscription: payload.subscription,
        status: payload.status,
        ip: typeof payload.ip === "string" ? payload.ip : undefined,
      };

      if (deviceIndex !== -1) {
        newDeviceList[deviceIndex] = { ...newDeviceList[deviceIndex], ...values };
      } else {
        newDeviceList.push(new DeviceModel({
          ...values,
          id: 0,
          topic,
          device_id: payload.device_id,
          step: 0,
          min: 0,
          max: 100,
          title: '',
          description: '',
          position: 0,
          dashboard_device_id: 0,
          offset: 0,
          offset2: 0,
        }));
      }
      return newDeviceList;
    });
  }, []);

  // Closes the current connection (if any). The device list is kept.
  const disconnect = useCallback((reason: string) => {
    generationRef.current++;
    connectingRef.current = false;
    if (credentialsRetryTimerRef.current) {
      clearTimeout(credentialsRetryTimerRef.current);
      credentialsRetryTimerRef.current = null;
    }
    const client = clientRef.current;
    clientRef.current = null;
    if (client) {
      client.removeAllListeners();
      client.on('error', () => { });   // errors of a client being closed are not interesting
      client.end(true);
      console.log(`MQTT connection closed (${reason})`);
    }
    setStatus("disconnected");
  }, []);

  // Opens a new connection with fresh credentials, unless one exists or is being opened.
  const connect = useCallback(async (token: string) => {
    if (clientRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setStatus("connecting");
    const generation = generationRef.current;

    const credentials = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getmqttcredentials/`, "get", setAuth, setUser);
    if (generation !== generationRef.current) {
      console.log("MQTT connection abandoned (closed while requesting the credentials)");
      return;
    }
    connectingRef.current = false;
    if (!credentials || credentials.error || !credentials.username) {
      const httpStatus = credentials?.error?.status;
      const reason = credentials?.error?.message ?? "no answer";
      if (httpStatus === 401 || httpStatus === 403) {
        // Session not valid: ApiCalls has already logged out, no point in retrying
        console.error("MQTT credentials refused: " + reason);
        setStatus("disconnected");
        return;
      }
      // API not reachable or temporary error: try again (only while the page is visible)
      console.warn(`MQTT credentials not available (${reason}), retrying in ${RECONNECT_PERIOD / 1000} s`);
      setStatus("connecting");
      credentialsRetryTimerRef.current = setTimeout(() => {
        credentialsRetryTimerRef.current = null;
        setCredentialsRetry(n => n + 1);
      }, RECONNECT_PERIOD);
      return;
    }

    const clientId = `${config.mqttClientId}-${localStorage.getItem("client-id")}`;
    console.log(`MQTT connecting to ${config.mqttServer} (client-id: ${clientId})`);
    const client = mqtt.connect(config.mqttServer, {
      clientId,
      username: credentials.username,
      password: credentials.password,
      keepalive: KEEPALIVE_SECONDS,
      reconnectPeriod: RECONNECT_PERIOD,
      connectTimeout: CONNECT_TIMEOUT,
      // Commands given while offline are rejected, not sent later
      queueQoSZero: false,
    });
    clientRef.current = client;

    client.on('connect', () => {
      console.log(`MQTT connected, subscribing to ${DEVICE_TOPICS}`);
      setStatus("connected");
      client.subscribe(DEVICE_TOPICS, (err) => {
        if (err) console.error("MQTT subscribe error: ", err);
      });
    });
    client.on('reconnect', () => {
      console.log("MQTT reconnecting...");
      setStatus("connecting");
    });
    client.on('close', () => {
      // "reconnecting" is set by the library when an automatic retry is scheduled
      if (client.reconnecting) {
        console.log(`MQTT connection lost, retrying in ${RECONNECT_PERIOD / 1000} s`);
        setStatus("connecting");
      } else {
        console.log("MQTT connection lost");
        setStatus("disconnected");
      }
    });
    client.on('error', (err) => {
      console.error("MQTT error: ", err.message);
      if (isAuthError(err)) {
        // Retrying with the same credentials is useless: a new connection (with new
        // credentials from the API) is attempted when the page becomes visible again.
        disconnect("broker refused the credentials");
      }
    });
    client.on('message', handleMessage);
  }, [setAuth, setUser, handleMessage, disconnect]);

  // Connection lifecycle: logged in or not, page visible or hidden.
  useEffect(() => {
    if (!sessionToken) {
      // Not logged in (or logged out): no connection and no device data
      if (hiddenCloseTimerRef.current) {
        clearTimeout(hiddenCloseTimerRef.current);
        hiddenCloseTimerRef.current = null;
      }
      if (clientRef.current || connectingRef.current) disconnect("not logged in");
      setDeviceList(prev => (prev.length ? [] : prev));
      return;
    }

    if (!online) {
      // No network: do not wait for the keepalive, the connection cannot work
      if (hiddenCloseTimerRef.current) {
        clearTimeout(hiddenCloseTimerRef.current);
        hiddenCloseTimerRef.current = null;
      }
      if (clientRef.current || connectingRef.current || credentialsRetryTimerRef.current) {
        disconnect("browser offline");
      }
      setStatus("offline");
      return;
    }

    if (!visible) {
      if (hiddenSinceRef.current === 0) hiddenSinceRef.current = Date.now();
      if (!hiddenCloseTimerRef.current) {
        hiddenCloseTimerRef.current = setTimeout(() => {
          hiddenCloseTimerRef.current = null;
          disconnect("page hidden for " + HIDDEN_CLOSE_DELAY / 1000 + " s");
        }, HIDDEN_CLOSE_DELAY);
      }
      return;
    }

    // Page visible (or woken up)
    if (hiddenCloseTimerRef.current) {
      clearTimeout(hiddenCloseTimerRef.current);
      hiddenCloseTimerRef.current = null;
    }
    const hiddenFor = hiddenSinceRef.current ? Date.now() - hiddenSinceRef.current : 0;
    hiddenSinceRef.current = 0;

    const client = clientRef.current;
    if (client && hiddenFor > STALE_AFTER_HIDDEN) {
      disconnect(`page was hidden for ${Math.round(hiddenFor / 1000)} s, opening a fresh connection`);
    } else if (client && !client.connected) {
      // Do not wait for the next automatic attempt (its timer may have been frozen)
      disconnect("not connected on wakeup, opening a fresh connection");
    }
    connect(sessionToken);
  }, [sessionToken, visible, online, wakeup, credentialsRetry, connect, disconnect]);

  // Rejects (without sending anything) when the broker is not connected.
  const publishMessage = useCallback((topic: string, message: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const client = clientRef.current;
      if (!client?.connected) {
        reject(new Error("MQTT not connected: command not sent"));
        return;
      }
      client.publish(topic, message, (err) => {
        if (err) {
          console.error("MQTT publish error: ", err);
          reject(err);
        } else {
          console.log(`MQTT message published to "${topic}": ${message}`);
          resolve();
        }
      });
    });
  }, []);

  return (
    <MqttContext.Provider value={{ status, deviceList, publishMessage }}>
      {children}
    </MqttContext.Provider>
  );
}
export default MqttProvider;
