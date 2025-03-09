export class DeviceModel {
  id: number = 0;
  topic: string = "";
  device_id: string = "";
  timestamp: string = "";
  type: string = "";
  value: number = 0;
  unit: string = "";
  subscription: string = "";
  status: string = "";
  step: number = 0;
  min: number = 0;
  max: number = 0;
  title: string = "";
  description: string = "";

  constructor(obj: {
    id: number, topic: string; device_id: string; timestamp: string, type: string;
    value: number; unit: string, subscription: string, status: string;
    step: number, min: number, max: number, title: string, description: string
  }) {
    this.id = obj.id;
    this.topic = obj.topic;
    this.device_id = obj.device_id;
    this.timestamp = obj.timestamp;
    this.type = obj.type;
    this.value = obj.value;
    this.unit = obj.unit;
    this.subscription = obj.subscription;
    this.status = obj.status;
    this.step = obj.step;
    this.min = obj.min;
    this.max = obj.max;
    this.title = obj.title;
    this.description = obj.description;
  }
}
