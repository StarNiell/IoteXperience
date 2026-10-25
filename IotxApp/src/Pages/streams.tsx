import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faPlus, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { StreamModel } from '../Components/devices/models/streamModel.tsx';
import { useAdminApi } from '../Components/admin/useAdminApi.ts';
import ConfirmDialog from '../Components/admin/ConfirmDialog.tsx';
import AdminToast from '../Components/admin/AdminToast.tsx';

const EMPTY: StreamModel = { id: 0, stream_id: '', stream_url: '', stream_description: '', position: 0, dashboard_stream_id: 0 };
// Addresses the video proxy can open (RTSP cameras, HTTP MJPEG/snapshots)
const URL_PATTERN = /^(rtsp|rtsps|https?):\/\/[^\s/$.?#][^\s]*$/i;
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

// Cameras: the streams that IotxVideoProxyServer can open
const Streams: React.FC = () => {
    const { call, toast, setToast, notify } = useAdminApi();
    const [streams, setStreams] = useState<StreamModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [edit, setEdit] = useState<StreamModel | null>(null);
    const [removing, setRemoving] = useState<StreamModel | null>(null);
    const [busy, setBusy] = useState(false);

    const fetchStreams = useCallback(async () => {
        const data = await call<StreamModel[]>("getstreams/", "get");
        setLoading(false);
        if (data) setStreams(data);
    }, [call]);

    useEffect(() => { fetchStreams(); }, [fetchStreams]);

    const editError = edit && (
        !edit.stream_id.trim() ? "Enter a stream ID." :
            !ID_PATTERN.test(edit.stream_id.trim()) ? "The stream ID can contain only letters, digits, - and _." :
                streams.some(s => s.stream_id === edit.stream_id.trim() && s.id !== edit.id) ? "Another camera already uses this stream ID." :
                    !URL_PATTERN.test(edit.stream_url.trim()) ? "Enter the camera address (rtsp://, http:// or https://)." : "");

    const save = async () => {
        if (!edit || editError) return;
        setBusy(true);
        const stream = { ...edit, stream_id: edit.stream_id.trim(), stream_url: edit.stream_url.trim(), stream_description: edit.stream_description.trim() };
        const ok = await call(edit.id > 0 ? "editstream/" : "newstream/", "post", { stream });
        setBusy(false);
        if (ok !== null) {
            setEdit(null);
            notify(edit.id > 0 ? "Camera saved" : "Camera added");
            fetchStreams();
        }
    };

    const remove = async () => {
        if (!removing) return;
        setBusy(true);
        const ok = await call("deletestream/", "post", { id: removing.id });
        setBusy(false);
        setRemoving(null);
        if (ok !== null) {
            notify("Camera deleted");
            fetchStreams();
        }
    };

    return (
        <>
            <div className="iotx-head-row">
                <div className="iotx-page-head">
                    <div className="iotx-eyebrow">Administration</div>
                    <h1>Cameras</h1>
                </div>
                <Button variant="primary" className="mb-3" onClick={() => setEdit({ ...EMPTY })}>
                    <FontAwesomeIcon icon={faPlus} className="me-2" />New camera
                </Button>
            </div>

            <div className="iotx-list">
                {!loading && streams.length === 0 && <div className="iotx-list-empty">No cameras yet.</div>}
                {streams.map(stream => (
                    <div className="iotx-row" key={stream.id}>
                        <span className="iotx-row-icon"><FontAwesomeIcon icon={faVideo} /></span>
                        <div className="iotx-row-main">
                            <div className="iotx-row-title">{stream.stream_description || stream.stream_id}</div>
                            <div className="iotx-row-sub">{stream.stream_id} · {stream.stream_url}</div>
                        </div>
                        <div className="iotx-row-actions">
                            <Button variant="secondary" onClick={() => setEdit({ ...stream })}><FontAwesomeIcon icon={faPen} className="me-1" />Edit</Button>
                            <Button variant="secondary" onClick={() => setRemoving(stream)} aria-label={`Delete ${stream.stream_id}`}>
                                <FontAwesomeIcon icon={faTrash} className="text-danger" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal show={edit !== null} onHide={() => setEdit(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title as="h2" className="h5 m-0">{edit && edit.id > 0 ? "Edit camera" : "New camera"}</Modal.Title>
                </Modal.Header>
                {edit && (
                    <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
                        <Modal.Body>
                            <div className="iotx-form">
                                <div>
                                    <label className="form-label" htmlFor="st-desc">Name</label>
                                    <input id="st-desc" className="form-control" placeholder="e.g. Parking" value={edit.stream_description}
                                        onChange={(e) => setEdit({ ...edit, stream_description: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="st-id">Stream ID</label>
                                    <input id="st-id" className="form-control" autoCapitalize="none" placeholder="e.g. parking" value={edit.stream_id}
                                        onChange={(e) => setEdit({ ...edit, stream_id: e.target.value })} />
                                    <div className="form-text">Used in the stream address: letters, digits, - and _.</div>
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="st-url">Camera address</label>
                                    <input id="st-url" className="form-control" type="url" autoCapitalize="none" placeholder="rtsp://user:password@192.168.1.50:554/stream1"
                                        value={edit.stream_url} onChange={(e) => setEdit({ ...edit, stream_url: e.target.value })} />
                                    <div className="form-text">Only administrators can see it; viewers get the stream through the video proxy.</div>
                                </div>
                                {editError && <div className="iotx-inline-error" role="alert">{editError}</div>}
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
                            <Button type="submit" variant="primary" disabled={busy || !!editError}>Save</Button>
                        </Modal.Footer>
                    </form>
                )}
            </Modal>

            <ConfirmDialog show={removing !== null} title="Delete camera" confirmLabel="Delete" danger busy={busy}
                onConfirm={remove} onCancel={() => setRemoving(null)}>
                Delete <strong>{removing?.stream_description || removing?.stream_id}</strong>? It is also taken off every dashboard.
            </ConfirmDialog>

            <AdminToast toast={toast} onClose={() => setToast(null)} />
        </>
    );
};

export default Streams;
