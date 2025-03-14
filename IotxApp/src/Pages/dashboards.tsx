import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Table, Modal, Form } from 'react-bootstrap';
import Notification from '../Components/notification.tsx'; // Import the Notification component
import ApiCalls from '../Components/apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts'; // Import the configuration

interface Dashboard {
    id: number;
    name: string;
}

const Dashboards: React.FC = () => {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
    const [newDashboardName, setNewDashboardName] = useState('');
    const { setAuth, setUser, user } = useAuth();

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

    const handleEditDashboard = (dashboard: Dashboard) => {
        setCurrentDashboard(dashboard);
        setNewDashboardName(dashboard.name);
        setShowModal(true);
    };

    const handleDeleteDashboard = async (dashboard: Dashboard) => {
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
                    <Col>
                        <Table bsPrefix="iotx-table" striped bordered hover variant="dark" responsive>
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
                                        <td style={{minWidth: "200px"}}>
                                            <Button variant="warning" onClick={() => handleEditDashboard(dashboard)}>Edit</Button>{' '}
                                            {dashboard.id > 1 && <Button variant="danger" onClick={() => handleDeleteDashboard(dashboard)}>Delete</Button>}
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

            <Modal show={showModal} onHide={() => setShowModal(false)}>
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
        </>
    );
};

export default Dashboards;