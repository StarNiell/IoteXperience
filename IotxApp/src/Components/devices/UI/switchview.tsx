
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDotCircle } from '@fortawesome/free-regular-svg-icons'
import { faCircleDot } from '@fortawesome/free-solid-svg-icons'
import { useMqtt } from '../../mqtt';
import { TimeUtil } from '../../../utils/timeutil.ts';

const SwitchViewUI: React.FC<{subscription: string,  
                                device_id: string, 
                                value: number; 
                                timestamp: string;
                                caption: string; 
                                button: boolean;
                                connected: boolean }
                            > = ({subscription, device_id, value, timestamp, caption, button, connected }) => {
    const { publishMessage } = useMqtt();

    let switchState: string = ""
    if (value)
        switchState = "switch-on";
    else
        switchState = "switch-off";

    // Red header when MQTT is disconnected or the value is older than 2 minutes
    const maxAge = 2 * 60 * 1000;
    const expired = TimeUtil.isExpired(timestamp, maxAge);
    const bgClassName = TimeUtil.deviceHeaderClass(timestamp, maxAge, connected);

    let currentValue: number = value;

    const handlePublish = () => {
        if (connected && !expired)
        {
            currentValue = currentValue === 1 ? 0 : 1;
            publishMessage(subscription, '{"device_id": "' + device_id + '", "value": ' + currentValue + '}')
            .then(() => console.log("Message published successfully"))
            .catch((err) => console.error("Failed to publish message: ", err));
        }
      };

      return (
        <>
            <div className="bg-dark rounded p-1" style={{ minHeight: '205px' }} >
                <center><div style={{ minHeight: "25px" }} className={`${bgClassName} m-1 rounded text-dark`} >{caption}</div></center>
                <div className="device-ui" style={{ minHeight: "163px" }}>
                    <center><span onClick={handlePublish} className={switchState + " display-1"} style={{ padding: "auto", cursor: "pointer", fontSize: "80px" }}><FontAwesomeIcon icon={!button ? faDotCircle : faCircleDot} /></span></center>
                </div>
            </div>
        </>
    );

}
export default SwitchViewUI
