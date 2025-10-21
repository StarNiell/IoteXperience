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
        <div className="bg-dark rounded p-1" style={{ minHeight: '165px' }}>
            <center>
                <div
                    style={{ minHeight: "25px" }}
                    className="bg-lightgray rounded text-dark"
                >
                    {stream_id}
                </div>
            </center>

            <div
                className="device-ui relative flex items-center justify-center rounded"
                style={{
                    minHeight: '153px',
                    width: '100%',
                    padding: '4px',          // 🔹 margine interno
                    backgroundColor: 'transparent', // 🔹 nessuno sfondo (lascia intravedere quello esterno)
                }}
                >
                {/* Spinner di caricamento */}
                {!loaded && (
                    <div className="absolute flex flex-col items-center justify-center text-dark z-10">
                    <div className="spinner-border text-center text-light mb-3"
                            role="status"
                            style={{ width: "2.5rem", height: "2.5rem" }}></div>
                    <p className="mt-2 font-small text-center text-light drop-shadow-sm">Waiting stream...</p>
                    </div>
                )}

                {/* Immagine streaming */}
                <a
                    href={streamProxyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                >
                    <img
                    src={streamProxyUrl}
                    alt={`Stream ${stream_id}`}
                    className={`transition-opacity duration-700 block mx-auto ${
                        loaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                        borderRadius: '6px',  // 🔹 facoltativo, per ammorbidire il bordo
                    }}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(false)}
                    />
                </a>
            </div>
        </div>
    );
};

export default StreamViewUI;
