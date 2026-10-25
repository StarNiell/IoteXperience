import React, { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus, faMinus, faVideo } from '@fortawesome/free-solid-svg-icons';
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx';
import { StreamModel } from '../Components/devices/models/streamModel.tsx';
import { useAdminApi } from '../Components/admin/useAdminApi.ts';
import AdminToast from '../Components/admin/AdminToast.tsx';
import DeviceTypeIcon from '../Components/admin/DeviceTypeIcon.tsx';

interface DashboardData {
    id: number;
    name: string;
    devices: DeviceModel[];   // every device; dashboard_device_id = 0 when not on this dashboard
    streams: StreamModel[];   // every stream; dashboard_stream_id = 0 when not on this dashboard
}

interface Item {
    key: string;
    title: string;
    sub: string;
    icon: React.ReactNode;
    onDashboard: boolean;
    add: () => Promise<unknown>;
    remove: () => Promise<unknown>;
}

// What a dashboard shows: its widgets (devices) or its cameras.
// Items are listed in dashboard order; new ones go to the end.
const DashboardContent: React.FC<{ kind: "devices" | "streams" }> = ({ kind }) => {
    const { dashboardId } = useParams<{ dashboardId: string }>();
    const id = parseInt(dashboardId || '0');
    const { call, toast, setToast } = useAdminApi();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [busyKey, setBusyKey] = useState("");

    const fetchDashboard = useCallback(async () => {
        if (!id) return;
        const data = await call<DashboardData>("getdashboard", "get", { id });
        if (data) setDashboard(data);
    }, [call, id]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const run = async (key: string, action: () => Promise<unknown>) => {
        setBusyKey(key);
        await action();
        setBusyKey("");
        // Always reload: older API versions answer "false" even when the change was made
        fetchDashboard();
    };

    const items: Item[] = kind === "devices"
        ? (dashboard?.devices ?? []).map(d => ({
            key: `d${d.id}`,
            title: d.title || d.device_id,
            sub: `${d.type} · ${d.device_id}`,
            icon: <DeviceTypeIcon type={d.type} />,
            onDashboard: d.dashboard_device_id !== 0,
            add: () => call("adddashboarddevice/", "post", { dashboardid: id, deviceid: d.id }),
            remove: () => call("remdashboarddevice/", "post", { dashboardid: id, dashboarddeviceid: d.dashboard_device_id }),
        }))
        : (dashboard?.streams ?? []).map(s => ({
            key: `s${s.id}`,
            title: s.stream_description || s.stream_id,
            sub: s.stream_id,
            icon: <FontAwesomeIcon icon={faVideo} />,
            onDashboard: s.dashboard_stream_id !== 0,
            add: () => call("adddashboardstream/", "post", { dashboardid: id, streamid: s.id }),
            remove: () => call("remdashboardstream/", "post", { dashboardid: id, dashboardstreamid: s.dashboard_stream_id }),
        }));

    const shown = items.filter(i => i.onDashboard);
    const available = items.filter(i => !i.onDashboard);
    const noun = kind === "devices" ? "widgets" : "cameras";

    const renderRow = (item: Item) => (
        <div className="iotx-row" key={item.key}>
            <span className="iotx-row-icon">{item.icon}</span>
            <div className="iotx-row-main">
                <div className="iotx-row-title">{item.title}</div>
                <div className="iotx-row-sub">{item.sub}</div>
            </div>
            <div className="iotx-row-actions">
                {item.onDashboard ? (
                    <Button variant="secondary" disabled={busyKey !== ""} onClick={() => run(item.key, item.remove)}>
                        <FontAwesomeIcon icon={faMinus} className="me-1" />Remove
                    </Button>
                ) : (
                    <Button variant="primary" disabled={busyKey !== ""} onClick={() => run(item.key, item.add)}>
                        <FontAwesomeIcon icon={faPlus} className="me-1" />Add
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <>
            <Link to="/dashboards" className="iotx-back"><FontAwesomeIcon icon={faArrowLeft} />Dashboards</Link>
            <div className="iotx-page-head">
                <div className="iotx-eyebrow">Dashboard</div>
                <h1>{dashboard?.name ?? "…"}</h1>
            </div>

            <div className="iotx-toolbar">
                <div className="iotx-segmented" role="navigation" aria-label="Content">
                    <NavLink to={`/dashboards/d/${id}`} className="btn" style={{ flex: 1 }}>Widgets</NavLink>
                    <NavLink to={`/dashboards/s/${id}`} className="btn" style={{ flex: 1 }}>Cameras</NavLink>
                </div>
                <Link to={`/dashboard/${id}`} className="btn btn-secondary">Open dashboard</Link>
            </div>

            <div className="iotx-section-head"><h2>On this dashboard ({shown.length})</h2></div>
            <div className="iotx-list">
                {dashboard && shown.length === 0 && <div className="iotx-list-empty">No {noun} on this dashboard yet.</div>}
                {shown.map(renderRow)}
            </div>

            <div className="iotx-section-head"><h2>Available ({available.length})</h2></div>
            <div className="iotx-list">
                {dashboard && available.length === 0 && <div className="iotx-list-empty">Everything is already on this dashboard.</div>}
                {available.map(renderRow)}
            </div>

            <AdminToast toast={toast} onClose={() => setToast(null)} />
        </>
    );
};

export default DashboardContent;
