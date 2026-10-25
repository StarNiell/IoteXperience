import React from "react";
import { DeviceModel } from "./models/deviceModel";
import { useMqtt } from "../mqttContext";
import { useTick } from "../../hooks/useTick";
import { TimeUtil } from "../../utils/timeutil";
import WidgetCard from "../widgets/WidgetCard";
import SwitchWidget from "../widgets/SwitchWidget";
import ContactWidget from "../widgets/ContactWidget";
import SensorWidget from "../widgets/SensorWidget";

// How often the widgets re-check the age of their data
const DATA_AGE_CHECK_INTERVAL = 15 * 1000;
// A value older than this is "no data" (red header)
const MAX_AGE_STATE = 2 * 60 * 1000;     // switch, button, contact (devices send every 60 s)
const MAX_AGE_SENSOR = 5 * 60 * 1000;

const DEFAULT_TITLES: Record<string, string> = {
    switch: "Switch", button: "Button", contact: "Contact", sensor: "Sensor",
};

// One dashboard widget: picks the view by device type
const Device: React.FC<{ device: DeviceModel }> = ({ device }) => {
    const { status } = useMqtt();
    useTick(DATA_AGE_CHECK_INTERVAL);

    const connected = status === "connected";
    const title = device.title || DEFAULT_TITLES[device.type] || device.device_id;
    const maxAge = device.type === "sensor" ? MAX_AGE_SENSOR : MAX_AGE_STATE;
    const state = TimeUtil.deviceState(device.timestamp, maxAge, connected);
    const value = Number(device.value);

    switch (device.type) {
        case "switch":
        case "button":
            return (
                <WidgetCard title={title} level={state.level} status={state.text}>
                    <SwitchWidget title={title} deviceId={device.device_id} subscription={device.subscription}
                        value={value} usable={state.usable} momentary={device.type === "button"} />
                </WidgetCard>
            );

        case "contact":
            return (
                <WidgetCard title={title} level={state.level} status={state.text}>
                    <ContactWidget value={value} />
                </WidgetCard>
            );

        case "sensor":
            return (
                <WidgetCard title={title} level={state.level} status={state.text} wide>
                    <SensorWidget title={title}
                        value={value + (Number(device.offset) || 0)} unit={device.unit ?? ""}
                        value2={device.value2 ?? null} unit2={device.unit2 ?? ""}
                        min={Number(device.min) || 0} max={Number(device.max) || 100} />
                </WidgetCard>
            );

        default:
            return (
                <WidgetCard title={title} level="warning" status={device.type || "unknown"}>
                    <span className="iotx-card-foot">Unsupported device type</span>
                </WidgetCard>
            );
    }
};

export default Device;
