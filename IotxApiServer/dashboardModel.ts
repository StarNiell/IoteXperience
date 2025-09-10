import { DeviceModel } from "./deviceModel";
import { StreamModel } from "./streamModel";

export class DashboardModel {
    id: number = 0;
    name: string = "";
    devices: DeviceModel[] = [];
    streams: StreamModel[] = [];
  
    constructor(obj: {
      id: number, name: string; devices: DeviceModel[]; streams: StreamModel[]
    }) {
      this.id = obj.id;
      this.name = obj.name;
      this.devices = obj.devices;
      this.streams = obj.streams;
    }
  }
  