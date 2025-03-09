import React, { useState } from 'react';
import Notification from './notification.tsx'; // Ensure Notification is correctly imported
import { DeviceModel } from './devices/models/deviceModel.tsx'; // Import DeviceModel
import { useMqtt } from './mqtt.tsx'
import ApiCalls from './apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';

const ParamsMqtt: React.FC<{ token: string }> = () => {
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage, ] = useState('');
    const { deviceList } = useMqtt();
    const { setAuth, setUser } = useAuth();

    const handleAddDevice = (device: DeviceModel) => {
        const fetchData = async () => {
            device.title = device.type + " " + device.device_id;
            device.description = device.title;
            device.min = 0;
            device.max = 100;
            device.step = 1;
            const data = await ApiCalls({ key: "device", device: device }, "http://localhost:3000/adddevice/", "post", setAuth, setUser);
            console.log(data);
            if (data?.error) {
                setErrorMessage(data.error.message);
                setShowError(true);
            }
            else {
                setErrorMessage("Response: OK");
                setShowError(true);
            }
        };

        fetchData();
    };
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
                        <div className="col-md-2">
                            {device.subscription}
                        </div>
                        <div className="col-md-2">
                            <button onClick={() => handleAddDevice(device)} className='btn btn-primary'>
                                Add
                            </button>
                        </div>
                    </div>
                
                )
            }
            <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
        </>
    );
};

export default ParamsMqtt;

function setAuth(auth: boolean): void {
    throw new Error('Function not implemented.');
}
function setUser(user: any): void {
    throw new Error('Function not implemented.');
}

