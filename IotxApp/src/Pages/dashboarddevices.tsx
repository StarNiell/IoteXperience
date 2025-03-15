import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Button, Table } from 'react-bootstrap';
import ApiCalls from '../Components/apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts'; // Import the configuration
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx';
import { DashboardModel } from '../Components/devices/models/dashboardModel.tsx';
import Notification from '../Components/notification.tsx';

const DashboardDevices: React.FC = () => {
    const { dashboardId } = useParams<{ dashboardId: string }>();
    const [dashboard, setDashboard] = useState<DashboardModel | null>(null);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const { setAuth, setUser, user } = useAuth();

    useEffect(() => {
        fetchDashboard();
    }, [dashboardId]);

    const fetchDashboard = async () => {
        const token = user?.data?.Token;
        var id = parseInt(dashboardId || '0');
        const data = await ApiCalls({ token, id }, `${config.wsDatabaseUrl}/getdashboard`, "get", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            setDashboard(data);
        }
    };

    const handleAddDevice = async (device: DeviceModel) => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token, dashboardid: dashboard?.id, deviceid: device.id }, `${config.wsDatabaseUrl}/adddashboarddevice/`, "post", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            fetchDashboard();
        }
    };

    const handleRemoveDevice = async (device: DeviceModel) => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token, dashboardid: dashboard?.id, dashboarddeviceid: device.dashboard_device_id }, `${config.wsDatabaseUrl}/remdashboarddevice/`, "post", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            fetchDashboard();
        }
    };

    return (
        <Container>
            <Row className="my-3">
                <Col>
                    <center><h1>Dashboard</h1></center>
                </Col>
            </Row>
            <Row>
                <Col>
                    <center><h2 style={{ color: "orange" }}>{dashboard?.name}</h2></center>
                </Col>
            </Row>
            <Row>
                <Col className='tableContainer'>
                    <Table bsPrefix='iotx-table' responsive>
                        <thead className="table-dark">
                            <tr>
                                <th>Device ID</th>
                                <th>Type</th>
                                <th>Unit</th>
                                <th>Topic</th>
                                <th>Subscription</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboard?.devices.map((device) => (
                                <tr key={device.id}>
                                    <td>{device.device_id}</td>
                                    <td>{device.type}</td>
                                    <td>{device.unit}</td>
                                    <td>{device.topic}</td>
                                    <td>{device.subscription}</td>
                                    <td>
                                        {device.dashboard_device_id === 0 ?
                                            <Button variant="primary" onClick={() => handleAddDevice(device)}>Add</Button>
                                            :
                                            <Button variant="danger" onClick={() => handleRemoveDevice(device)}>Remove</Button>
                                        }
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
        </Container>
    );
};

export default DashboardDevices;