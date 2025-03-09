import Params from '../Components/params.tsx';
import { useAuth } from '../Auth/auth.tsx';

function Testdb() {
    const { user } = useAuth();

    var token = "empty";

    token = user?.data?.Token;
    return (
        <>
            <div className='mt-5' style={{ maxWidth: '1100px', margin: 'auto' }}>
                <div className="row table-head rounded-top">
                    <div className="col-md-4">
                        ID
                    </div>
                    <div className="col-md-4">
                        Key
                    </div>
                    <div className="col-md-4">
                        Value
                    </div>
                </div>
                <Params token={token} />
                <div className="row table-foot rounded-bottom">
                    &nbsp;
                </div>
            </div>
            <div style={{ maxWidth: '700px' }} className='mt-5 bg-danger mx-auto text-center'>Token: {token}</div>
        </>
    )
}
export default Testdb;

