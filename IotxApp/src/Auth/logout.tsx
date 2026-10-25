import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/auth';

// Clears the session in this browser and goes to the login page
// (the MQTT connection closes by itself when the session token disappears)
function Logout() {
    const { setAuth, setUser, setDashboards } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        setUser(null);
        setDashboards([]);
        localStorage.setItem("dashboards", "");
        localStorage.setItem("user", "");
        setAuth(false);
        navigate('/login', { replace: true });
    }, [navigate, setAuth, setUser, setDashboards]);

    return null;
}

export default Logout;
