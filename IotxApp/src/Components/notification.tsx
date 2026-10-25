import { Dispatch, SetStateAction, useEffect } from "react";

interface NotificationProps {
    NotificationType: string;          // "error" | "success" | "warning"
    NotificationMessage: string;
    NotificationStatus: boolean;       // visible
    SetNotificationStatus: Dispatch<SetStateAction<boolean>>;
}

const TITLES: Record<string, string> = { error: "Error", success: "Done", warning: "Warning" };
const VISIBLE_TIME = 3500;

// A short message at the bottom of the screen that disappears by itself
const Notification: React.FC<NotificationProps> = ({ NotificationType, NotificationMessage, NotificationStatus, SetNotificationStatus }) => {
    useEffect(() => {
        if (!NotificationStatus) return;
        const timer = window.setTimeout(() => SetNotificationStatus(false), VISIBLE_TIME);
        return () => window.clearTimeout(timer);
    }, [NotificationStatus, NotificationMessage, SetNotificationStatus]);

    if (!NotificationStatus || !NotificationMessage) return null;

    return (
        <div className="iotx-toast" data-type={NotificationType} role={NotificationType === "error" ? "alert" : "status"}>
            <strong>{TITLES[NotificationType] ?? "Notification"}</strong>
            <span>{NotificationMessage}</span>
        </div>
    );
}

export default Notification;
