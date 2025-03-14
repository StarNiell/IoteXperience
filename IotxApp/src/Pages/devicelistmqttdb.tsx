import React, { useState, useEffect } from 'react';
import Notification from '../Components/notification.tsx';
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx'; // Import DeviceModel
import { useMqtt } from '../Components/mqtt.tsx';
import { useDevices } from '../Components/devices-from-db.tsx';
import ApiCalls from '../Components/apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts'; // Import the configuration
import { Table, Row, Col } from 'react-bootstrap';


const DeviceListMqttDB: React.FC<{}> = () => {
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const { deviceList } = useMqtt();
    const { setAuth, setUser, user } = useAuth();
    const { deviceDBList, fetchDeviceList } = useDevices();

    useEffect(() => {
        const fetchData = async () => {
            await fetchDeviceList();
        };

        fetchData();
    }, [deviceList]);

    const handleAddDevice = (device: DeviceModel) => {
        const fetchData = async () => {
            var token = user?.data?.Token;
            device.title = device.type + " " + device.device_id;
            device.description = device.title;
            device.min = 0;
            device.max = 100;
            device.step = 1;
            const data = await ApiCalls({ token: token, device: device }, `${config.wsDatabaseUrl}/adddevice/`, "post", setAuth, setUser);
            console.log(data);
            if (data?.error) {
                setErrorMessage(data.error.message);
                setShowError(true);
            } else {
                await fetchDeviceList();
            }
        };

        fetchData();
    };

    const handleRemDevice = (device: DeviceModel) => {
        const fetchData = async () => {
            var token = user?.data?.Token;
            var id = device.id;
            const data = await ApiCalls({ token: token, id: id }, `${config.wsDatabaseUrl}/remdevice/`, "post", setAuth, setUser);
            console.log(data);
            if (data?.error) {
                setErrorMessage(data.error.message);
                setShowError(true);
            } else {
                await fetchDeviceList();
            }
        };

        fetchData();
    };

    const mergeDevices = (mqttDevices: DeviceModel[], dbDevices: DeviceModel[]) => {
        var mergedDevices: DeviceModel[] = [];
        var found: boolean = false;
        for (var i = 0; i < mqttDevices.length; i++) {
            found = false;
            mqttDevices[i].id = 0;
            for (var j = 0; j < dbDevices.length; j++) {
                if (mqttDevices[i].device_id === dbDevices[j].device_id) {
                    mqttDevices[i].id = dbDevices[j].id;
                    mergedDevices.push(mqttDevices[i]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                mergedDevices.push(mqttDevices[i]);
            }
        }
        return mergedDevices;
    };

    var dList = mergeDevices(deviceList, deviceDBList);

    var token = user?.data?.Token;

    return (
        <>
            <center className='p-3'><h1>Device List</h1></center>
            <div>
                <Row>
                    <Col className='tableContainer'>
                        <Table bsPrefix="iotx-table" responsive>
                            <thead>
                                <tr>
                                    <th>Topic</th>
                                    <th>device_id</th>
                                    <th>type</th>
                                    <th>value</th>
                                    <th>unit</th>
                                    <th>subscription</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dList.map((device, index) => (
                                    <tr key={index}>
                                        <td>{device.topic}</td>
                                        <td>{device.device_id}</td>
                                        <td>{device.type}</td>
                                        <td>{device.value}</td>
                                        <td>{device.unit}</td>
                                        <td>{device.subscription}</td>
                                        <td style={{minWidth: "200px"}}>
                                        {device.id === 0 ? (
                                                <button onClick={() => handleAddDevice(device)} className='btn btn-primary'>
                                                    Add
                                                </button>
                                            ) : (
                                                <button onClick={() => handleRemDevice(device)} className='btn btn-danger'>
                                                    Rem
                                                </button>
                                            )}
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
        </>
    )
}
export default DeviceListMqttDB;

