import { Dispatch, SetStateAction } from "react";

interface NotificationProps {
    NotificationType: string;
    NotificationMessage: string;
    NotificationStatus: boolean;
    SetNotificationStatus: Dispatch<SetStateAction<boolean>>;
}

const Notification: React.FC<NotificationProps> = ({ NotificationType, NotificationMessage, NotificationStatus, SetNotificationStatus }) => {

    const mountedStyle = { animation: "inAnimation 250ms ease-in" };
    const unmountedStyle = {
        animation: "outAnimation 270ms ease-out",
        animationFillMode: "forwards"
    };

    let title = 'Notification';
    let bootsClassName = 'Success';
    switch (NotificationType) {
        case 'error':
            title = 'Error';
            bootsClassName = 'bg-danger';
            break;
        case 'success':
            title = 'Information';
            bootsClassName = 'bg-success';
            break;
        case 'warning':
            title = 'Warning';
            bootsClassName = 'bg-warning';
            break;
    }

    if (NotificationStatus) {
        window.setTimeout(() => {
            SetNotificationStatus(false);
        }, 2000)
    }

    return (
        <>
            <div className={NotificationMessage ? 'transitionDiv' : 'hiddenDiv' } style={NotificationStatus ? mountedStyle : unmountedStyle}>
                <div className={`rounded ${bootsClassName}`} style={{ minWidth: "35%" }}>
                    <p className='d-flex align-items-center justify-content-center'>{title}</p>
                    <p className='d-flex align-items-center justify-content-center'>{NotificationMessage}</p>
                </div>
            </div>
        </>
    );
}

export default Notification;