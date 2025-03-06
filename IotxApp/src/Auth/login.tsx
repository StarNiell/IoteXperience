import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../Auth/auth.tsx';
//import axios from 'axios';
import Notification from '../Components/notification.tsx';
import 'bootstrap/dist/css/bootstrap.css';
import ApiCalls from '../Components/apicalls.tsx';

function Login() {

    const { auth, setAuth, setUser } = useAuth();
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const login = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();


        const fetchData = async () => {
            const data = await ApiCalls({ username: email, password: password }, "http://192.168.1.121:3000/dologin/", "post", setAuth, setUser);
            if (data.error) {
                setErrorMessage(data.error.message);
                setShowError(true);
            }
            else
            {
                setAuth(true);
                setUser(data);
                localStorage.setItem("user", JSON.stringify(data));
                console.log(auth);
                navigate('/dashboard');
            }
        };

        fetchData();

        /*await axios.post(
            "http://localhost:3000/dologin/",
            {
                username: email,
                password: password
            }
        ).then(res => {
            setAuth(true);
            setUser(res.data);
            navigate('/dashboard');
        })
            .catch(error => {
                if (axios.isAxiosError(error) && error.response) {
                    console.error(error.response.data);
                    setErrorMessage(error.response.data);

                } else {
                    console.error(error);
                    setErrorMessage(error);
                }
                setShowError(true);
            });
            */
    }
    return (

        <form>
            <div className='d-flex align-items-center justify-content-center'>
                <div className='badge p-3 rounded mt-5 mb-5' style={{ backgroundColor: "#181818", minWidth: "35%" }}  >

                    <div>
                        <h2>Login Page</h2>
                    </div>

                    <div className='bg-gray p-5 rounded'>
                        {/* Email input */}
                        <div data-mdb-input-init className="form-outline mb-4">
                            <input type="email" id="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <label className="form-label mt-2" htmlFor="form2Example1">Email address</label>
                        </div>
                        {/*  Password input */}
                        <div data-mdb-input-init className="form-outline mb-4">
                            <input type="password" id="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <label className="form-label mt-2" htmlFor="form2Example2">Password</label>
                        </div>

                        {/*  2 column grid layout for inline styling */}
                        <div className="row mb-4">
                            <div className="col d-flex justify-content-center">
                                {/* Checkbox */}
                                <div className="form-check">
                                    {/*
                                    <input className="form-check-input" type="checkbox" value="" id="checkRemember" checked />
                                    <label className="form-check-label" htmlFor="form2Example31"> Remember me </label>
                                    */ }
                                </div>
                            </div>

                            <div className="col">
                                {/* Simple link */}
                                <Link className="link-light" to="/forgot">Forgot password?</Link>
                            </div>
                        </div>

                        {/* Submit button */}
                        <button type="submit" onClick={login} data-mdb-button-init data-mdb-ripple-init className="btn btn-primary btn-block mb-4">Sign in</button>

                    </div>
                </div>
            </div>
            <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
        </form>
    );

};

export default Login;