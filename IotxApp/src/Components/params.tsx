import React, { useState, useEffect } from 'react';
import ApiCalls from './apicalls.tsx';
import { useAuth } from '../Auth/auth.tsx';
import Notification from './notification.tsx'; // Ensure Notification is correctly imported
import config from '../config/config.ts';

const Params: React.FC<{ token: string }> = ({ token }) => {
    const [params, setParams] = useState<any[]>([]);
    const { setAuth, setUser } = useAuth();
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const data = await ApiCalls({ key: "vocals", token: token }, `${config.wsDatabaseUrl}/params/`, "get", setAuth, setUser);
            console.log(data);
            if (data?.error) {
                setParams([]);
                setErrorMessage(data.error.message);
                setShowError(true);
            }
            else {
                setParams(data);
            }
        };

        fetchData();
    }, [token]);

    return (
        <>
            {
                params.map((param, index) =>
                    <div className="row striped" key={param.id || index}>
                        <div className="col-md-4">
                            {param.id}
                        </div>
                        <div className="col-md-4">
                            {param.key}
                        </div>
                        <div className="col-md-4">
                            {param.value}
                        </div>
                    </div>
                )
            }
            <Notification NotificationType={"error"} NotificationMessage={errorMessage} NotificationStatus={showError} SetNotificationStatus={setShowError} />
        </>
    );
};

export default Params;