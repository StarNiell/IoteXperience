import { Link } from 'react-router-dom';
import { useAuth } from '../Auth/auth.tsx';
import { useTheme } from '../theme/themeContext.ts';

const THEME_NAME = { auto: 'Automatic (follows the device)', light: 'Light', dark: 'Dark' };

// The logged-in user's details. (What else this page should offer is still to be decided.)
function Profile() {
    const { user, dashboards } = useAuth();
    const { mode } = useTheme();
    const info = user?.data?.User;
    const defaultDashboard = dashboards.find(d => d.id === info?.dashboardid)?.name ?? "—";

    return (
        <>
            <div className="iotx-page-head">
                <div className="iotx-eyebrow">Profile</div>
                <h1>{info?.Username}</h1>
            </div>
            <div className="iotx-panel" style={{ maxWidth: 560 }}>
                <dl className="iotx-facts m-0">
                    <div><dt>Username</dt><dd>{info?.Username}</dd></div>
                    <div><dt>Email</dt><dd>{info?.Email || "—"}</dd></div>
                    <div><dt>Role</dt><dd>{info?.admin ? "Administrator" : "User"}</dd></div>
                    <div><dt>Default dashboard</dt><dd>{defaultDashboard}</dd></div>
                    <div><dt>Theme</dt><dd>{THEME_NAME[mode]}</dd></div>
                </dl>
            </div>
            <div className="mt-3">
                <Link to="/logout" className="btn btn-secondary">Log out</Link>
            </div>
        </>
    );
}

export default Profile;
