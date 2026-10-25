import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGauge, faRotate, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import iotxLogo from '/iotx_blue.svg';
import { useAuth } from '../Auth/auth.tsx';
import { loadDashboards } from '../Auth/session.ts';
import Notification from '../Components/notification.tsx';

function Home() {
    const { user, setAuth, setUser, dashboards, setDashboards } = useAuth();
    const [errorMessage, setErrorMessage] = useState('');
    const [showError, setShowError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const token = user?.data?.Token;
    const defaultId = user?.data?.User?.dashboardid;

    // Reloads the list (e.g. after an administrator added a dashboard)
    const refreshDashboards = async () => {
        if (!token) return;
        setRefreshing(true);
        const result = await loadDashboards(token, setAuth, setUser);
        setRefreshing(false);
        if (result.error) {
            setErrorMessage(result.error);
            setShowError(true);
        } else {
            setDashboards(result.dashboards ?? []);
        }
    };

    if (!token) {
        return (
            <div className="iotx-hero">
                <img src={iotxLogo} alt="iotx" />
                <h1>Internet of things eXperience</h1>
                <p>Control your devices and watch your cameras from anywhere.</p>
                <Link to="/login" className="btn btn-primary">Sign in</Link>
            </div>
        );
    }

    return (
        <>
            <div className="iotx-page-head">
                <div className="iotx-eyebrow">Welcome back</div>
                <h1>{user?.data?.User?.Username}</h1>
            </div>

            <div className="iotx-section-head">
                <h2>Your dashboards</h2>
                <button type="button" className="btn btn-secondary btn-sm" onClick={refreshDashboards} disabled={refreshing}>
                    <FontAwesomeIcon icon={faRotate} spin={refreshing} className="me-2" />Refresh
                </button>
            </div>

            {dashboards.length === 0 ? (
                <div className="iotx-empty">No dashboard is assigned to your user.</div>
            ) : (
                <div className="iotx-tiles">
                    {dashboards.map((dashboard) => (
                        <Link key={dashboard.id} to={`/dashboard/${dashboard.id}`} className="iotx-tile">
                            <span className="iotx-tile-icon"><FontAwesomeIcon icon={faGauge} /></span>
                            <span className="iotx-tile-text">
                                <span className="iotx-tile-title">{dashboard.name}</span>
                                <span className="iotx-tile-sub">Open the dashboard</span>
                            </span>
                            {dashboard.id === defaultId && <span className="iotx-badge">Default</span>}
                            <FontAwesomeIcon icon={faChevronRight} className="text-secondary" />
                        </Link>
                    ))}
                </div>
            )}

            <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
        </>
    );
}

export default Home;
