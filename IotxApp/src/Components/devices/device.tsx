import React, { useState, useEffect } from "react";
import { DeviceModel } from "./models/deviceModel";
import SwitchViewUI from "./UI/switchview";
import SimpleCanvas from "./UI/simplecanvas";

const Device: React.FC<{ device: DeviceModel }> = ({ device }) => {
    const [state, setState] = useState(device.value);

    useEffect(() => {
        setState(device.value);
    }, [device.value]);

    let content;
    switch (device.type) {
        case "switch":
            content = <SwitchViewUI caption={device.title !== "" ? device.title : "Switch"} device_id={device.device_id} value={state} />;
            break;

        case "button":
            content = <SwitchViewUI caption={device.title !== "" ? device.title : "Button"} device_id={device.device_id} value={state} />;
            break;

        case "sensor":
            content = <SimpleCanvas temp={state} caption={device.title !== "" ? device.title : "Sensor"} minVal={0} maxVal={50} rangeValues={[50, 30, 25, 17, 15]} rangeColors={['red', 'orange', 'green', 'orange', '#0d6efd']} />;
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