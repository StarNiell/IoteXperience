import ApiCalls from '../Components/apicalls.tsx';
import config from '../config/config.ts';

export class StreamSrv {

    // Asks IotxApiServer for a token to open the stream and returns the proxy URL.
    // The token is signed by the server for this user and this stream: the app never knows the secret.
    // Returns an error message instead of the URL if the stream cannot be opened.
    static async getStreamUrl(sessionToken: string, streamId: string,
        setAuth: Parameters<typeof ApiCalls>[3], setUser: Parameters<typeof ApiCalls>[4]): Promise<{ url?: string, error?: string }> {
        const data = await ApiCalls({ token: sessionToken, stream: streamId }, `${config.wsDatabaseUrl}/getstreamtoken/`, "get", setAuth, setUser);
        if (!data || data.error || !data.token) {
            const message = data?.error?.status === 403 ? "Stream not available" : (data?.error?.message ?? "Stream token not available");
            console.error(`Stream ${streamId}: ${message}`);
            return { error: message };
        }
        // _ts forces the browser to open a new connection instead of reusing a cached image
        const url = `${config.streamProxyUrl}/stream/${encodeURIComponent(streamId)}?token=${encodeURIComponent(data.token)}&_ts=${Date.now()}`;
        return { url };
    }
}
