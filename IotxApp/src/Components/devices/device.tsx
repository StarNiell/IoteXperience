import React, { useState, useEffect } from "react";
import { DeviceModel } from "./models/deviceModel";
import SwitchViewUI from "./UI/switchview";
import SimpleCanvas from "./UI/simplecanvas";
import ContactViewUI from "./UI/contactview";
import { useMqtt } from "../mqtt";
import { useTick } from "../../hooks/useTick";

// How often the widgets re-check the age of their data
const DATA_AGE_CHECK_INTERVAL = 15 * 1000;

const Device: React.FC<{ device: DeviceModel }> = ({ device }) => {
    // Widgets show a red header while the MQTT connection is down
    const { status } = useMqtt();
    const connected = status === "connected";
    useTick(DATA_AGE_CHECK_INTERVAL);
    const [value, setValue] = useState(device.value);
    //const [offset, setOffset] = useState(device.offset);
    const [value2, setValue2] = useState(device.value2);
    const [unit2, setUnit2] = useState(device.unit2);
    //const [offset2, setOffset2] = useState(device.offset2);

    useEffect(() => {
        setValue(device.value);
    }, [device.value]);

    /*
    useEffect(() => {
        setOffset(device.offset);
    }, [device.offset]);
    */

    useEffect(() => {
        setValue2(device.value2 );
    }, [device.value2]);

    useEffect(() => {
        setUnit2(device.unit2 );
    }, [device.unit2]);
    /*
    useEffect(() => {
        setOffset2(device.offset2);
    }, [device.offset2]);
    */
    let content;

    const test = value + device.offset;

    switch (device.type) {
        case "switch":
            content = <SwitchViewUI 
                subscription={device.subscription} 
                caption={device.title !== "" ? device.title : "Switch"} 
                device_id={device.device_id} 
                value={value} button={false} 
                timestamp={device.timestamp} 
                connected={connected}
                />;
            break;

        case "button":
            content = <SwitchViewUI 
                subscription={device.subscription} 
                caption={device.title !== "" ? device.title : "Button"} 
                device_id={device.device_id} 
                value={value}  
                timestamp={device.timestamp} 
                connected={connected}
                button={true} 
                />;
            break;

        case "sensor":
            content = <SimpleCanvas 
                value={test} 
                timestamp={device.timestamp} 
                connected={connected}
                text={`${value2}${unit2 ? " " + unit2 : ""}`} 
                caption={device.title !== "" ? device.title : "Sensor"} 
                minVal={device.min} 
                maxVal={device.max} 
                rangeValues={[device.max, (device.max * 0.567), (device.max * 0.417), (device.max * 0.284)]} 
                rangeColors={['red', 'orange', 'green', '#0d6efd']} 
                unit={device.unit}
                />;
            break;

        case "contact":
            content = <ContactViewUI 
                caption={device.title !== "" ? device.title : "Contact"} 
                value={value} 
                timestamp={device.timestamp} 
                connected={connected}
                />;
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