import { DeviceModel } from "./deviceModel";

export class DashboardModel {
    id: number = 0;
    name: string = "";
    devices: DeviceModel[] = [];
  
    constructor(obj: {
      id: number, name: string; devices: DeviceModel[]
    }) {
      this.id = obj.id;
      this.name = obj.name;
      this.devices = obj.devices;
    }
  }
  