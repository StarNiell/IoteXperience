export class DeviceModel {
  topic: string = "";
  device_id: string = "";
  timestamp: string = "";
  type: string = "";
  value: number = 0;
  unit: string = "";
  subscription: string = "";
  status: string = "";

  constructor(obj: { topic: string; device_id: string; timestamp: string, type: string; value: number; unit: string, subscription: string, status: string }) {
    this.topic = obj.topic;
    this.device_id = obj.device_id;
    this.timestamp = obj.timestamp;
    this.type = obj.type;
    this.value = obj.value;
    this.unit = obj.unit;
    this.subscription = obj.subscription;
    this.status = obj.status;
  }
}
