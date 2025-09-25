import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../Auth/auth.tsx';
import ApiCalls from '../Components/apicalls.tsx';
import config from '../config/config.ts';
import Notification from '../Components/notification.tsx';
import { DashboardModel } from '../Components/devices/models/dashboardModel.tsx';
import { Container, Row, Col } from 'react-bootstrap';
import Device from '../Components/devices/device.tsx';
import { useMqtt } from '../Components/mqtt.tsx';
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx';
import { StreamModel } from '../Components/devices/models/streamModel.tsx';
import Stream from '../Components/devices/stream.tsx';
//import { usePageActive } from "../hooks/usePageActive";

const Dashboard: React.FC = () => {
    const {dashboardId } = useParams<{ dashboardId: string }>();
    const {setAuth, setUser, user, dashboards } = useAuth();
    //const {deviceList, checkMqttConnection } = useMqtt();
    const {deviceList } = useMqtt();
    const [dashboard, setDashboard] = useState<DashboardModel | null>(null);
    const [mergedDevices, setMergedDevices] = useState<DeviceModel[]>([]);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const [dboards, setDashboards] = useState<DashboardModel[]>([]);
    //const isPageActive = usePageActive();

    if (user?.data?.User === undefined) {
        navigate('/login');
    }
    var checkDashboard = dashboardId;

    if (checkDashboard === '999') {
        useEffect(() => {
            refreshDashboards();
        });
        /*
        checkDashboard = undefined;
        //navigate(`/`);
        window.location.href = "/";
        */
    }

    if (dashboards.filter(dashboard => dashboard.id === parseInt(checkDashboard || '0')).length === 0) {
        checkDashboard = user?.data?.User.dashboardid.toString();
    }

    /*
    useEffect(() => {
        if (isPageActive) {
            console.log("Page activate: check mqtt connection");
             checkMqttConnection();
        }
    }, [isPageActive]);
    */

    useEffect(() => {
        fetchDashboard();
    }, [checkDashboard]);

    useEffect(() => {
        if (dashboard) {
            const merged = mergeDevices(dashboard.devices, deviceList);
            merged.forEach(device => {
                const apiDevice = dashboard.devices.find((apiDevice: DeviceModel) => apiDevice.device_id === device.device_id);
                device.dashboard_device_id = apiDevice?.dashboard_device_id || 0;
                device.id = apiDevice?.id || 0;
                device.title = apiDevice?.title || '';
                device.description = apiDevice?.description || '';
                device.offset = apiDevice?.offset || 0;
                device.offset2 = apiDevice?.offset2 || 0;
            });
            setMergedDevices(merged);
        }
    }, [deviceList, dashboard]);

    const refreshDashboards = async () => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getdashboards/`, "get", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);
        } else {
            dboards.length = 0; // Clear the array while keeping the reference
            data.forEach((element: any) => {
                dboards.push({ id: element.id, name: element.name, devices: [], streams: [] });   
            });
            setDashboards(dboards);
            localStorage.setItem("dashboards", JSON.stringify(dboards));
            window.location.href = "/";
        }
    };

    const fetchDashboard = async () => {
        const token = user?.data?.Token;
        const id = parseInt(checkDashboard || '0');
        if (id > 0) {
            const data = await ApiCalls({ token, id }, `${config.wsDatabaseUrl}/getdashboard`, "get", setAuth, setUser);
            if (data?.error) {
                //console.log(data.error.message);
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
                    device.offset = parseFloat(apiDevice?.offset);
                    device.offset2 = parseFloat(apiDevice?.offset2);
                });
                // Workaround when refresh page
                /*
                iFlag++;
                if (iFlag > 1) {
                    navigate(`/dashboard/0`);
                    await delay(100);
                    navigate(`/dashboard/${dashboardId}`);
                } else {
                 */
                // Take only devices that are in the dashboard


                var filtered = merged.filter(device => device.dashboard_device_id !== 0);
                const filteredStreams = data.streams.filter((stream: StreamModel) => stream.dashboard_stream_id !== 0);
                //setDashboard({ ...data, devices: filtered });
                setDashboard({ ...data, devices: filtered, streams: filteredStreams });
                setMergedDevices(filtered);
                //}
            }
        }
    };

    // Unisci device e stream in un unico array, mantenendo l'ordine
    const allItems = [
        ...mergedDevices.map(device => ({ ...device, __type: 'device' })),
        ...(dashboard?.streams || []).map(stream => ({ ...stream, __type: 'stream' }))
    ];

    const mergeDevices = (apiDevices: DeviceModel[], mqttDevices: DeviceModel[]) => {
        return apiDevices.map(apiDevice => {
            const mqttDevice = mqttDevices.find(mqttDevice => mqttDevice.device_id === apiDevice.device_id);
            return mqttDevice ? { ...apiDevice, ...mqttDevice } : apiDevice;
        });
    };

    /*
    function chunkArray(devices: DeviceModel[], chunkSize: number): DeviceModel[][] {
        const chunks = [];
        for (let i = 0; i < devices.length; i += chunkSize) {
            chunks.push(devices.slice(i, i + chunkSize));
        }
        return chunks;
    }
        */

    // Chunk dell'array misto
    function chunkArrayMixed(items: any[], chunkSize: number): any[][] {
        const chunks = [];
        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }
        return chunks;
    }

    return (
    <>
        <center className='p-3'><h1>Dashboard: {dashboard?.name}</h1></center>
        <Container className="fluid">
            {chunkArrayMixed(allItems, 4).map((itemChunk, index) => (
                <Row key={index}>
                    {itemChunk.map((item: any) => (
                        <Col style={{ paddingTop: "10px" }} lg="3" key={item.device_id || item.stream_id}>
                            {item.__type === 'device' ? (
                                <Device device={item} />
                            ) : (
                                <Stream stream={item} />
                            )}
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
}
export default Dashboard;

