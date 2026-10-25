import { useState } from "react";
import { NavLink, Link } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import { useAuth } from '../Auth/auth';
import { useMqtt, MqttStatus } from './mqttContext';
import { useTheme, ThemeMode } from '../theme/themeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBars, faCircleHalfStroke, faSun, faMoon, faUser, faHome, faTableColumns, faTableList,
    faVideo, faGauge, faDoorOpen, faUsers, faArrowRightToBracket
} from '@fortawesome/free-solid-svg-icons';
import iotxLogo from '/iotx_blue.svg';

// Text of the MQTT connection chip
const MQTT_STATUS_TEXT: Record<MqttStatus, string> = {
    connected: "Connected",
    connecting: "Connecting…",
    disconnected: "Not connected",
    offline: "No network",
};

const THEME_NEXT: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' };
const THEME_ICON = { auto: faCircleHalfStroke, light: faSun, dark: faMoon };
const THEME_NAME: Record<ThemeMode, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

// Top bar (logo, connection status, theme, menu) and side menu
function Navbar() {
    const { auth, user, dashboards } = useAuth();
    const { status: mqttStatus } = useMqtt();
    const { mode, setMode } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);

    const sessionToken = user?.data?.Token;
    const loggedIn = Boolean(auth && sessionToken);
    const username = user?.data?.User?.Username ?? "";
    const isAdmin = user?.data?.User?.admin === true;
    const close = () => setMenuOpen(false);

    return (
        <>
            <header className="iotx-topbar">
                <Link to="/" className="iotx-logo" aria-label="Home"><img src={iotxLogo} alt="iotx" /></Link>

                {sessionToken && (
                    <span className="iotx-chip" data-status={mqttStatus} role="status"
                        title={`Devices (MQTT): ${MQTT_STATUS_TEXT[mqttStatus]}`}>
                        <span className="iotx-chip-dot" aria-hidden="true" />
                        {MQTT_STATUS_TEXT[mqttStatus]}
                    </span>
                )}

                {loggedIn && (
                    <nav className="iotx-topbar-links" aria-label="Dashboards">
                        {dashboards.map((dashboard) => (
                            <NavLink key={dashboard.id} to={`/dashboard/${dashboard.id}`}>{dashboard.name}</NavLink>
                        ))}
                    </nav>
                )}

                <span className="iotx-spacer" />

                <button type="button" className="iotx-icon-btn" onClick={() => setMode(THEME_NEXT[mode])}
                    title={`Theme: ${THEME_NAME[mode]}`} aria-label={`Theme: ${THEME_NAME[mode]}. Change theme`}>
                    <FontAwesomeIcon icon={THEME_ICON[mode]} />
                </button>

                {loggedIn ? (
                    <button type="button" className="iotx-icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open the menu">
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                ) : (
                    <Link to="/login" className="btn btn-primary">
                        <FontAwesomeIcon icon={faArrowRightToBracket} /> Log in
                    </Link>
                )}
            </header>

            <Offcanvas show={menuOpen} onHide={close} placement="end" className="iotx-menu" aria-labelledby="iotx-menu-title">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title id="iotx-menu-title">
                        <FontAwesomeIcon icon={faUser} className="me-2" />{username}
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <nav className="iotx-menu-list" aria-label="Main">
                        <NavLink to="/" end onClick={close}><FontAwesomeIcon icon={faHome} />Home</NavLink>
                    </nav>

                    {dashboards.length > 0 && (
                        <>
                            <div className="iotx-menu-section">Dashboards</div>
                            <nav className="iotx-menu-list" aria-label="Dashboards">
                                {dashboards.map((dashboard) => (
                                    <NavLink key={dashboard.id} to={`/dashboard/${dashboard.id}`} onClick={close}>
                                        <FontAwesomeIcon icon={faGauge} />{dashboard.name}
                                    </NavLink>
                                ))}
                            </nav>
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <div className="iotx-menu-section">Administration</div>
                            <nav className="iotx-menu-list" aria-label="Administration">
                                <NavLink to="/devices" onClick={close}><FontAwesomeIcon icon={faTableList} />Devices</NavLink>
                                <NavLink to="/streams" onClick={close}><FontAwesomeIcon icon={faVideo} />Cameras</NavLink>
                                <NavLink to="/dashboards" end onClick={close}><FontAwesomeIcon icon={faTableColumns} />Dashboards</NavLink>
                                <NavLink to="/users" onClick={close}><FontAwesomeIcon icon={faUsers} />Users</NavLink>
                            </nav>
                        </>
                    )}

                    <div className="iotx-menu-section">Theme</div>
                    <div className="iotx-segmented" role="group" aria-label="Theme">
                        {(['auto', 'light', 'dark'] as ThemeMode[]).map((m) => (
                            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                                <FontAwesomeIcon icon={THEME_ICON[m]} />{THEME_NAME[m]}
                            </button>
                        ))}
                    </div>

                    <div className="iotx-menu-section">Account</div>
                    <nav className="iotx-menu-list" aria-label="Account">
                        <NavLink to="/profile" onClick={close}><FontAwesomeIcon icon={faUser} />Profile</NavLink>
                        <NavLink to="/logout" onClick={close}><FontAwesomeIcon icon={faDoorOpen} />Log out</NavLink>
                    </nav>
                </Offcanvas.Body>
            </Offcanvas>
        </>
    );
}

export default Navbar;
