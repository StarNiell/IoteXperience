import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import ApiCalls from '../Components/apicalls.tsx';
import { DeviceModel } from '../Components/devices/models/deviceModel.tsx';
import { useAuth } from '../Auth/auth.tsx';
import config from '../config/config.ts';

const DevicesContext = createContext<{
    deviceDBList: DeviceModel[];
    setDeviceDBList: React.Dispatch<React.SetStateAction<DeviceModel[]>>;
    fetchDeviceList: () => Promise<void>;
}>({
    deviceDBList: [],
    setDeviceDBList: () => [],
    fetchDeviceList: async () => {}
});

export const useDevices = () => useContext(DevicesContext);

const DevicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [deviceDBList, setDeviceDBList] = useState<DeviceModel[]>([]);
    const { setAuth, setUser, user } = useAuth();

    const token = user?.data?.Token;

    const fetchDeviceList = useCallback(async () => {
        if (!token) {
            // Not logged in: nothing to ask the API
            setDeviceDBList([]);
            return;
        }
        const data = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getdevices/`, "get", setAuth, setUser);
        //console.log(data);
        if (data?.error) {
            console.log(data.error.message);
        } else {
            setDeviceDBList(data);
        }
    }, [token, setAuth, setUser]);


    useEffect(() => {
        fetchDeviceList();
    }, [fetchDeviceList]);

    return (
        <DevicesContext.Provider value={{ deviceDBList, setDeviceDBList, fetchDeviceList }}>
            {children}
        </DevicesContext.Provider>
    );
};
export default DevicesProvider;