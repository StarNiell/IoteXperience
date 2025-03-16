import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/auth.tsx';
import Notification from '../Components/notification.tsx';
import 'bootstrap/dist/css/bootstrap.css';
import ApiCalls from '../Components/apicalls.tsx';
import config from '../config/config.ts';

function Login() {
    const { setAuth, setUser, user } = useAuth();
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const login = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        const fetchData = async () => {
            const data = await ApiCalls({ username: email, password: password }, `${config.wsDatabaseUrl}/dologin/`, "post", setAuth, setUser);
            if (data.error) {
                setErrorMessage(data.error.message);
                setShowError(true);
            } else {
                setAuth(true);
                setUser(data);
                localStorage.setItem("user", JSON.stringify(data));
                navigate(`/dashboard/${data.data.User.dashboardid}`);
            }
        };

        fetchData();
    };

    return (
        <form>
            <div className='d-flex align-items-center justify-content-center'>
                <div className='badge p-3 rounded mt-5 mb-5' style={{ backgroundColor: "#181818", minWidth: "35%" }}  >
                    <div>
                        <h2>Login Page</h2>
                    </div>
                    <div className='bg-gray p-5 rounded'>
                        <div data-mdb-input-init className="form-outline mb-4">
                            <input type="email" id="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <label className="form-label mt-2" htmlFor="form2Example1">Email address</label>
                        </div>
                        <div data-mdb-input-init className="form-outline mb-4">
                            <input type="password" id="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <label className="form-label mt-2" htmlFor="form2Example2">Password</label>
                        </div>
                        <div className="row mb-4">
                            <div className="col d-flex justify-content-center">
                                <div className="form-check">
                                </div>
                            </div>
                            <div className="col">
                                <Link className="link-light" to="/forgot">Forgot password?</Link>
                            </div>
                        </div>
                        <button type="submit" onClick={login} data-mdb-button-init data-mdb-ripple-init className="btn btn-primary btn-block mb-4">Sign in</button>
                    </div>
                </div>
            </div>
            <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
        </form>
    );
};

export default Login;