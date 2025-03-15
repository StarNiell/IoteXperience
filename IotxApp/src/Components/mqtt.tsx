import mqtt from "mqtt";
import React, { createContext, useContext, useState } from 'react';
import { DeviceModel } from './devices/models/deviceModel';
import config from '../config/config';


const MqttContext = createContext<{
  mqttClient: mqtt.MqttClient | null;
  setMqttClient: React.Dispatch<React.SetStateAction<mqtt.MqttClient | null>>;
  deviceList: DeviceModel[] | [];
  setDeviceList: React.Dispatch<React.SetStateAction<DeviceModel[] | []>>;
}>({
  mqttClient: null,
  setMqttClient: () => { },
  deviceList: [],
  setDeviceList: () => []
});

export const useMqtt = () => useContext(MqttContext);

const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  const [, setConnectStatus] = useState('')
  const [deviceList, setDeviceList ] = useState<DeviceModel[]>([]);


  if (!(mqttClient)) {
    console.log("No mqtt connection available!");
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
    var client = mqtt.connect(brokerUrl, options);

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

 
    client.on('message', (topic, message) => {
      var payload = JSON.parse(message.toString());
    
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
            timestamp: payload.timestamp,
            unit: payload.unit,
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
            timestamp: payload.timestamp,
            unit: payload.unit,
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
          console.log(newDevice);
        }
    
        return newDeviceList; // React rileverà la modifica e attiverà un re-render
      });
    
      console.log({"topic": topic, "device_id": payload.device_id, "type": payload.type, "value": payload.value, "timestamp": payload.timestamp, "unit": payload.unit, "status": payload.status  });
      
    });

  }

  return (
    <MqttContext.Provider value={{ mqttClient, setMqttClient, deviceList, setDeviceList }}>
      {children}
    </MqttContext.Provider>
  );

}
export default MqttProvider
