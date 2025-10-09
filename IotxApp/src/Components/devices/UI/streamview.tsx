
import React, { useState, useEffect } from 'react';
import config from '../../../config/config.ts';
import { CryptoUtil } from '../../../utils/cryptoutil.ts';
import { usePageActive } from '../../../hooks/usePageActive.ts';

const StreamViewUI: React.FC<{stream_id: string}> = ({stream_id}) => {
    //const streamProxyUrl = `${config.streamProxyUrl}/stream/${stream_id}?token=${CryptoUtil.getTokenValid()}`;
    const [streamProxyUrl, setStreamProxyUrl] = useState<string>(`${config.streamProxyUrl}/stream/${stream_id}?token=${CryptoUtil.getTokenValid()}`);
    const isActive = usePageActive(); // importa la funzione isActive dal file usePageActive.ts

     useEffect(() => {
        if (isActive) { // controlla se isActive è vero
            console.log("Refresh streamProxyUrl for current stream");
            const uniqueParam = `&_ts=${Date.now()}`; // aggiunge un parametro unico per forzare il refresh
            setStreamProxyUrl(`${config.streamProxyUrl}/stream/${stream_id}?token=${CryptoUtil.getTokenValid()}${uniqueParam}`);
        }
    }, [isActive, stream_id]);
    
      return (
        <>
            <div className="bg-dark rounded p-1" style={{ minHeight: '165px' }} >
                <center><div style={{ minHeight: "25px" }} className="bg-lightgray rounded text-dark" >{stream_id}</div></center>
                <div className="device-ui" style={{ minHeight: "153px" }}>
                    <center>
                        <a href={streamProxyUrl} target="_blank" rel="noopener noreferrer">
                        <img src={streamProxyUrl} style={{  maxWidth: "80%", maxHeight: "100%", objectFit: "contain" }} />
                        </a>
                    </center>
                </div>
            </div>
        </>
    );

}
export default StreamViewUI

