import React from 'react';
import { Toast } from './useAdminApi';

// Message at the bottom of admin pages (same look as <Notification>)
const AdminToast: React.FC<{ toast: Toast | null, onClose: () => void }> = ({ toast, onClose }) => {
    React.useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(onClose, 3500);
        return () => window.clearTimeout(timer);
    }, [toast, onClose]);
    if (!toast) return null;
    const title = toast.type === "error" ? "Error" : toast.type === "warning" ? "Warning" : "Done";
    return (
        <div className="iotx-toast" data-type={toast.type} role={toast.type === "error" ? "alert" : "status"}>
            <strong>{title}</strong>
            <span>{toast.message}</span>
        </div>
    );
};

export default AdminToast;
