import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Table, Modal, Form } from 'react-bootstrap';
import Notification from '../Components/notification.tsx'; // Import the Notification component
import ApiCalls from '../Components/apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts'; // Import the configuration
import { StreamModel } from '../Components/devices/models/streamModel.tsx';
import { StreamSrv } from '../Components/streamsrv.tsx';
import { CryptoUtil } from '../utils/cryptoutil.ts';

const Streams: React.FC = () => {
    const [streams, setStreams] = useState<StreamModel[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentStream, setCurrentStream] = useState<StreamModel | null>(null);
    const [selectedStream, setSelectedStream] = useState<StreamModel | null>(null);
    const [confirmAction, setConfirmAction] = useState<'deleteStream' | null>(null);
    const { setAuth, setUser, user  } = useAuth();
    const isValidURL = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;

    const validateURL = (url: string) => {
        return (url.match(isValidURL));
    }

    useEffect(() => {
        fetchStreams();
    }, []);

    const fetchStreams = async () => {
        const token = user?.data?.Token;
        const data = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getstreams/`, "get", setAuth, setUser);
        if (data?.error) {
            console.log(data.error.message);
            setErrorMessage(data.error.message);
            setShowError(true);

        } else {
            setStreams(data);
            const tokenValid: string = CryptoUtil.getTokenValid();   
            // Aggiorna il proxy dopo aver aggiornato la lista
            await StreamSrv.sendConfigToProxy(data, tokenValid);

        }
    };

    const handleNewStream = () => {
        setCurrentStream(new StreamModel({ id: 0, stream_id: '', stream_url: '', stream_description: '', position: 0, dashboard_stream_id: 0  }));
        setShowModal(true);
    };

    const handleDeleteStream = (stream: StreamModel) => {
        setSelectedStream(stream);
        setConfirmAction('deleteStream');
        setShowConfirmModal(true);
    };

    const confirmActionHandler = async () => {
        if (!selectedStream || !confirmAction) return;

        const token = user?.data?.Token;

        if (confirmAction === 'deleteStream') {
            const data = await ApiCalls({ token, id: selectedStream.id }, `${config.wsDatabaseUrl}/deletestream/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);
            } else {
                fetchStreams();
            }
        }

        setShowConfirmModal(false);
        setSelectedStream(null);
        setConfirmAction(null);
    };

    const handleEditStream = (stream: StreamModel) => {
        setCurrentStream(stream);
        setShowModal(true);
    };

    const handleSaveStream = async () => {
        const token = user?.data?.Token;
        if ((currentStream?.id ?? 0) > 0) {
            // Edit existing Stream
            const data = await ApiCalls({ token, stream: currentStream }, `${config.wsDatabaseUrl}/editstream/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);

            } else {
                fetchStreams();
            }
        } else {
            // Create new stream
            const data = await ApiCalls({ token, stream: currentStream }, `${config.wsDatabaseUrl}/newstream/`, "post", setAuth, setUser);
            if (data?.error) {
                console.log(data.error.message);
                setErrorMessage(data.error.message);
                setShowError(true);

            } else {
                fetchStreams();
            }
        }
        setShowModal(false);
    };

    return (
        <>
            <center className='p-3'><h1>Stream List</h1></center>
            <div style={{ maxWidth: '800px', margin: 'auto' }}>
                <Row className="my-3">
                    <Col>
                        <Button variant="primary" onClick={handleNewStream}>New Stream</Button>
                    </Col>
                </Row>
                <Row>
                    <Col className='tableContainer'>
                        <Table bsPrefix="iotx-table" responsive>
                            <thead>
                                <tr>
                                    <th>Stream ID</th>
                                    <th>URL</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {streams.map((stream) => (
                                    <tr key={stream.id}>
                                        <td style={{ width: "20%" }}>{stream.stream_id}</td>
                                        <td style={{ width: "60%" }}>{stream.stream_url}</td>
                                        <td style={{ minWidth: "250px" }}>
                                            <Button variant="warning" onClick={() => handleEditStream(stream)}>Edit</Button>{' '}
                                            <Button variant="danger" onClick={() => handleDeleteStream(stream)}>Delete</Button>
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
                    <Modal.Title>{currentStream ? 'Edit Stream' : 'New Stream'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="formStreamId">
                            <Form.Label>Stream ID</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentStream?.stream_id}
                                onChange={(e) => setCurrentStream(currentStream ? { ...currentStream, stream_id: e.target.value } : null)}
                            />
                        </Form.Group>
                        <Form.Group controlId="formURL">
                            <Form.Label>URL</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentStream?.stream_url}
                                onChange={(e) => {
                                    setCurrentStream(currentStream ? { ...currentStream, stream_url: e.target.value } : null);
                                    if (validateURL(e.target.value)) {
                                        e.target.className = "form-control is-valid";
                                    } else {
                                        e.target.className = "form-control is-invalid";
                                    }
                                }}
                            />
                        </Form.Group>
                        <Form.Group controlId="formDescription">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentStream?.stream_description}
                                onChange={(e) => setCurrentStream(currentStream ? { ...currentStream, stream_description: e.target.value } : null)}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handleSaveStream}>Save</Button>
                </Modal.Footer>
            </Modal>

            <Modal style={{ color: "#111111" }} show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {confirmAction}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {confirmAction === 'deleteStream' && (
                        <>Are you sure you want to delete the stream "{selectedStream?.stream_id}"? This action cannot be undone.</>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmActionHandler}>
                        {confirmAction}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default Streams;