import React, { useState, useEffect } from "react";
import { DeviceModel } from "./models/deviceModel";
import SwitchViewUI from "./UI/switchview";
import SimpleCanvas from "./UI/simplecanvas";
import ContactViewUI from "./UI/contactview";

const Device: React.FC<{ device: DeviceModel }> = ({ device }) => {
    const [state, setState] = useState(device.value);

    useEffect(() => {
        setState(device.value);
    }, [device.value]);

    let content;
    switch (device.type) {
        case "switch":
            content = <SwitchViewUI caption={device.title !== "" ? device.title : "Switch"} device_id={device.device_id} value={state} button={false} />;
            break;

        case "button":
            content = <SwitchViewUI caption={device.title !== "" ? device.title : "Button"} device_id={device.device_id} value={state}  button={true} />;
            break;

        case "sensor":
            content = <SimpleCanvas value={state} caption={device.title !== "" ? device.title : "Sensor"} minVal={device.min} maxVal={device.max} rangeValues={[device.max, (device.max * 0.6), (device.max / 2), (device.max * 0.34), (device.max * 0.3)]} rangeColors={['red', 'orange', 'green', 'orange', '#0d6efd']} />;
            break;

        case "contact":
            content = <ContactViewUI caption={device.title !== "" ? device.title : "Contact"} device_id={device.device_id} value={state} />;
            break;

        default:
            content = <div>Default type</div>;
            break;
    }

    return (
        <>
            {content}
        </>
    );
};

export default Device;