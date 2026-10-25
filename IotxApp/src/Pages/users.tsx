import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPen, faTrash, faRightFromBracket, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { UserModel } from '../Components/devices/models/userModel.tsx';
import { useAdminApi } from '../Components/admin/useAdminApi.ts';
import ConfirmDialog from '../Components/admin/ConfirmDialog.tsx';
import AdminToast from '../Components/admin/AdminToast.tsx';

const EMPTY: UserModel = { id: 0, username: '', password: '', email: '', admin: false };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// User 1 is the main administrator: it cannot be deleted
const MAIN_ADMIN_ID = 1;

type Confirm = { action: "delete" | "signout", user: UserModel };

// Users: create, edit, sign out everywhere, delete
const Users: React.FC = () => {
    const { call, toast, setToast, notify, currentUserId } = useAdminApi();
    const [users, setUsers] = useState<UserModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [edit, setEdit] = useState<UserModel | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [confirm, setConfirm] = useState<Confirm | null>(null);
    const [busy, setBusy] = useState(false);

    const fetchUsers = useCallback(async () => {
        const data = await call<UserModel[]>("getusers/", "get");
        setLoading(false);
        if (data) setUsers(data);
    }, [call]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const isNew = edit !== null && edit.id === 0;
    const isSelf = edit !== null && edit.id === currentUserId;
    const editError = edit && (
        !edit.username.trim() ? "Enter a username." :
            edit.email.trim() !== "" && !EMAIL_PATTERN.test(edit.email.trim()) ? "The email address is not valid." :
                isNew && !edit.password ? "Enter a password for the new user." :
                    edit.password && edit.password.length < 6 ? "Use at least 6 characters for the password." : "");

    const openEdit = (user: UserModel | null) => {
        setShowPassword(false);
        setEdit(user ? { ...user, password: "" } : { ...EMPTY });
    };

    const save = async () => {
        if (!edit || editError) return;
        setBusy(true);
        const userr = { ...edit, username: edit.username.trim(), email: edit.email.trim() };
        const ok = await call(isNew ? "newuser/" : "edituser/", "post", { userr });
        setBusy(false);
        if (ok !== null) {
            setEdit(null);
            notify(isNew ? "User created" : "User saved");
            fetchUsers();
        }
    };

    const runConfirm = async () => {
        if (!confirm) return;
        setBusy(true);
        const { action, user } = confirm;
        const ok = await call(action === "delete" ? "deleteuser/" : "resettoken/", "post", { id: user.id });
        setBusy(false);
        setConfirm(null);
        if (ok !== null) {
            notify(action === "delete" ? "User deleted" : `${user.username} has been signed out on every device`);
            fetchUsers();
        }
    };

    return (
        <>
            <div className="iotx-head-row">
                <div className="iotx-page-head">
                    <div className="iotx-eyebrow">Administration</div>
                    <h1>Users</h1>
                </div>
                <Button variant="primary" className="mb-3" onClick={() => openEdit(null)}>
                    <FontAwesomeIcon icon={faPlus} className="me-2" />New user
                </Button>
            </div>

            <div className="iotx-list">
                {!loading && users.length === 0 && <div className="iotx-list-empty">No users.</div>}
                {users.map(user => (
                    <div className="iotx-row" key={user.id}>
                        <span className="iotx-row-icon" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
                        <div className="iotx-row-main">
                            <div className="iotx-row-title">
                                {user.username}
                                {user.admin && <span className="iotx-tag" data-tone="accent">Admin</span>}
                                {user.id === currentUserId && <span className="iotx-tag">You</span>}
                            </div>
                            <div className="iotx-row-sub">{user.email || "No email"}</div>
                        </div>
                        <div className="iotx-row-actions">
                            <Button variant="secondary" onClick={() => openEdit(user)}><FontAwesomeIcon icon={faPen} className="me-1" />Edit</Button>
                            <Button variant="secondary" onClick={() => setConfirm({ action: "signout", user })} title="Sign out on every device">
                                <FontAwesomeIcon icon={faRightFromBracket} className="me-1" />Sign out
                            </Button>
                            {user.id !== MAIN_ADMIN_ID && user.id !== currentUserId && (
                                <Button variant="secondary" onClick={() => setConfirm({ action: "delete", user })} aria-label={`Delete ${user.username}`}>
                                    <FontAwesomeIcon icon={faTrash} className="text-danger" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Modal show={edit !== null} onHide={() => setEdit(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title as="h2" className="h5 m-0">{isNew ? "New user" : "Edit user"}</Modal.Title>
                </Modal.Header>
                {edit && (
                    <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
                        <Modal.Body>
                            <div className="iotx-form">
                                <div>
                                    <label className="form-label" htmlFor="us-name">Username</label>
                                    <input id="us-name" className="form-control" autoCapitalize="none" autoComplete="off" value={edit.username}
                                        onChange={(e) => setEdit({ ...edit, username: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="us-email">Email</label>
                                    <input id="us-email" className="form-control" type="email" autoCapitalize="none" autoComplete="off" value={edit.email}
                                        onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="us-pass">{isNew ? "Password" : "New password"}</label>
                                    <div className="iotx-password">
                                        <input id="us-pass" className="form-control" type={showPassword ? "text" : "password"} autoComplete="new-password"
                                            value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                                            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                        </button>
                                    </div>
                                    {!isNew && <div className="form-text">Leave empty to keep the current password. A new password signs the user out on the other devices.</div>}
                                </div>
                                <div className="form-check form-switch">
                                    <input id="us-admin" className="form-check-input" type="checkbox" role="switch" checked={edit.admin} disabled={isSelf}
                                        onChange={(e) => setEdit({ ...edit, admin: e.target.checked })} />
                                    <label className="form-check-label" htmlFor="us-admin">Administrator</label>
                                    {isSelf && <div className="form-text">You cannot remove your own administrator rights.</div>}
                                </div>
                                {editError && <div className="iotx-inline-error" role="alert">{editError}</div>}
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
                            <Button type="submit" variant="primary" disabled={busy || !!editError}>Save</Button>
                        </Modal.Footer>
                    </form>
                )}
            </Modal>

            <ConfirmDialog show={confirm !== null} busy={busy} danger={confirm?.action === "delete"}
                title={confirm?.action === "delete" ? "Delete user" : "Sign out everywhere"}
                confirmLabel={confirm?.action === "delete" ? "Delete" : "Sign out"}
                onConfirm={runConfirm} onCancel={() => setConfirm(null)}>
                {confirm?.action === "delete"
                    ? <>Delete <strong>{confirm.user.username}</strong>? This cannot be undone.</>
                    : <>Sign <strong>{confirm?.user.username}</strong> out on every device? They will need to log in again.</>}
            </ConfirmDialog>

            <AdminToast toast={toast} onClose={() => setToast(null)} />
        </>
    );
};

export default Users;
