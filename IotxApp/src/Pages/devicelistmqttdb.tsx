import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPen, faTrash, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx';
import { useMqtt } from '../Components/mqttContext.ts';
import { useDevices } from '../Components/devices-from-db.tsx';
import { useAdminApi } from '../Components/admin/useAdminApi.ts';
import ConfirmDialog from '../Components/admin/ConfirmDialog.tsx';
import AdminToast from '../Components/admin/AdminToast.tsx';
import DeviceTypeIcon from '../Components/admin/DeviceTypeIcon.tsx';
import { TimeUtil } from '../utils/timeutil.ts';

// A device row of GET /getdevices (database columns)
interface DbDevice {
    id: number;
    device_id: string;
    device_title: string;
    device_description: string;
    device_topic: string;
    device_subscription: string;
    device_type: string;
    device_value: string | number;
    device_min: string | number;
    device_max: string | number;
    device_unit: string;
    device_unit2: string | null;
    device_offset: string | number;
    device_offset2: string | number;
    device_timestamp: string | null;
}

// One line of the list: a device registered in the database, seen on MQTT, or both
interface DeviceRow {
    deviceId: string;
    type: string;
    db?: DbDevice;          // registered
    live?: DeviceModel;     // currently publishing
}

interface EditForm {
    id: number;
    deviceId: string;
    type: string;
    title: string;
    description: string;
    min: string;
    max: string;
    offset: string;
    offset2: string;
}

type Filter = "all" | "registered" | "new";

function valueText(row: DeviceRow): string {
    const live = row.live;
    if (!live) return "";
    const value = Number(live.value);
    switch (row.type) {
        case "switch": return value === 1 ? "On" : "Off";
        case "button": return value === 1 ? "Pressed" : "Idle";
        case "contact": return value === 1 ? "Closed" : "Open";
        case "sensor": {
            const offset = Number(row.db?.device_offset) || 0;
            const main = `${(value + offset).toFixed(1)}${live.unit ?? ""}`;
            return live.value2 !== null && live.value2 !== undefined ? `${main} · ${live.value2}${live.unit2 ? " " + live.unit2 : ""}` : main;
        }
        default: return String(live.value ?? "");
    }
}

