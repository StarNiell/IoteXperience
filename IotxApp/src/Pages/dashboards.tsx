import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGauge, faPlus, faPen, faTrash, faTableCells, faVideo, faUsers } from '@fortawesome/free-solid-svg-icons';
import { DashboardModel } from '../Components/devices/models/dashboardModel.tsx';
import { UserDashboardModel } from '../Components/devices/models/userDashboardModel.tsx';
import { useAdminApi } from '../Components/admin/useAdminApi.ts';
import { useAuth } from '../Auth/auth.tsx';
import { loadDashboards } from '../Auth/session.ts';
import ConfirmDialog from '../Components/admin/ConfirmDialog.tsx';
import AdminToast from '../Components/admin/AdminToast.tsx';

// Dashboard 1 is the main one (new devices are added to it): it cannot be deleted
const MAIN_DASHBOARD_ID = 1;

// Dashboards: create, rename, delete; choose widgets, cameras and users
const Dashboards: React.FC = () => {
    const { call, toast, setToast, notify } = useAdminApi();
    const { user, setAuth, setUser, setDashboards: setMenuDashboards } = useAuth();
    const [dashboards, setDashboards] = useState<DashboardModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [rename, setRename] = useState<{ id: number, name: string } | null>(null);
    const [removing, setRemoving] = useState<DashboardModel | null>(null);
    const [access, setAccess] = useState<{ dashboard: DashboardModel, users: UserDashboardModel[] } | null>(null);
    const [busy, setBusy] = useState(false);

    const fetchDashboards = useCallback(async () => {
        const data = await call<DashboardModel[]>("getdashboards/", "get", { all: true });
        setLoading(false);
        if (data) setDashboards(data);
        // Keep the menu in step with the changes
        const token = user?.data?.Token;
        if (token) {
            const result = await loadDashboards(token, setAuth, setUser);
            if (result.dashboards) setMenuDashboards(result.dashboards);
        }
    }, [call, user?.data?.Token, setAuth, setUser, setMenuDashboards]);

    useEffect(() => { fetchDashboards(); }, [fetchDashboards]);

    const renameError = rename && (
        !rename.name.trim() ? "Enter a name." :
            dashboards.some(d => d.name.trim().toLowerCase() === rename.name.trim().toLowerCase() && d.id !== rename.id) ? "Another dashboard has this name." : "");

    const saveName = async () => {
        if (!rename || renameError) return;
        setBusy(true);
        const name = rename.name.trim();
        const ok = rename.id > 0
            ? await call("editdashboard/", "post", { id: rename.id, name })
            : await call("newdashboard/", "post", { name });
        setBusy(false);
        if (ok !== null) {
            notify(rename.id > 0 ? "Dashboard renamed" : "Dashboard created");
            setRename(null);
            fetchDashboards();
        }
    };

    const remove = async () => {
        if (!removing) return;
        setBusy(true);
        const ok = await call("deletedashboard/", "post", { id: removing.id });
        setBusy(false);
        setRemoving(null);
        if (ok !== null) {
            notify("Dashboard deleted");
            fetchDashboards();
        }
    };

    const openAccess = async (dashboard: DashboardModel) => {
        const users = await call<UserDashboardModel[]>("getusersdashboard/", "get", { id: dashboard.id });
        if (users) setAccess({ dashboard, users });
    };

    const updateAccess = (userId: number, change: Partial<UserDashboardModel>) => {
        if (!access) return;
        setAccess({
            ...access,
            users: access.users.map(u => {
                if (u.userId !== userId) return u;
                const next = { ...u, ...change };
                if (!next.hasAccess) next.isDefault = false;
                return next;
            }),
        });
    };

    const saveAccess = async () => {
        if (!access) return;
        setBusy(true);
        const ok = await call("saveusersdashboard/", "post", { users: access.users, dashboardId: access.dashboard.id });
        setBusy(false);
        if (ok !== null) {
            notify("Users saved");
            setAccess(null);
            fetchDashboards();
        }
    };

    return (
        <>
            <div className="iotx-head-row">
                <div className="iotx-page-head">
                    <div className="iotx-eyebrow">Administration</div>
                    <h1>Dashboards</h1>
                </div>
                <Button variant="primary" className="mb-3" onClick={() => setRename({ id: 0, name: "" })}>
                    <FontAwesomeIcon icon={faPlus} className="me-2" />New dashboard
                </Button>
            </div>

            <div className="iotx-list">
                {!loading && dashboards.length === 0 && <div className="iotx-list-empty">No dashboards.</div>}
                {dashboards.map(dashboard => (
                    <div className="iotx-row" key={dashboard.id}>
                        <span className="iotx-row-icon"><FontAwesomeIcon icon={faGauge} /></span>
                        <div className="iotx-row-main">
                            <div className="iotx-row-title">
                                <Link to={`/dashboard/${dashboard.id}`} className="text-reset text-decoration-none">{dashboard.name}</Link>
                                {dashboard.id === MAIN_DASHBOARD_ID && <span className="iotx-tag">Main</span>}
                            </div>
                            <div className="iotx-row-sub">Dashboard #{dashboard.id}</div>
                        </div>
                        <div className="iotx-row-actions">
                            <Link className="btn btn-secondary" to={`/dashboards/d/${dashboard.id}`}><FontAwesomeIcon icon={faTableCells} className="me-1" />Widgets</Link>
                            <Link className="btn btn-secondary" to={`/dashboards/s/${dashboard.id}`}><FontAwesomeIcon icon={faVideo} className="me-1" />Cameras</Link>
                            <Button variant="secondary" onClick={() => openAccess(dashboard)}><FontAwesomeIcon icon={faUsers} className="me-1" />Users</Button>
                            <Button variant="secondary" onClick={() => setRename({ id: dashboard.id, name: dashboard.name })} aria-label={`Rename ${dashboard.name}`}>
                                <FontAwesomeIcon icon={faPen} />
                            </Button>
                            {dashboard.id !== MAIN_DASHBOARD_ID && (
                                <Button variant="secondary" onClick={() => setRemoving(dashboard)} aria-label={`Delete ${dashboard.name}`}>
                                    <FontAwesomeIcon icon={faTrash} className="text-danger" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Modal show={rename !== null} onHide={() => setRename(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title as="h2" className="h5 m-0">{rename && rename.id > 0 ? "Rename dashboard" : "New dashboard"}</Modal.Title>
                </Modal.Header>
                {rename && (
                    <form onSubmit={(e) => { e.preventDefault(); saveName(); }} noValidate>
                        <Modal.Body>
                            <label className="form-label" htmlFor="db-name">Name</label>
                            <input id="db-name" className="form-control" autoFocus value={rename.name} onChange={(e) => setRename({ ...rename, name: e.target.value })} />
                            {rename.id === 0 && <div className="form-text">You can add widgets, cameras and users after creating it.</div>}
                            {renameError && rename.name !== "" && <div className="iotx-inline-error mt-3" role="alert">{renameError}</div>}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setRename(null)}>Cancel</Button>
                            <Button type="submit" variant="primary" disabled={busy || !!renameError}>Save</Button>
                        </Modal.Footer>
                    </form>
                )}
            </Modal>

            <Modal show={access !== null} onHide={() => setAccess(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title as="h2" className="h5 m-0">Users of “{access?.dashboard.name}”</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <div className="px-3 pt-3 iotx-row-sub">
                        Who can open this dashboard. “Default” is the dashboard a user sees after logging in.
                    </div>
                    {access?.users.map(u => (
                        <div className="iotx-row" key={u.userId}>
                            <div className="iotx-row-main"><div className="iotx-row-title">{u.userName}</div></div>
                            <div className="d-flex gap-3 align-items-center">
                                <div className="form-check form-switch m-0">
                                    <input id={`acc-${u.userId}`} className="form-check-input" type="checkbox" role="switch" checked={u.hasAccess}
                                        onChange={(e) => updateAccess(u.userId, { hasAccess: e.target.checked })} />
                                    <label className="form-check-label" htmlFor={`acc-${u.userId}`}>Access</label>
                                </div>
                                <div className="form-check m-0">
                                    <input id={`def-${u.userId}`} className="form-check-input" type="checkbox" checked={u.isDefault} disabled={!u.hasAccess}
                                        onChange={(e) => updateAccess(u.userId, { isDefault: e.target.checked })} />
                                    <label className="form-check-label" htmlFor={`def-${u.userId}`}>Default</label>
                                </div>
                            </div>
                        </div>
                    ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setAccess(null)}>Cancel</Button>
                    <Button variant="primary" onClick={saveAccess} disabled={busy}>Save</Button>
                </Modal.Footer>
            </Modal>

            <ConfirmDialog show={removing !== null} title="Delete dashboard" confirmLabel="Delete" danger busy={busy}
                onConfirm={remove} onCancel={() => setRemoving(null)}>
                Delete <strong>{removing?.name}</strong>? Its widgets and cameras stay available for the other dashboards.
            </ConfirmDialog>

            <AdminToast toast={toast} onClose={() => setToast(null)} />
        </>
    );
};

export default Dashboards;
