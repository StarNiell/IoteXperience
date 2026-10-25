import React, { createContext, useContext, useState } from 'react';
import { DashboardModel } from '../Components/devices/models/dashboardModel';

// Answer of POST /dologin, kept in localStorage["user"]
export interface User {
  data: {
    Token: string;
    User: {
      ID?: number;
      Username: string;
      Email: string;
      dashboardid: number;
      admin: boolean;
    };
  };
}

const AuthContext = createContext<{
  auth: boolean | null;
  setAuth: React.Dispatch<React.SetStateAction<boolean | null>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  dashboards: DashboardModel[];
  setDashboards: React.Dispatch<React.SetStateAction<DashboardModel[]>>;
}>({
  auth: null,
  setAuth: () => { },
  user: null,
  setUser: () => { },
  dashboards: [],
  setDashboards: () => { },
});

export const useAuth = () => useContext(AuthContext);

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

// Session of the logged-in user, restored from localStorage when the app starts
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readStored<User | null>("user", null));
  const [auth, setAuth] = useState<boolean | null>(() => (user?.data?.Token ? true : null));
  const [dashboards, setDashboards] = useState<DashboardModel[]>(() => readStored<DashboardModel[]>("dashboards", []));

  return (
    <AuthContext.Provider value={{ auth, setAuth, user, setUser, dashboards, setDashboards }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
