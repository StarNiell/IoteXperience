
import config from '../../../config/config.ts';
import { CryptoUtil } from '../../../utils/cryptoutil.ts';

const StreamViewUI: React.FC<{stream_id: string}> = ({stream_id}) => {
    const streamProxyUrl = `${config.streamProxyUrl}/stream/${stream_id}?token=${CryptoUtil.getTokenValid()}`;

      return (
        <>
            <div className="bg-dark rounded p-1" style={{ minHeight: '165px' }} >
                <center><div style={{ minHeight: "25px" }} className="bg-lightgray rounded text-dark" >{stream_id}</div></center>
                <div className="device-ui" style={{ minHeight: "132px" }}>
                    <center>
                        <a href={streamProxyUrl} target="_blank" rel="noopener noreferrer">
                        <img src={streamProxyUrl} style={{ maxWidth: "80%", maxHeight: "100%", objectFit: "contain" }} />
                        </a>
                    </center>
                </div>
            </div>
        </>
    );

}
export default StreamViewUI