import { createContext, useContext } from 'react';
import { DeviceModel } from './devices/models/deviceModel';

// MQTT connection state shared by the app (the provider is in mqtt.tsx).
export type MqttStatus = "offline" | "disconnected" | "connecting" | "connected";

export interface MqttContextValue {
  status: MqttStatus;
  deviceList: DeviceModel[];
  // Rejects (without sending anything) when the broker is not connected
  publishMessage: (topic: string, message: string) => Promise<void>;
}

export const MqttContext = createContext<MqttContextValue>({
  status: "disconnected",
  deviceList: [],
  publishMessage: async () => { throw new Error("MQTT not available"); },
});

export function useMqtt() {
  return useContext(MqttContext);
}
