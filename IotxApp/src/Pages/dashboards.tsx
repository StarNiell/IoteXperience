import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Table, Modal, Form } from 'react-bootstrap';
import Notification from '../Components/notification.tsx'; // Import the Notification component
import ApiCalls from '../Components/apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts'; // Import the configuration
import { useNavigate } from 'react-router-dom';
import { DashboardModel } from '../Components/devices/models/dashboardModel.tsx';
import { UserDashboardModel } from '../Components/devices/models/userDashboardModel.tsx';

const Dashboards: React.FC = () => {
    const [dashboards, setDashboards] = useState<DashboardModel[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentDashboard, setCurrentDashboard] = useState<DashboardModel | null>(null);
    const [newDashboardName, setNewDashboardName] = useState('');
    const [userDashboardList, setUserDashboardList] = useState<UserDashboardModel[]>([]);
    const { setAuth, setUser, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboards();
    }, []);

    const fetchDashboards = async () => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getdashboards/`, "get", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);

        } else {
            setDashboards(data);
        }
    };

    const handleNewDashboard = () => {
        setCurrentDashboard(null);
        setNewDashboardName('');
        setShowModal(true);
    };

    const handleDevicesDashboard = (dashboard: DashboardModel) => {
        navigate(`/dashboards/${dashboard.id}`);
    };

    const handleDeleteDashboard = async (dashboard: DashboardModel) => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token, id: dashboard.id }, `${config.wsDatabaseUrl}/deletedashboard/`, "post", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);

        } else {
            fetchDashboards();
        }
    };

    const handleEditDashboard = (dashboard: DashboardModel) => {
        setCurrentDashboard(dashboard);
        setNewDashboardName(dashboard.name);
        setShowModal(true);
    };

    const handleSaveDashboard = async () => {
        const token = user?.data?.Token;
        if (currentDashboard) {
            // Edit existing dashboard
            const data = await ApiCalls({ token, id: currentDashboard.id, name: newDashboardName }, `${config.wsDatabaseUrl}/editdashboard/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);

            } else {
                fetchDashboards();
            }
        } else {
            // Create new dashboard
            const data = await ApiCalls({ token, name: newDashboardName }, `${config.wsDatabaseUrl}/newdashboard/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);

            } else {
                fetchDashboards();
            }
        }
        setShowModal(false);
    };

    const handleUsersDashboard = async (dashboard: DashboardModel) => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token, id: dashboard.id }, `${config.wsDatabaseUrl}/getusersdashboard/`, "get", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            setUserDashboardList(data);
            setCurrentDashboard(dashboard);
            setShowUserModal(true);
        }
    };

    const handleSaveUsersDashboard = async () => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token, users: userDashboardList, dashboardId: currentDashboard?.id }, `${config.wsDatabaseUrl}/saveusersdashboard/`, "post", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            setShowUserModal(false);
        }
    };


    return (
        <>
            <center className='p-3'><h1>Dashboards</h1></center>
            <div style={{ maxWidth: '800px', margin: 'auto' }}>
                <Row className="my-3">
                    <Col>
                        <Button variant="primary" onClick={handleNewDashboard}>New Dashboard</Button>
                    </Col>
                </Row>
                <Row>
                    <Col className='tableContainer'>
                        <Table bsPrefix="iotx-table" responsive>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboards.map((dashboard) => (
                                    <tr key={dashboard.id}>
                                        <td style={{width: "80%"}}>{dashboard.name}</td>
                                        <td style={{minWidth: "350px"}}>
                                            <Button variant="warning" onClick={() => handleEditDashboard(dashboard)}>Edit</Button>{' '}
                                            <Button variant="info" onClick={() => handleDevicesDashboard(dashboard)}>Widgets</Button>{' '}
                                            <Button variant="secondary" onClick={() => handleUsersDashboard(dashboard)}>Users</Button>{' '}
                                            {dashboard.id > 1 && <Button variant="danger" disabled={dashboard.id === 1} onClick={() => handleDeleteDashboard(dashboard)}>Delete</Button>}
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

            <Modal style={{color: "#111111"}} show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{currentDashboard ? 'Edit Dashboard' : 'New Dashboard'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="formDashboardName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter dashboard name"
                                value={newDashboardName}
                                onChange={(e) => setNewDashboardName(e.target.value)}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handleSaveDashboard}>Save</Button>
                </Modal.Footer>
            </Modal>

            <Modal style={{color: "#111111"}} show={showUserModal} onHide={() => setShowUserModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Manage Users</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table responsive>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Access</th>
                                <th>Default</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userDashboardList.map((user) => (
                                <tr key={user.userId}>
                                    <td>{user.userName}</td>
                                    <td>
                                        <Form.Check
                                            type="checkbox"
                                            checked={user.hasAccess}
                                            onChange={(e) => {
                                                const updatedList = userDashboardList.map(u => u.userId === user.userId ? { ...u, hasAccess: e.target.checked } : u);
                                                setUserDashboardList(updatedList);
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <Form.Check
                                            type="checkbox"
                                            checked={user.isDefault}
                                            onChange={(e) => {
                                                const updatedList = userDashboardList.map(u => u.userId === user.userId ? { ...u, isDefault: e.target.checked } : u);
                                                setUserDashboardList(updatedList);
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowUserModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handleSaveUsersDashboard}>Save</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default Dashboards;