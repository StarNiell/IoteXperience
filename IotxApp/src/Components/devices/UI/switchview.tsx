
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDotCircle } from '@fortawesome/free-regular-svg-icons'
import { useMqtt } from '../../mqtt';

const SwitchViewUI: React.FC<{ device_id: string, value: number; caption: string }> = ({device_id, value, caption }) => {
    const { mqttClient } = useMqtt();

    let switchState: string = ""
    if (value)
        switchState = "switch-on";
    else
        switchState = "switch-off";

    let currentValue: number = value;

    const setAction = () => {
        if (mqttClient)
        {
            currentValue = currentValue === 1 ? 0 : 1;

            mqttClient.publish("iotx/in", '{"device_id": "' + device_id + '", "value": ' + currentValue + '}')
        }
        else
        {
            alert("No mqttClient avaialble!");
        }
        
    }

    return (
        <>
            <div className="bg-dark rounded p-1" style={{ minHeight: '165px' }} >
                <center><div style={{ minHeight: "25px" }} className="bg-lightgray rounded text-dark" >{caption}</div></center>
                <div className="device-ui" style={{ minHeight: "132px" }}>
                    <center><h1 onClick={setAction} className={switchState + " display-1"} style={{ padding: "auto", cursor: 'pointer' }}><FontAwesomeIcon icon={faDotCircle} /></h1></center>
                </div>
            </div>
        </>
    );

}
export default SwitchViewUI