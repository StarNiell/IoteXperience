import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../Auth/auth.tsx';
import ApiCalls from '../Components/apicalls.tsx';
import config from '../config/config.ts';
import Notification from '../Components/notification.tsx';
import { DashboardModel } from '../Components/devices/models/dashboardModel.tsx';
import { Container, Row, Col } from 'react-bootstrap';
import Device from '../Components/devices/device.tsx';
import { useMqtt } from '../Components/mqtt.tsx';
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx';

const Dashboard: React.FC = () => {
    const { dashboardId } = useParams<{ dashboardId: string }>();
    const { setAuth, setUser, user } = useAuth();
    const { deviceList } = useMqtt();
    const [dashboard, setDashboard] = useState<DashboardModel | null>(null);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchDashboard();
    }, [dashboardId]);

    useEffect(() => {
        if (dashboard) {
            const mergedDevices = mergeDevices(dashboard.devices, deviceList);
            setDashboard({ ...dashboard, devices: mergedDevices });
        }
    }, [deviceList]);

    const fetchDashboard = async () => {
        const token = user?.data?.Token;
        var id = parseInt(dashboardId || '0');
        const data = await ApiCalls({ token, id }, `${config.wsDatabaseUrl}/getdashboard`, "get", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            // Esegui il merge delle device
            const mergedDevices = mergeDevices(data.devices, deviceList);
            setDashboard({ ...data, devices: mergedDevices });
        }
    };

    const mergeDevices = (apiDevices: DeviceModel[], mqttDevices: DeviceModel[]) => {
        return apiDevices.map(apiDevice => {
            const mqttDevice = mqttDevices.find(mqttDevice => mqttDevice.device_id === apiDevice.device_id);
            return mqttDevice ? { ...apiDevice, ...mqttDevice } : apiDevice;
        });
    };

    return (
        <>
            <center className='p-3'><h1>Dashboard: {dashboard?.name}</h1></center>
            <Container className="fluid">
                <Row>
                    {dashboard?.devices.map((device) => (
                        <Col lg="3" key={device.device_id}>
                            <Device device={device} />
                        </Col>
                    ))}
                </Row>
                <div>
                    <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
                </div>
            </Container>
        </>
    );
};

export default Dashboard;