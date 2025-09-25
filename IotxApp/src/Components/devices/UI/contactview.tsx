
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlugCircleBolt } from '@fortawesome/free-solid-svg-icons'

const ContactViewUI: React.FC<{ value: number; caption: string }> = ({value, caption }) => {

    let contactState: string = ""
    if (value)
        contactState = "switch-on";
    else
        contactState = "switch-off";

    return (
        <>
            <div className="bg-dark rounded p-1" style={{ minHeight: '165px' }} >
                <center><div style={{ minHeight: "25px" }} className="bg-lightgray rounded text-dark" >{caption}</div></center>
                <div className="device-ui" style={{ minHeight: "153px" }}>
                    <center><span className={contactState + " display-1"} style={{ padding: "auto", cursor: "pointer", fontSize: "80px" }}><FontAwesomeIcon icon={faPlugCircleBolt} /></span></center>
                </div>
            </div>
        </>
    );

}
export default ContactViewUI
