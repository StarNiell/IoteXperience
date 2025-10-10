//import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import iotxLogo from '/iotx_blue.svg'
import { useAuth } from '../Auth/auth.tsx';
import ApiCalls from '../Components/apicalls.tsx';
import config from '../config/config.ts';
import { useState } from 'react';
import { DashboardModel } from '../Components/devices/models/dashboardModel.tsx';
import Notification from '../Components/notification.tsx';

function Home() {
    //const [count, setCount] = useState(0)
    const { auth, user, setAuth, setUser } = useAuth();
    const navigate = useNavigate();
    const [dboards, setDashboards] = useState<DashboardModel[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showError, setShowError] = useState(false);

    let username: string = user?.data?.User?.Username || 'Guest';

    const refreshDashboards = async () => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getdashboards/`, "get", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            dboards.length = 0; // Clear the array while keeping the reference
            data.forEach((element: any) => {
                dboards.push({ id: element.id, name: element.name, devices: [], streams: [] });   
            });
            setDashboards(dboards);
            localStorage.setItem("dashboards", JSON.stringify(dboards));
            window.location.href = "/";
        }
    };

    return (
        <>
            <div style={{ height: '100px' }}></div>

            <div className="d-flex justify-content-center">
                <a href="https://www.google.it.dev" target="_blank">
                    <img src={iotxLogo} style={{ width: '200px' }} alt="iotx logo" />
                </a>
            </div>
            <div className="d-flex justify-content-center mt-5">
                <center><h1>Internet of things eXperience</h1></center>
            </div>
            {auth && (
            <div>
                <div className="d-flex justify-content-center mt-5">
                    <button className='btn btn-primary' onClick={() => navigate(`/dashboard/${user?.data.User.dashboardid}`)}>
                        Go to Dashboard
                    </button>
                </div>
                <div className="d-flex justify-content-center mt-5">
                    <button className='btn btn-primary' onClick={refreshDashboards}>
                        Synchronize all dashboards
                    </button>
                </div>
            </div>
            )}
            {!auth ? (
                <div className="d-flex justify-content-center mt-5">
                    <p className="read-the-docs">
                        <Link to="/login">Log in</Link> or <Link to="/register">Sign up</Link> to access the full experience
                    </p>
                </div>
            ) : (
                <div className="d-flex justify-content-center mt-5">
                    <p className="read-the-docs">
                        You are logged in as {username}!
                    </p>
                </div>
            )
            }
            <div>
                <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
            </div>

        </>
    )
}

export default Home


