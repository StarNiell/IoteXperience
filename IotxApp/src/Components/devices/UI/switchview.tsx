
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDotCircle } from '@fortawesome/free-regular-svg-icons'
import { faCircleDot } from '@fortawesome/free-solid-svg-icons'
import { useMqtt } from '../../mqtt';

const SwitchViewUI: React.FC<{subscription: string,  device_id: string, value: number; caption: string; button: boolean }> = ({subscription, device_id, value, caption, button }) => {
    const { publishMessage } = useMqtt();

    let switchState: string = ""
    if (value)
        switchState = "switch-on";
    else
        switchState = "switch-off";

    let currentValue: number = value;

    const handlePublish = () => {
        currentValue = currentValue === 1 ? 0 : 1;
        publishMessage(subscription, '{"device_id": "' + device_id + '", "value": ' + currentValue + '}')
          .then(() => console.log("Message published successfully"))
          .catch((err) => console.error("Failed to publish message: ", err));
      };

      return (
        <>
            <div className="bg-dark rounded p-1" style={{ minHeight: '165px' }} >
                <center><div style={{ minHeight: "25px" }} className="bg-lightgray rounded text-dark" >{caption}</div></center>
                <div className="device-ui" style={{ minHeight: "153px" }}>
                    <center><span onClick={handlePublish} className={switchState + " display-1"} style={{ padding: "auto", cursor: "pointer", fontSize: "80px" }}><FontAwesomeIcon icon={!button ? faDotCircle : faCircleDot} /></span></center>
                </div>
            </div>
        </>
    );

}
export default SwitchViewUI
