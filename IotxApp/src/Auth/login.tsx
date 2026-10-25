import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useAuth, User } from '../Auth/auth.tsx';
import ApiCalls from '../Components/apicalls.tsx';
import config from '../config/config.ts';
import { loadDashboards } from './session.ts';
import iotxLogo from '/iotx_blue.svg';

function Login() {
    const { setAuth, setUser, setDashboards } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const login = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setError('');
        if (!username.trim() || !password) {
            setError('Enter your username (or email) and password.');
            return;
        }
        setBusy(true);
        const userdata = await ApiCalls({ username: username.trim(), password }, `${config.wsDatabaseUrl}/dologin/`, "post", setAuth, setUser);
        if (!userdata || userdata.error || !userdata.data?.Token) {
            setBusy(false);
            setError(userdata?.error?.status === 401
                ? 'Wrong username or password.'
                : `Cannot reach the server${userdata?.error?.message ? ` (${userdata.error.message})` : ''}.`);
            return;
        }
        const session = userdata as User;
        const result = await loadDashboards(session.data.Token, setAuth, setUser);
        setDashboards(result.dashboards ?? []);
        localStorage.setItem("user", JSON.stringify(session));
        setUser(session);
        setAuth(true);
        setBusy(false);
        const dashboardId = session.data.User.dashboardid;
        navigate(dashboardId ? `/dashboard/${dashboardId}` : '/', { replace: true });
    };

    return (
        <div className="iotx-auth">
            <div className="iotx-panel">
                <img className="iotx-auth-logo" src={iotxLogo} alt="iotx" />
                <h1>Sign in</h1>
                <div className="iotx-subtitle">Internet of things eXperience</div>
                <form className="iotx-form" onSubmit={login} noValidate>
                    <div>
                        <label className="form-label" htmlFor="email">Username or email</label>
                        <input id="email" className="form-control" type="text" autoComplete="username" autoCapitalize="none"
                            value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label" htmlFor="password">Password</label>
                        <div className="iotx-password">
                            <input id="password" className="form-control" type={showPassword ? "text" : "password"} autoComplete="current-password"
                                value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}>
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>
                    {error && <div className="iotx-inline-error" role="alert">{error}</div>}
                    <button type="submit" className="btn btn-primary w-100" disabled={busy}>
                        {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                        Sign in
                    </button>
                    <div className="iotx-link-row"><Link to="/forgot">Forgot password?</Link></div>
                </form>
            </div>
        </div>
    );
};

export default Login;
