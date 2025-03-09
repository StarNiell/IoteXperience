import ParamsMqtt from '../Components/params-mqtt.tsx';
import { useAuth } from '../Auth/auth.tsx';

function Testmqtt() {
    const { user } = useAuth();

    var token = "empty";

    token = user?.data?.Token;
    return (
        <>
            <div className='mt-5' style={{ maxWidth: '1100px', margin: 'auto' }}>
                <div className="row table-head rounded-top">
                    <div className="col-md-3">
                        Topic
                    </div>
                    <div className="col-md-2">
                        device_id
                    </div>
                    <div className="col-md-1">
                        type
                    </div>
                    <div className="col-md-1">
                        value
                    </div>
                    <div className="col-md-1">
                        unit
                    </div>
                    <div className="col-md-2">
                        subscription
                    </div>
                    <div className="col-md-2">
                        Action
                    </div>
                </div>
                <ParamsMqtt token={token} />
                <div className="row table-foot rounded-bottom">
                    &nbsp;
                </div>
            </div>
        </>
    )
}
export default Testmqtt;

