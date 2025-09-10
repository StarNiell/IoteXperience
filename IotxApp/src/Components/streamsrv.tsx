import ApiCalls from '../Components/apicalls.tsx';
import config from '../config/config.ts';
import { CryptoUtil } from '../utils/cryptoutil.ts';

export class StreamSrv {
    static async getStreamsFromDB(token: string, setAuth: any, setUser: any): Promise<any[]> {
        const data = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getstreams/`, "get", setAuth, setUser);
        if (data?.error) {
            console.error(data.error.message);
            return [];
        }
        return data;
    }

    static toProxyConfig(streams: any[]): Record<string, string> {
        // Se ci sono duplicati di stream_id, verrà mantenuto l'ultimo valore trovato
        return streams.reduce((acc: Record<string, string>, stream: any) => {
            acc[stream.stream_id] = stream.stream_url;
            return acc;
        }, {});
    }

    static async sendConfigToProxy(streams: any, tokenValid: string): Promise<boolean> {
        // Prepara la struttura richiesta dal proxy
        const configPayload = {
            streams: StreamSrv.toProxyConfig(streams),
            tokenValid: tokenValid
        };
        const streamProxyUrl = `${config.streamProxyUrl}/config`;
        
        try {
            const response = await fetch(streamProxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configPayload),
            });
            if (!response.ok) {
                console.error('Proxy config POST failed:', response.statusText);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Proxy config POST error:', err);
            return false;
        }
    }


    // Metodo da chiamare all'avvio o quando aggiorni la lista degli stream
    static async updateProxyConfig(token: string, setAuth: any, setUser: any): Promise<void> {
        const streams = await StreamSrv.getStreamsFromDB(token, setAuth, setUser);
        const tokenValid: string = CryptoUtil.getTokenValid();   
        await StreamSrv.sendConfigToProxy(streams, tokenValid);
    }
}