// Devices: the ones publishing on MQTT and the ones registered in the database.
// A new device must be added before it can be put on a dashboard.
const DeviceListMqttDB: React.FC = () => {
    const { deviceList } = useMqtt();
    const { deviceDBList, fetchDeviceList } = useDevices();
    const { call, toast, setToast, notify } = useAdminApi();
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");
    const [edit, setEdit] = useState<EditForm | null>(null);
    const [removing, setRemoving] = useState<DeviceRow | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { fetchDeviceList(); }, [fetchDeviceList]);

    const rows = useMemo(() => {
        const map = new Map<string, DeviceRow>();
        for (const db of (deviceDBList as unknown as DbDevice[]) ?? []) {
            map.set(db.device_id, { deviceId: db.device_id, type: db.device_type, db });
        }
        for (const live of deviceList) {
            const row = map.get(live.device_id) ?? { deviceId: live.device_id, type: live.type };
            row.live = live;
            row.type = live.type || row.type;
            map.set(live.device_id, row);
        }
        return [...map.values()].sort((a, b) =>
            (a.db ? 1 : 0) - (b.db ? 1 : 0) ||
            (a.db?.device_title || a.deviceId).localeCompare(b.db?.device_title || b.deviceId));
    }, [deviceDBList, deviceList]);

    const visibleRows = rows.filter(row =>
        (filter === "all" || (filter === "registered" ? !!row.db : !row.db)) &&
        (!search || `${row.db?.device_title ?? ""} ${row.deviceId} ${row.type}`.toLowerCase().includes(search.toLowerCase())));
    const newCount = rows.filter(r => !r.db).length;

    const addDevice = async (row: DeviceRow) => {
        const live = row.live;
        if (!live) return;
        setBusy(true);
        const device = {
            ...live,
            title: `${live.type} ${live.device_id}`,
            description: "",
            min: 0, max: 100, step: 1, offset: 0, offset2: 0,
        };
        const ok = await call("adddevice/", "post", { device });
        setBusy(false);
        if (ok !== null) {
            notify(`Device ${live.device_id} added (also to the first dashboard)`);
            fetchDeviceList();
        }
    };

    const openEdit = (row: DeviceRow) => {
        const db = row.db!;
        setEdit({
            id: db.id, deviceId: db.device_id, type: row.type,
            title: db.device_title ?? "", description: db.device_description ?? "",
            min: String(Number(db.device_min) || 0), max: String(Number(db.device_max) || 100),
            offset: String(Number(db.device_offset) || 0), offset2: String(Number(db.device_offset2) || 0),
        });
    };

    const editError = edit && (
        !edit.title.trim() ? "Enter a title." :
            edit.type === "sensor" && !(Number(edit.max) > Number(edit.min)) ? "Max must be greater than min." :
                [edit.min, edit.max, edit.offset, edit.offset2].some(v => v === "" || isNaN(Number(v))) ? "Min, max and offsets must be numbers." : "");

    const saveDevice = async () => {
        if (!edit || editError) return;
        setBusy(true);
        const ok = await call("savedevice/", "post", {
            device: {
                id: edit.id, title: edit.title.trim(), description: edit.description.trim(),
                min: Number(edit.min), max: Number(edit.max), offset: Number(edit.offset), offset2: Number(edit.offset2),
            }
        });
        setBusy(false);
        if (ok !== null) {
            setEdit(null);
            notify("Device saved");
            fetchDeviceList();
        }
    };

    const removeDevice = async () => {
        if (!removing?.db) return;
        setBusy(true);
        const ok = await call("remdevice/", "post", { id: removing.db.id });
        setBusy(false);
        setRemoving(null);
        if (ok !== null) {
            notify("Device removed");
            fetchDeviceList();
        }
    };

    return (
        <>
            <div className="iotx-page-head">
                <div className="iotx-eyebrow">Administration</div>
                <h1>Devices</h1>
            </div>

            <div className="iotx-toolbar">
                <input className="form-control iotx-search" type="search" placeholder="Search devices" aria-label="Search devices"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="iotx-segmented" role="group" aria-label="Filter">
                    {([["all", "All"], ["registered", "Registered"], ["new", `New${newCount ? ` (${newCount})` : ""}`]] as [Filter, string][]).map(([key, label]) => (
                        <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>
                    ))}
                </div>
            </div>

            <div className="iotx-list">
                {visibleRows.length === 0 && <div className="iotx-list-empty">No devices.</div>}
                {visibleRows.map(row => {
                    const timestamp = row.live?.timestamp ?? row.db?.device_timestamp ?? null;
                    const sub = [row.type, row.deviceId, valueText(row), row.live ? TimeUtil.formatAge(timestamp) : "not publishing"].filter(Boolean).join(" · ");
                    return (
                        <div className="iotx-row" key={row.deviceId}>
                            <span className="iotx-row-icon"><DeviceTypeIcon type={row.type} /></span>
                            <div className="iotx-row-main">
                                <div className="iotx-row-title">
                                    {row.db?.device_title || row.deviceId}
                                    {!row.db && <span className="iotx-tag" data-tone="accent">New</span>}
                                    {!row.live && <span className="iotx-tag">Offline</span>}
                                </div>
                                <div className="iotx-row-sub">{sub}</div>
                            </div>
                            <div className="iotx-row-actions">
                                {row.live?.ip && (
                                    <a className="btn btn-secondary" href={`http://${row.live.ip}/`} target="_blank" rel="noopener noreferrer"
                                        title={`Configuration page (${row.live.ip})`}>
                                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="me-1" />Device page
                                    </a>
                                )}
                                {row.db ? (
                                    <>
                                        <Button variant="secondary" onClick={() => openEdit(row)}><FontAwesomeIcon icon={faPen} className="me-1" />Edit</Button>
                                        <Button variant="secondary" onClick={() => setRemoving(row)} aria-label={`Remove ${row.db.device_title || row.deviceId}`}>
                                            <FontAwesomeIcon icon={faTrash} className="text-danger" />
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="primary" disabled={busy} onClick={() => addDevice(row)}><FontAwesomeIcon icon={faPlus} className="me-1" />Add</Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal show={edit !== null} onHide={() => setEdit(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title as="h2" className="h5 m-0">Edit device</Modal.Title>
                </Modal.Header>
                {edit && (
                    <form onSubmit={(e) => { e.preventDefault(); saveDevice(); }} noValidate>
                        <Modal.Body>
                            <div className="iotx-row-sub mb-3">{edit.type} · {edit.deviceId}</div>
                            <div className="iotx-form-grid">
                                <div className="iotx-span-2">
                                    <label className="form-label" htmlFor="dev-title">Title</label>
                                    <input id="dev-title" className="form-control" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                                </div>
                                <div className="iotx-span-2">
                                    <label className="form-label" htmlFor="dev-desc">Description</label>
                                    <input id="dev-desc" className="form-control" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                                </div>
                                {edit.type === "sensor" && (
                                    <>
                                        <div>
                                            <label className="form-label" htmlFor="dev-min">Min</label>
                                            <input id="dev-min" className="form-control" type="number" inputMode="decimal" value={edit.min} onChange={(e) => setEdit({ ...edit, min: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="form-label" htmlFor="dev-max">Max</label>
                                            <input id="dev-max" className="form-control" type="number" inputMode="decimal" value={edit.max} onChange={(e) => setEdit({ ...edit, max: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="form-label" htmlFor="dev-off">Offset</label>
                                            <input id="dev-off" className="form-control" type="number" step="0.1" inputMode="decimal" value={edit.offset} onChange={(e) => setEdit({ ...edit, offset: e.target.value })} />
                                            <div className="form-text">Added to the main value</div>
                                        </div>
                                        <div>
                                            <label className="form-label" htmlFor="dev-off2">Offset 2</label>
                                            <input id="dev-off2" className="form-control" type="number" step="0.1" inputMode="decimal" value={edit.offset2} onChange={(e) => setEdit({ ...edit, offset2: e.target.value })} />
                                            <div className="form-text">For the second value</div>
                                        </div>
                                    </>
                                )}
                            </div>
                            {editError && <div className="iotx-inline-error mt-3" role="alert">{editError}</div>}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
                            <Button type="submit" variant="primary" disabled={busy || !!editError}>Save</Button>
                        </Modal.Footer>
                    </form>
                )}
            </Modal>

            <ConfirmDialog show={removing !== null} title="Remove device" confirmLabel="Remove" danger busy={busy}
                onConfirm={removeDevice} onCancel={() => setRemoving(null)}>
                Remove <strong>{removing?.db?.device_title || removing?.deviceId}</strong>? It is also taken off every dashboard.
                If the device keeps publishing, it shows up again as a new device.
            </ConfirmDialog>

            <AdminToast toast={toast} onClose={() => setToast(null)} />
        </>
    );
};

export default DeviceListMqttDB;
