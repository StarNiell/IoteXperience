import React, { useState, useEffect } from 'react';
import Notification from '../Components/notification.tsx';
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx'; // Import DeviceModel
import { useMqtt } from '../Components/mqtt.tsx';
import { useDevices } from '../Components/devices-from-db.tsx';
import ApiCalls from '../Components/apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts'; // Import the configuration
import { Table, Row, Col, Modal, Button, Form } from 'react-bootstrap';

const DeviceListMqttDB: React.FC<{}> = () => {
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [editDevice, setEditDevice] = useState<DeviceModel | null>(null);
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

    const handleEditDevice = (device: DeviceModel) => {
        setEditDevice(device);
    };

    const handleSaveDevice = () => {
        const fetchData = async () => {
            var token = user?.data?.Token;
            const data = await ApiCalls({ token: token, device: editDevice }, `${config.wsDatabaseUrl}/savedevice/`, "post", setAuth, setUser);
            console.log(data);
            if (data?.error) {
                setErrorMessage(data.error.message);
                setShowError(true);
            } else {
                await fetchDeviceList();
                setEditDevice(null);
            }
        };

        fetchData();
    };

    const mergeDevices = (mqttDevices: DeviceModel[], dbDevices: any) => {
        var mergedDevices: DeviceModel[] = [];
        var found: boolean = false;
        for (var i = 0; i < mqttDevices.length; i++) {
            found = false;
            mqttDevices[i].id = 0;
            for (var j = 0; j < dbDevices.length; j++) {
                if (mqttDevices[i].device_id === dbDevices[j].device_id) {
                    mqttDevices[i].id = dbDevices[j].id;
                    mqttDevices[i].title = dbDevices[j].device_title;
                    mqttDevices[i].description = dbDevices[j].device_description;
                    mqttDevices[i].min = dbDevices[j].device_min;
                    mqttDevices[i].max = dbDevices[j].device_max;
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

    function parseIsoDate(isoString: string): Date | null {
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? null : date;
    }

    var dList = mergeDevices(deviceList, deviceDBList);

    //var token = user?.data?.Token;

    return (
        <>
            <center className='p-3'><h1>Device List</h1></center>
            <div>
                <Row>
                    <Col className='tableContainer'>
                        <Table bsPrefix="iotx-table" responsive>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>device_id</th>
                                    <th>type</th>
                                    <th>value</th>
                                    <th>value2</th>
                                    <th>Timestamp</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dList.map((device, index) => (
                                    <tr key={index}>
                                        <td>{device.title}</td>
                                        <td>{device.topic}</td>
                                        <td>{device.type}</td>
                                        <td>{device.value} {device.unit==="state" ? "" : device.unit }</td>
                                        <td>{device.value2} {device.unit2==="state" ? "" : device.unit2 }</td>
                                        <td style={{ fontSize: "0.8em" }}>{parseIsoDate(device.timestamp)?.toLocaleString()}</td>
                                        <td style={{ minWidth: "200px" }}>
                                            {device.id === 0 ? (
                                                <button onClick={() => handleAddDevice(device)} className='btn btn-primary'>
                                                    Add
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleRemDevice(device)} className='btn btn-danger'>
                                                        Remove
                                                    </button>
                                                    {' '}
                                                    <button onClick={() => handleEditDevice(device)} className='btn btn-secondary'>
                                                        Edit
                                                    </button>
                                                </>
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

            <Modal style={{ color: "#111111" }} show={editDevice !== null} onHide={() => setEditDevice(null)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Device</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editDevice && (
                        <Form>
                            <Form.Group controlId="formDeviceTitle">
                                <Form.Label>Title</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={editDevice.title}
                                    onChange={(e) => setEditDevice({ ...editDevice, title: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group controlId="formDeviceDescription">
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={editDevice.description}
                                    onChange={(e) => setEditDevice({ ...editDevice, description: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group controlId="formDeviceId">
                                <Form.Label>Device ID</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={editDevice.device_id}
                                    onChange={(e) => setEditDevice({ ...editDevice, device_id: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group controlId="formDeviceType">
                                <Form.Label>Type</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={editDevice.type}
                                    onChange={(e) => setEditDevice({ ...editDevice, type: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group controlId="formDeviceMin">
                                <Form.Label>Min</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={editDevice.min}
                                    onChange={(e) => setEditDevice({ ...editDevice, min: parseFloat(e.target.value) })}
                                />
                            </Form.Group>
                            <Form.Group controlId="formDeviceMax">
                                <Form.Label>Max</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={editDevice.max}
                                    onChange={(e) => setEditDevice({ ...editDevice, max: parseFloat(e.target.value) })}
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setEditDevice(null)}>Close</Button>
                    <Button variant="primary" onClick={handleSaveDevice}>Save</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default DeviceListMqttDB;

