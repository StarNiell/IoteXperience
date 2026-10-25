import { useCallback, useState } from 'react';
import ApiCalls from '../apicalls';
import config from '../../config/config';
import { useAuth } from '../../Auth/auth';

export interface Toast {
    type: "error" | "success" | "warning";
    message: string;
}

// Calls IotxApiServer with the session token. Errors become a toast message
// (shown by the page with <Notification>) and the call returns null.
export function useAdminApi() {
    const { user, setAuth, setUser } = useAuth();
    const token = user?.data?.Token;
    const [toast, setToast] = useState<Toast | null>(null);

    const call = useCallback(async <T = unknown>(path: string, method: "get" | "post", params: Record<string, unknown> = {}): Promise<T | null> => {
        const data = await ApiCalls({ token, ...params }, `${config.wsDatabaseUrl}/${path}`, method, setAuth, setUser);
        if (data === undefined || data === null || (typeof data === "object" && "error" in data && data.error)) {
            const message = data?.error?.message ?? "No answer from the server";
            setToast({ type: "error", message: String(message) });
            return null;
        }
        return data as T;
    }, [token, setAuth, setUser]);

    const notify = useCallback((message: string, type: Toast["type"] = "success") => setToast({ type, message }), []);

    return { call, toast, setToast, notify, currentUserId: user?.data?.User?.ID };
}
