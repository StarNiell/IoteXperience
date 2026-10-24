import React, { useState, useEffect } from 'react';
import { StreamSrv } from '../../streamsrv.tsx';
import { useAuth } from '../../../Auth/auth.tsx';
import { usePageActive } from '../../../hooks/usePageActive.ts';

const StreamViewUI: React.FC<{ stream_id: string }> = ({ stream_id }) => {
    const { user, setAuth, setUser } = useAuth();
    const [streamProxyUrl, setStreamProxyUrl] = useState<string>("");
    const [streamError, setStreamError] = useState<string>("");
    const [loaded, setLoaded] = useState(false);
    const { visible, wakeup } = usePageActive();

    // When the page becomes visible again (or wakes up, or the network comes back):
    // ask the API for a new stream token, then (re)open the stream.
    // The token is checked only when the connection is opened: a stream already playing is not
    // interrupted when it expires.
    useEffect(() => {
        if (!visible) return;
        const sessionToken = user?.data?.Token;
        if (!sessionToken) return;

        let cancelled = false;
        setLoaded(false); // reset loader quando ricarica lo stream
        StreamSrv.getStreamUrl(sessionToken, stream_id, setAuth, setUser).then((result) => {
            if (cancelled) return;
            if (result.url) {
                console.log("Refresh streamProxyUrl for current stream");
                setStreamError("");
                setStreamProxyUrl(result.url);
            } else {
                setStreamProxyUrl("");
                setStreamError(result.error ?? "Stream not available");
            }
        });
        return () => { cancelled = true; };
    }, [visible, wakeup, stream_id, user?.data?.Token]);

    return (
        <div className="bg-dark rounded p-1" style={{ minHeight: '205px' }}>
            <center>
                <div
                    style={{ minHeight: "25px" }}
                    className="bg-lightgray rounded m-1 text-dark"
                >
                    {stream_id}
                </div>
            </center>

            <div
                className="device-ui position-relative d-flex justify-content-center align-items-center rounded"
                style={{
                    minHeight: '163px',
                    width: '100%',
                    padding: '4px',
                    backgroundColor: 'transparent',
                    overflow: 'hidden',
                }}
            >
                {/* Stream not available */}
                {streamError && (
                    <div className="text-warning small text-center">{streamError}</div>
                )}

                {/* Spinner di caricamento */}
                {!loaded && !streamError && (
                    <div className="d-flex justify-content-center">
                        <div className="spinner-border text-light" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}

                {/* Immagine streaming */}
                {streamProxyUrl && (
                <a
                    href={streamProxyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                    style={{ display: loaded ? 'block' : 'none' }}  // 👈 collapsed quando non caricato
                >
                    <img
                        src={streamProxyUrl}
                        alt={`Stream ${stream_id}`}
                        className={`transition-opacity duration-700 block mx-auto ${loaded ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            objectPosition: 'center',
                            borderRadius: '6px',
                            transition: 'opacity 0.5s ease',
                        }}
                        onLoad={() => setLoaded(true)}
                        onError={() => setLoaded(false)}
                    />
                </a>
                )}
            </div>
        </div>
    );
};

export default StreamViewUI;
