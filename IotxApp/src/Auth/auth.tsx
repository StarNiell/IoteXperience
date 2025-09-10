import React, { createContext, useContext, useState } from 'react';
import { DashboardModel } from '../Components/devices/models/dashboardModel';

interface User {
  data: {
    Token: string;
    User: {
      Username: string;
      Email: string;
      dashboardid: number;
      admin: boolean;
    };  
  };
}

const AuthContext = createContext<{
  auth: any;
  setAuth: React.Dispatch<React.SetStateAction<any>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  dashboards: any[];
  setDashboards: React.Dispatch<React.SetStateAction<DashboardModel[] | []>>;
}>({
  auth: null,
  setAuth: () => {},
  user: null,
  setUser: () => {},
  dashboards: [],
  setDashboards: () => {},
});

export const useAuth = () => useContext(AuthContext);


const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dashboards, setDashboards] = useState<DashboardModel[]>([]);

  if (!(user?.data?.Token)) {
    const userLocal = localStorage.getItem("user");
    if (userLocal) {
      setUser(JSON.parse(userLocal));
      setAuth(true);
    }
  }

    
  if (dashboards.length === 0) {
    const dashboardsLocal = localStorage.getItem("dashboards");
    if (dashboardsLocal && dashboardsLocal.trim() !== "[]") {
      setDashboards(JSON.parse(dashboardsLocal));
    }
  }
      
  
  return (
    <AuthContext.Provider value={{ auth, setAuth, user, setUser, dashboards, setDashboards }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;