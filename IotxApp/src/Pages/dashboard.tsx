import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../Auth/auth.tsx';
import ApiCalls from '../Components/apicalls.tsx';
import config from '../config/config.ts';
import Notification from '../Components/notification.tsx';
import Device from '../Components/devices/device.tsx';
import Stream from '../Components/devices/stream.tsx';
import { useMqtt } from '../Components/mqttContext.ts';
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx';
import { StreamModel } from '../Components/devices/models/streamModel.tsx';

interface DashboardData {
    id: number;
    name: string;
    devices: DeviceModel[];   // only the devices of this dashboard, in order
    streams: StreamModel[];   // only the streams of this dashboard, in order
}

// Live values from MQTT over the configuration from the database
function mergeLive(dbDevice: DeviceModel, mqttDevices: DeviceModel[]): DeviceModel {
    const live = mqttDevices.find(d => d.device_id === dbDevice.device_id);
    if (!live) return dbDevice;
    return {
        ...dbDevice,
        type: live.type || dbDevice.type,
        value: live.value,
        value2: live.value2,
        unit: live.unit ?? dbDevice.unit,
        unit2: live.unit2 ?? dbDevice.unit2,
        timestamp: live.timestamp,
        subscription: live.subscription || dbDevice.subscription,
        status: live.status,
    };
}

const Dashboard: React.FC = () => {
    const { dashboardId } = useParams<{ dashboardId: string }>();
    const { setAuth, setUser, user, dashboards } = useAuth();
    const { deviceList } = useMqtt();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const token = user?.data?.Token;

    // The requested dashboard if the user can see it, otherwise the user's default one
    const requestedId = parseInt(dashboardId || '0');
    const id = dashboards.some(d => d.id === requestedId) ? requestedId : (user?.data?.User?.dashboardid ?? 0);

    useEffect(() => {
        if (!token || !id) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        ApiCalls({ token, id }, `${config.wsDatabaseUrl}/getdashboard`, "get", setAuth, setUser).then((data) => {
            if (cancelled) return;
            setLoading(false);
            if (!data || data.error) {
                setErrorMessage(data?.error?.message ?? "Dashboard not available");
                setShowError(true);
                setDashboard(null);
                return;
            }
            setDashboard({
                id: data.id,
                name: data.name,
                devices: (data.devices ?? []).filter((d: DeviceModel) => d.dashboard_device_id !== 0),
                streams: (data.streams ?? []).filter((s: StreamModel) => s.dashboard_stream_id !== 0),
            });
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, token]);

    const devices = useMemo(
        () => (dashboard?.devices ?? []).map(d => mergeLive(d, deviceList)),
        [dashboard, deviceList]);

    const isEmpty = !loading && dashboard && devices.length === 0 && dashboard.streams.length === 0;

    return (
        <>
            <div className="iotx-page-head">
                <div className="iotx-eyebrow">Dashboard</div>
                <h1>{dashboard?.name ?? (loading ? "…" : "Dashboard")}</h1>
            </div>

            {loading && !dashboard && (
                <div className="iotx-empty"><div className="spinner-border spinner-border-sm" role="status"><span className="visually-hidden">Loading…</span></div></div>
            )}

            {isEmpty && <div className="iotx-empty">This dashboard has no widgets yet.</div>}

            {!loading && !dashboard && !id && <div className="iotx-empty">No dashboard is assigned to your user.</div>}

            <div className="iotx-grid">
                {devices.map(device => <Device key={`d-${device.id}`} device={device} />)}
                {dashboard?.streams.map(stream => <Stream key={`s-${stream.id}`} stream={stream} />)}
            </div>

            <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
        </>
    );
}
export default Dashboard;
