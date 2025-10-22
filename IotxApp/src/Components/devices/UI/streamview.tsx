import React, { useState, useEffect } from 'react';
import config from '../../../config/config.ts';
import { CryptoUtil } from '../../../utils/cryptoutil.ts';
import { usePageActive } from '../../../hooks/usePageActive.ts';

const StreamViewUI: React.FC<{ stream_id: string }> = ({ stream_id }) => {
    const [streamProxyUrl, setStreamProxyUrl] = useState<string>(
        `${config.streamProxyUrl}/stream/${stream_id}?token=${CryptoUtil.getTokenValid()}`
    );
    const [loaded, setLoaded] = useState(false);
    const isActive = usePageActive();

    useEffect(() => {
        if (isActive) {
            console.log("Refresh streamProxyUrl for current stream");
            const uniqueParam = `&_ts=${Date.now()}`;
            setLoaded(false); // reset loader quando ricarica lo stream
            setStreamProxyUrl(`${config.streamProxyUrl}/stream/${stream_id}?token=${CryptoUtil.getTokenValid()}${uniqueParam}`);
        }
    }, [isActive, stream_id]);

    return (
        <div className="bg-dark rounded p-1" style={{ minHeight: '196px' }}>
            <center>
                <div
                    style={{ minHeight: "25px" }}
                    className="bg-lightgray rounded text-dark"
                >
                    {stream_id}
                </div>
            </center>

            <div
                className="device-ui position-relative d-flex justify-content-center align-items-center rounded"
                style={{
                    minHeight: '153px',
                    width: '100%',
                    padding: '4px',
                    backgroundColor: 'transparent',
                    overflow: 'hidden',
                }}
            >
                {/* Spinner di caricamento */}
                {!loaded && (
                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center"
                        style={{
                            backgroundColor: "rgba(0,0,0,0.3)",
                            borderRadius: "8px",
                            zIndex: 10,
                        }}
                    >
                        <div
                            className="spinner-border text-light mb-2"
                            role="status"
                            style={{ width: "2.5rem", height: "2.5rem" }}
                        >
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-light fs-6 fw-semibold" style={{ opacity: 0.9 }}>
                            Waiting stream...
                        </p>
                    </div>
                )}

                {/* Immagine streaming (collassata quando non caricata) */}
                {loaded && (
                    <a
                        href={streamProxyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-100 h-100 d-flex justify-content-center align-items-center"
                        style={{ zIndex: 1 }}
                    >
                        <img
                            src={streamProxyUrl}
                            alt={`Stream ${stream_id}`}
                            className="d-block mx-auto"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                objectPosition: 'center',
                                borderRadius: '6px',
                                transition: 'opacity 0.6s ease',
                                opacity: loaded ? 1 : 0,
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
