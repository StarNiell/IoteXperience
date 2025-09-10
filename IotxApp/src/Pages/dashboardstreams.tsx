import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Button, Table } from 'react-bootstrap';
import ApiCalls from '../Components/apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts'; // Import the configuration
import { StreamModel } from '../Components/devices/models/streamModel.tsx';
import { DashboardModel } from '../Components/devices/models/dashboardModel.tsx';
import Notification from '../Components/notification.tsx';

const DashboardStreams: React.FC = () => {
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

    const handleAddStream = async (stream: StreamModel) => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token, dashboardid: dashboard?.id, streamid: stream.id }, `${config.wsDatabaseUrl}/adddashboardstream/`, "post", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            fetchDashboard();
        }
    };

    const handleRemoveStream = async (stream: StreamModel) => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token, dashboardid: dashboard?.id, dashboardstreamid: stream.dashboard_stream_id }, `${config.wsDatabaseUrl}/remdashboardstream/`, "post", setAuth, setUser);
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
                                <th>Stream ID</th>
                                <th>URL</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboard?.streams.map((stream) => (
                                <tr key={stream.id}>
                                    <td>{stream.stream_id}</td>
                                    <td>{stream.stream_url}</td>
                                    <td>
                                        {stream.dashboard_stream_id === 0 ?
                                            <Button variant="primary" onClick={() => handleAddStream(stream)}>Add</Button>
                                            :
                                            <Button variant="danger" onClick={() => handleRemoveStream(stream)}>Remove</Button>
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

export default DashboardStreams;