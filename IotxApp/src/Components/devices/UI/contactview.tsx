
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlugCircleBolt } from '@fortawesome/free-solid-svg-icons'
import { TimeUtil } from '../../../utils/timeutil.ts';

const ContactViewUI: React.FC<{ value: number; timestamp: string; caption: string }> = ({value, timestamp, caption }) => {

    let contactState: string = ""
    if (value)
        contactState = "switch-on";
    else
        contactState = "switch-off";

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
