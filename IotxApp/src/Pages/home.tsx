//import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import iotxLogo from '/iotx_blue.svg'
import { useAuth } from '../Auth/auth.tsx';

function Home() {
    //const [count, setCount] = useState(0)
    const { auth, user } = useAuth();
    const navigate = useNavigate();

    let username: string = user?.data?.User?.Username || 'Guest';
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
            <div className="d-flex justify-content-center mt-5">
                <button className='btn btn-primary' onClick={() => navigate(`/dashboard/${user?.data.User.dashboardid}`)}>
                    Go to Dashboard
                </button>
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
        </>
    )
}

export default Home
