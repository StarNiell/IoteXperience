import React, { useEffect, useState } from 'react';
import { StreamSrv } from '../streamsrv';
import { useAuth } from '../../Auth/auth';
import { usePageActive } from '../../hooks/usePageActive';
import WidgetCard from './WidgetCard';

// Camera (MJPEG stream through IotxVideoProxyServer)
const StreamWidget: React.FC<{ streamId: string, title: string }> = ({ streamId, title }) => {
    const { user, setAuth, setUser } = useAuth();
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");
    const [loaded, setLoaded] = useState(false);
    const { visible, wakeup } = usePageActive();
    const sessionToken = user?.data?.Token;

    // When the page becomes visible again (or wakes up, or the network comes back):
    // ask the API for a new stream token, then (re)open the stream.
    // The token is checked only when the connection is opened.
    useEffect(() => {
        if (!visible || !sessionToken) return;
        let cancelled = false;
        setLoaded(false);
        StreamSrv.getStreamUrl(sessionToken, streamId, setAuth, setUser).then((result) => {
            if (cancelled) return;
            if (result.url) {
                setError("");
                setUrl(result.url);
            } else {
                setUrl("");
                setError(result.error ?? "Stream not available");
            }
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, wakeup, streamId, sessionToken]);

    const status = error ? "Unavailable" : loaded ? <span className="iotx-live">LIVE</span> : "Connecting…";

    return (
        <WidgetCard title={title} level={error ? "danger" : "ok"} status={status} wide>
            <div className="iotx-stream-frame">
                {error && <span className="iotx-card-foot" data-tone="danger">{error}</span>}
                {!error && !loaded && <div className="spinner-border spinner-border-sm text-secondary" role="status"><span className="visually-hidden">Loading…</span></div>}
                {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: loaded ? "block" : "none", width: "100%" }}
                        aria-label={`${title}: open the stream in a new tab`}>
                        <img src={url} alt={`Camera ${title}`} onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
                    </a>
                )}
            </div>
        </WidgetCard>
    );
};

export default StreamWidget;
