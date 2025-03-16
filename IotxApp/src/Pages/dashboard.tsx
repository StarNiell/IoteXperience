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
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const { dashboardId } = useParams<{ dashboardId: string }>();
    const { setAuth, setUser, user } = useAuth();
    const { deviceList } = useMqtt();
    const [dashboard, setDashboard] = useState<DashboardModel | null>(null);
    const [mergedDevices, setMergedDevices] = useState<DeviceModel[]>([]);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    let iFlag = 0;

    const delay = async (ms: number) => {
        return new Promise((resolve) =>
            setTimeout(resolve, ms));
    };

    useEffect(() => {
        fetchDashboard();
    }, [dashboardId]);

    useEffect(() => {
        if (dashboard) {
            const merged = mergeDevices(dashboard.devices, deviceList);
            merged.forEach(device => {
                const apiDevice = dashboard.devices.find((apiDevice: DeviceModel) => apiDevice.device_id === device.device_id);
                device.dashboard_device_id = apiDevice?.dashboard_device_id || 0;
                device.id = apiDevice?.id || 0;
                device.title = apiDevice?.title || '';
                device.description = apiDevice?.description || '';
            });
            setMergedDevices(merged);
        }
    }, [deviceList, dashboard]);

    const fetchDashboard = async () => {
        const token = user?.data?.Token;
        var id = parseInt(dashboardId || '0');
        if (id > 0) {
            const data = await ApiCalls({ token, id }, `${config.wsDatabaseUrl}/getdashboard`, "get", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);
            } else {
                const merged = mergeDevices(data.devices, deviceList);
                // Patch to add dashboard_device_id to devices
                merged.forEach(device => {
                    const apiDevice = data.devices.find((apiDevice: DeviceModel) => apiDevice.device_id === device.device_id);
                    device.dashboard_device_id = apiDevice?.dashboard_device_id || 0;
                    device.id = apiDevice?.id || 0;
                    device.title = apiDevice?.title || '';
                    device.description = apiDevice?.description || '';
                });
                // Workaround when refresh page
                iFlag++;
                if (iFlag > 1) {
                    navigate(`/dashboard/0`);
                    await delay(100);
                    navigate(`/dashboard/${dashboardId}`);
                } else {
                    // Take only devices that are in the dashboard
                    var filtered = merged.filter(device => device.dashboard_device_id !== 0);
                    setDashboard({ ...data, devices: filtered });
                    setMergedDevices(filtered);
                }
            }
        }
    };

    const mergeDevices = (apiDevices: DeviceModel[], mqttDevices: DeviceModel[]) => {
        return apiDevices.map(apiDevice => {
            const mqttDevice = mqttDevices.find(mqttDevice => mqttDevice.device_id === apiDevice.device_id);
            return mqttDevice ? { ...apiDevice, ...mqttDevice } : apiDevice;
        });
    };

    function chunkArray(devices: DeviceModel[], chunkSize: number): DeviceModel[][] {
        const chunks = [];
        for (let i = 0; i < devices.length; i += chunkSize) {
            chunks.push(devices.slice(i, i + chunkSize));
        }
        return chunks;
    }

    return (
        <>
            <center className='p-3'><h1>Dashboard: {dashboard?.name}</h1></center>
            <Container className="fluid">
                {chunkArray(mergedDevices, 4).map((deviceChunk, index) => (
                    <Row key={index}>
                        {deviceChunk.map((device) => (
                            <Col style={{paddingTop: "10px"}} lg="3" key={device.device_id}>
                                <Device device={device} />
                            </Col>
                        ))}
                    </Row>
                ))}
                <div>
                    <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
                </div>
            </Container>
        </>
    );
};

export default Dashboard;