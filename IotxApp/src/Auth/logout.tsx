import { useNavigate } from 'react-router-dom'
import { useAuth } from '../Auth/auth';
import React from 'react';

function Logout() {

    const { setAuth, setUser, setDashboards } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        // reset all data and status
        setUser(null);
        setDashboards([]);
        localStorage.setItem("dashboards", "");
        localStorage.setItem("user", "");
        setAuth(false);
        // redirect to Login page
        navigate('/login');
    }, [navigate]);

    return (
        <>
        </>
    );
}

export default Logout;