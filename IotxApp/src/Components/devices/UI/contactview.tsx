
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlugCircleBolt } from '@fortawesome/free-solid-svg-icons'
import { TimeUtil } from '../../../utils/timeutil.ts';

const ContactViewUI: React.FC<{ value: number; timestamp: string; caption: string; connected: boolean }> = ({value, timestamp, caption, connected }) => {

    let contactState: string = ""
    if (value)
        contactState = "switch-on";
    else
        contactState = "switch-off";

    // Red header when MQTT is disconnected or the value is older than 2 minutes
    const bgClassName = TimeUtil.deviceHeaderClass(timestamp, 2 * 60 * 1000, connected);

    return (
        <>
            <div className="bg-dark rounded p-1" style={{ minHeight: '205px' }} >
                <center><div style={{ minHeight: "25px" }} className={`${bgClassName}  rounded m-1 text-dark`} >{caption}</div></center>
                <div className="device-ui" style={{ minHeight: "163px" }}>
                    <center><span className={contactState + " display-1"} style={{ padding: "auto", cursor: "pointer", fontSize: "80px" }}><FontAwesomeIcon icon={faPlugCircleBolt} /></span></center>
                </div>
            </div>
        </>
    );

}
export default ContactViewUI
