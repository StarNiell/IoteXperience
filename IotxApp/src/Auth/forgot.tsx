import { Link } from 'react-router-dom';
import iotxLogo from '/iotx_blue.svg';

// Password recovery. Sending a reset link by email needs a server function
// that does not exist yet: for now the administrator sets a new password.
function Forgot() {
    return (
        <div className="iotx-auth">
            <div className="iotx-panel">
                <img className="iotx-auth-logo" src={iotxLogo} alt="iotx" />
                <h1>Forgot password?</h1>
                <div className="iotx-subtitle">Password reset by email is not available yet.</div>
                <div className="iotx-form">
                    <p className="m-0">
                        Ask the administrator to set a new password for your account.
                        You can then sign in and use it right away.
                    </p>
                    <Link to="/login" className="btn btn-primary w-100">Back to sign in</Link>
                </div>
            </div>
        </div>
    );
}

export default Forgot;
