import React, { useState } from 'react';
import Notification from './notification.tsx'; // Ensure Notification is correctly imported
import { useMqtt } from './mqtt.tsx'

const ParamsMqtt: React.FC<{ token: string }> = () => {
    const [showError, setShowError] = useState(false);
    const [errorMessage, ] = useState('');
    const { deviceList } = useMqtt();

    return (
        <>
            {
                deviceList.map((device, index) =>
                    <div className="row striped" key={index}>
                        <div className="col-md-3">
                            {device.topic}
                        </div>
                        <div className="col-md-2">
                            {device.device_id}
                        </div>
                        <div className="col-md-1">
                            {device.type}
                        </div>
                        <div className="col-md-1">
                            {device.value}
                        </div>
                        <div className="col-md-1">
                            {device.unit}
                        </div>
                        <div className="col-md-3">
                            {device.subscription}
                        </div>
                    </div>
                
                )
            }
            <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
        </>
    );
};

export default ParamsMqtt;