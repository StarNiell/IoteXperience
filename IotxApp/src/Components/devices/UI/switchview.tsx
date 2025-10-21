
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
                                button: boolean }
                            > = ({subscription, device_id, value, timestamp, caption, button }) => {
    const { publishMessage } = useMqtt();

    let switchState: string = ""
    if (value)
        switchState = "switch-on";
    else
        switchState = "switch-off";

    const valueTime = TimeUtil.parseIsoDate(timestamp);
    let unvaluedTimeStamp: boolean = (timestamp === "0000-00-00T00:00:00Z")
    let expired: boolean = valueTime ? ((new Date().getTime() - valueTime.getTime()) > (2 * 60 * 1000)) : true; // Expired if older than 10 minutes or invalid date

    let bgClassName: string = "bg-lightgray";
    if (unvaluedTimeStamp) {
        bgClassName = "bg-warning";
        }
    else if (expired) {
        bgClassName = "bg-danger";
    }
    
    let currentValue: number = value;

    const handlePublish = () => {
        if (!expired)
        {
            currentValue = currentValue === 1 ? 0 : 1;
            publishMessage(subscription, '{"device_id": "' + device_id + '", "value": ' + currentValue + '}')
            .then(() => console.log("Message published successfully"))
            .catch((err) => console.error("Failed to publish message: ", err));
        }
      };

      return (
        <>
            <div className="bg-dark rounded p-1" style={{ minHeight: '196px' }} >
                <center><div style={{ minHeight: "25px" }} className={`${bgClassName}  rounded text-dark`} >{caption}</div></center>
                <div className="device-ui" style={{ minHeight: "153px" }}>
                    <center><span onClick={handlePublish} className={switchState + " display-1"} style={{ padding: "auto", cursor: "pointer", fontSize: "80px" }}><FontAwesomeIcon icon={!button ? faDotCircle : faCircleDot} /></span></center>
                </div>
            </div>
        </>
    );

}
export default SwitchViewUI
