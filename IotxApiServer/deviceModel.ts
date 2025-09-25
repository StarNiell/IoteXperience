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
  position: number = 0;
  dashboard_device_id: number = 0;
  value2: number = 0;
  unit2: string = "";
  offset: number = 0;
  offset2: number = 0;

  constructor(obj: {
    id: number, topic: string; device_id: string; timestamp: string, type: string;
    value: number; unit: string, subscription: string, status: string;
    step: number, min: number, max: number, title: string, description: string;
    position: number; dashboard_device_id: number; value2: number; unit2: string; offset: number; offset2: number;
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
    this.position = obj.position;
    this.dashboard_device_id = obj.dashboard_device_id;
    this.value2 = obj.value2;
    this.unit2 = obj.unit2;
    this.offset = obj.offset;
    this.offset2 = obj.offset2;
  }
}
