import React, { createContext, useContext, useState, useCallback } from 'react';
import mqtt from "mqtt";
import { DeviceModel } from './devices/models/deviceModel';
import config from '../config/config';

const MqttContext = createContext<{
  mqttClient: mqtt.MqttClient | null;
  setMqttClient: React.Dispatch<React.SetStateAction<mqtt.MqttClient | null>>;
  deviceList: DeviceModel[] | [];
  setDeviceList: React.Dispatch<React.SetStateAction<DeviceModel[] | []>>;
  publishMessage: (topic: string, message: string) => Promise<void>;
  checkMqttConnection: () => Promise<void>;
}>({
  mqttClient: null,
  setMqttClient: () => { },
  deviceList: [],
  setDeviceList: () => [],
  publishMessage: async () => { },
  checkMqttConnection: async () => { },
});

//export const useMqtt = () => useContext(MqttContext);

export function useMqtt() {
  return useContext(MqttContext);
}

const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  const [deviceList, setDeviceList] = useState<DeviceModel[]>([]);

  const connectToMqtt = useCallback(async () => {
    console.log("connection request to mqtt broker... mqtt-connected-status: " + localStorage.getItem("mqtt-connected-status"));

    //const rand = Math.floor(Math.random() * 100);
    const clientId = `${config.mqttClientId}-${localStorage.getItem("client-id")}`;

    if ((localStorage.getItem("mqtt-connected-status") === "connected" || localStorage.getItem("mqtt-connected-status") === "connecting"))
    {
      console.log("MQTT already connected or connecting, skip new connection");
      return;
    }

    console.log("MQTT not connected or connecting, do a new connection");

    const brokerUrl = `${config.mqttServer}`;

    const options = {
      clientId: clientId, //`${config.mqttClientId}-${rand.toString()}`,
      username: `${config.mqttUsername}`,
      password: `${config.mqttPassword}`,
      reconnectPeriod: 0,
    };

    const client = mqtt.connect(brokerUrl, options);
    setMqttClient(client);

    client.on('connect', () => {
      console.log('connection successful (client-id:'+  clientId + ')... subscribing to topics iotx/out/#');
      localStorage.setItem("mqtt-connected-status", "connected");
      client.subscribe('iotx/out/#', (err) => {
        if (err) console.log(err);
      });
    });

    client.on('disconnect', () => {
      localStorage.setItem("mqtt-connected-status", "disconnected");
      console.log('disconnection successful')
    });

    client.on('error', (err) => {
      console.error('Connection error: ', err)
      client.end()
      localStorage.setItem("mqtt-connected", "false");
    })

    client.on('reconnect', () => {
      localStorage.setItem("mqtt-connected-status", "connecting");
      console.log('Reconnecting')
    })

    client.on('message', (topic, message, packet) => {
      const isRetained = packet.retain;
      var payload = JSON.parse(message.toString());

      // workaround per device che non inviano il timestamp
      if (!isRetained && payload.timestamp === "0000-00-00T00:00:00Z") {
        let currentDate = new Date();
        let formattedDate = currentDate.toISOString().slice(0, 19) + "Z";
        payload.timestamp = formattedDate;
      }

      setDeviceList(prevDeviceList => {
        let newDeviceList = [...prevDeviceList];
        let deviceIndex = newDeviceList.findIndex(
          element => element.topic === topic && element.device_id === payload.device_id
        );

        if (deviceIndex !== -1) {
          newDeviceList[deviceIndex] = {
            ...newDeviceList[deviceIndex],
            type: payload.type,
            value: payload.value,
            value2: payload.value2 ?? null,
            timestamp: payload.timestamp,
            unit: payload.unit,
            unit2: payload.unit2 ?? "",
            subscription: payload.subscription,
            status: payload.status
          };
        } else {
          const newDevice = new DeviceModel({
            id: 0,
            topic,
            device_id: payload.device_id,
            type: payload.type,
            value: payload.value,
            value2: payload.value2 ?? null,
            timestamp: payload.timestamp,
            unit: payload.unit,
            unit2: payload.unit2 ?? "",
            subscription: payload.subscription,
            status: payload.status,
            step: 0,
            min: 0,
            max: 100,
            title: '',
            description: '',
            position: 0,
            dashboard_device_id: 0,
            offset: 0,
            offset2: 0,
          });
          newDeviceList.push(newDevice);
        }

         console.log({"client-id": client.options.clientId??"", "device_id": payload.device_id, "timestamp": payload.timestamp });

         return newDeviceList;
      });
    });
  }, []);

  /*
  useEffect(() => {
    connectToMqtt();
    return () => {
      if (mqttClient) mqttClient.end(true);
    };
  }, [connectToMqtt]);
  */

  const publishMessage = async (topic: string, message: string) => {
    if (mqttClient) {
      mqttClient.publish(topic, message, (err) => {
        if (err) {
          console.error("Publish error: ", err);
        } else {
          console.log(`Message published to topic "${topic}": ${message}`);
        }
      });
    }
  };

  const checkMqttConnection = async (): Promise<void> => {
    if (mqttClient?.connected) {
      console.log('Connessione MQTT attiva');
    } else if (mqttClient) {
      console.log('Connessione MQTT non disponibile... Reconnessione in corso');
      mqttClient.reconnect();
    } else {
      console.log('Nessun client MQTT, nuova connessione...' + window.location.href);
      await connectToMqtt();   
    }
  };

  return (
    <MqttContext.Provider value={{ mqttClient, setMqttClient, deviceList, setDeviceList, publishMessage, checkMqttConnection }}>
      {children}
    </MqttContext.Provider>
  );
}
export default MqttProvider;
