/* The API answers are loosely typed JSON: callers check the fields they use. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from 'axios';

async function ApiCalls(parameters: any, url: string, method: string, setAuth: (auth: boolean) => void, setUser: (user: any) => void): Promise<any> {
    try {
        let res: any = {};
        switch (method) {
            case "get":
                res = await axios.get(url, {
                    params: parameters
                });
                break
            case "post":
                res = await axios.post(url, {
                    params: parameters
                });
                break;
        }
        if (res.data) {
            if (!(res.data.forbidden)) {
                return res.data;
            }
            else {
                setAuth(false);
                setUser({});
                localStorage.setItem("user", "");
                return { "error": { "status": 401, "message": "Invalid token or Session expired" } };
            }
        }
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error(error.response.data);
        } else {
            console.error(error);
        }
        const axiosError = error as AxiosError;
        switch (axiosError.status) {
            case 401:
                setAuth(false);
                setUser({});
                return { "error": { "status": axiosError.response?.status, "message": "The Username or Password is Incorrect. Try again." } };

            default: {
                // Prefer the server's own message (e.g. 409 "Username or email already in use")
                const body = axiosError.response?.data as { error?: unknown } | undefined;
                const message = typeof body?.error === "string" ? body.error : axiosError?.message;
                return { "error": { "status": axiosError.response?.status, "message": message } };
            }
        }
    }
}

export default ApiCalls;