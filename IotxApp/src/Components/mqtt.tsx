import mqtt, { MqttClient } from "mqtt";
import React, { createContext, useContext, useEffect, useState } from 'react';
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

export const useMqtt = () => useContext(MqttContext);

const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  const [, setConnectStatus] = useState('')
  const [deviceList, setDeviceList] = useState<DeviceModel[]>([]);

// Connessione unica al montaggio del provider
  useEffect(() => {
    let client: MqttClient;

    const connectToMqtt = async () => {

      console.log("checkMqttConnection requests!");
      console.log("connecting to mqtt broker");
      setConnectStatus('Connecting');

      const rand = Math.floor(Math.random() * 100);

      const brokerUrl = `${config.mqttServer}`;
      const options = {
        clientId: `${config.mqttClientId}-${rand.toString()}`,
        username: `${config.mqttUsername}`,
        password: `${config.mqttPassword}`,
        //clean: true,
        reconnectPeriod: 0, // ms
        //connectTimeout: 5 * 1000, // ms
      };
      client = mqtt.connect(brokerUrl, options);

      setMqttClient(client);

      client.on('connect', () => {
        setConnectStatus('Connected')
        console.log('connection successful')
        client.subscribe('iotx/out/#', function (err) {
          if (err) {
            console.log(err);
          }
        });
      });

      client.on('disconnect', () => {
        console.log('disconnection successful')
      });

      client.on('error', (err) => {
        console.error('Connection error: ', err)
        client.end()
      })

      // https://github.com/mqttjs/MQTT.js#event-reconnect
      client.on('reconnect', () => {
        setConnectStatus('Reconnecting')
      })


      client.on('message', (topic, message, packet) => {
        const isRetained = packet.retain;
        var payload = JSON.parse(message.toString());

        // Workaround for sensor with timestamp === "0000-00-00T00:00:00Z"
        if (!isRetained && payload.timestamp === "0000-00-00T00:00:00Z") {
          let currentDate = new Date();
          let formattedDate = currentDate.toISOString().slice(0, 19) + "Z";
          payload.timestamp = formattedDate;
        }

        setDeviceList(prevDeviceList => {
          // Cloniamo l'array precedente per creare un nuovo riferimento
          let newDeviceList = [...prevDeviceList];

          let deviceIndex = newDeviceList.findIndex(element => element.topic === topic && element.device_id === payload.device_id);
          if (deviceIndex !== -1) {
            // Se il dispositivo esiste, aggiorniamo i valori
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
            // Se il dispositivo non esiste, lo aggiungiamo
            const newDevice = new DeviceModel({
              id: 0, // default value
              topic: topic,
              device_id: payload.device_id,
              type: payload.type,
              value: payload.value,
              value2: payload.value2 ?? null,
              timestamp: payload.timestamp,
              unit: payload.unit,
              unit2: payload.unit2 ?? "",
              subscription: payload.subscription,
              status: payload.status,
              step: 0, // default value
              min: 0, // default value
              max: 100, // default value
              title: '', // default value
              description: '', // default value
              position: 0, // default value
              dashboard_device_id: 0 // default value
            });
            newDeviceList.push(newDevice);
            //console.log(newDevice);
          }

          return newDeviceList; // React rileverà la modifica e attiverà un re-render
        });

        //console.log({ "topic": topic, "device_id": payload.device_id, "type": payload.type, "value": payload.value, "timestamp": payload.timestamp, "unit": payload.unit, "status": payload.status });

      });
    } 
    
    connectToMqtt();

    // Pulizia al dismount
    return () => {
      if (client) {
        client.end(true);
      }
    };
  }, []);

  const publishMessage = async (topic: string, message: string) => {

    //if (!mqttClient)
    //  await checkMqttConnection();

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

  // Funzione di verifica connessione
  const checkMqttConnection = async (): Promise<void> => {
    if (mqttClient?.connected) {
      console.log('Connessione MQTT attiva');
    } else {
      console.log('Connessione MQTT non disponibile... Reconnessione in corso');
      mqttClient?.reconnect();
    }
  };

  return (
    <MqttContext.Provider value={{ mqttClient, setMqttClient, deviceList, setDeviceList, publishMessage, checkMqttConnection }}>
      {children}
    </MqttContext.Provider>
  );

}
export default MqttProvider
