import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Table, Modal, Form } from 'react-bootstrap';
import Notification from '../Components/notification.tsx'; // Import the Notification component
import ApiCalls from '../Components/apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts'; // Import the configuration
import { UserModel } from '../Components/devices/models/userModel.tsx';

const Users: React.FC = () => {
    const [users, setUsers] = useState<UserModel[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<UserModel | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserModel | null>(null);
    const [confirmAction, setConfirmAction] = useState<'resetToken' | 'deleteUser' | null>(null);
    const { setAuth, setUser, user } = useAuth();
    const isValidEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;

    const validateEmail = (email: string) => {
        return (email.match(isValidEmail));
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getusers/`, "get", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);

        } else {
            setUsers(data);
        }
    };

    const handleNewUser = () => {
        setCurrentUser(new UserModel({ id: 0, username: '', password: '', email: '', admin: false }));
        setShowModal(true);
    };

    const handleDeleteUser = (userr: UserModel) => {
        setSelectedUser(userr);
        setConfirmAction('deleteUser');
        setShowConfirmModal(true);
    };

    const handleResetToken = (userr: UserModel) => {
        setSelectedUser(userr);
        setConfirmAction('resetToken');
        setShowConfirmModal(true);
    };

    const confirmActionHandler = async () => {
        if (!selectedUser || !confirmAction) return;

        const token = user?.data?.Token;

        if (confirmAction === 'resetToken') {
            const data = await ApiCalls({ token, id: selectedUser.id }, `${config.wsDatabaseUrl}/resettoken/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);
            } else {
                fetchUsers();
            }
        } else if (confirmAction === 'deleteUser') {
            const data = await ApiCalls({ token, id: selectedUser.id }, `${config.wsDatabaseUrl}/deleteuser/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);
            } else {
                fetchUsers();
            }
        }

        setShowConfirmModal(false);
        setSelectedUser(null);
        setConfirmAction(null);
    };

    const handleEditUser = (user: UserModel) => {
        setCurrentUser(user);
        setShowModal(true);
    };

    const handleSaveUser = async () => {
        const token = user?.data?.Token;
        if ((currentUser?.id ?? 0) > 0) {
            // Edit existing User
            const data = await ApiCalls({ token, userr: currentUser }, `${config.wsDatabaseUrl}/edituser/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);

            } else {
                fetchUsers();
            }
        } else {
            // Create new user
            const data = await ApiCalls({ token, userr: currentUser }, `${config.wsDatabaseUrl}/newuser/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);

            } else {
                fetchUsers();
            }
        }
        setShowModal(false);
    };

    return (
        <>
            <center className='p-3'><h1>Users</h1></center>
            <div style={{ maxWidth: '800px', margin: 'auto' }}>
                <Row className="my-3">
                    <Col>
                        <Button variant="primary" onClick={handleNewUser}>New User</Button>
                    </Col>
                </Row>
                <Row>
                    <Col className='tableContainer'>
                        <Table bsPrefix="iotx-table" responsive>
                            <thead>
                                <tr>
                                    <th>UserName</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td style={{ width: "80%" }}>{user.username}</td>
                                        <td style={{ minWidth: "350px" }}>
                                            <Button variant="warning" onClick={() => handleEditUser(user)}>Edit</Button>{' '}
                                            <Button variant="info" onClick={() => handleResetToken(user)}>Reset Token</Button>{' '}
                                            {user.id > 1 && <Button variant="danger" disabled={user.id === 1} onClick={() => handleDeleteUser(user)}>Delete</Button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Col>
                </Row>
                <div>
                    <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
                </div>
            </div>

            <Modal style={{ color: "#111111" }} show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{currentUser ? 'Edit User' : 'New User'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="formUsername">
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentUser?.username}
                                onChange={(e) => setCurrentUser(currentUser ? { ...currentUser, username: e.target.value } : null)}
                            />
                        </Form.Group>
                        <Form.Group controlId="formPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={currentUser?.password}
                                onChange={(e) => setCurrentUser(currentUser ? { ...currentUser, password: e.target.value } : null)}
                            />
                        </Form.Group>
                        <Form.Group controlId="formEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={currentUser?.email}
                                onChange={(e) => {
                                    setCurrentUser(currentUser ? { ...currentUser, email: e.target.value } : null);
                                    if (validateEmail(e.target.value)) {
                                        e.target.className = "form-control is-valid";
                                    } else {
                                        e.target.className = "form-control is-invalid";
                                    }
                                }}
                            />
                        </Form.Group>
                        <Form.Group controlId="formAdmin">
                            <Form.Label>Admin</Form.Label>
                            <Form.Check
                                type="switch"
                                checked={currentUser?.admin}
                                onChange={(e) => setCurrentUser(currentUser ? { ...currentUser, admin: e.target.checked } : null)}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handleSaveUser}>Save</Button>
                </Modal.Footer>
            </Modal>

            <Modal style={{ color: "#111111" }} show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {confirmAction === 'resetToken' ? 'Confirm Reset Token' : 'Confirm Delete User'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {confirmAction === 'resetToken' && (
                        <>Are you sure you want to reset the token for user "{selectedUser?.username}"?</>
                    )}
                    {confirmAction === 'deleteUser' && (
                        <>Are you sure you want to delete the user "{selectedUser?.username}"? This action cannot be undone.</>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmActionHandler}>
                        {confirmAction === 'resetToken' ? 'Reset Token' : 'Delete User'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default Users;