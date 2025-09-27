import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './Auth/auth.tsx';
import Navbar from './Components/navbar.tsx';
import Home from './Pages/home.tsx';
import DeviceListMqttDB from './Pages/devicelistmqttdb.tsx';
import Login from './Auth/login.tsx';
import Logout from './Auth/logout.tsx';
import Register from './Auth/register.tsx';
import Dashboards from './Pages/dashboards.tsx';
import Profile from './Pages/profile.tsx';
import DashboardDevices from './Pages/dashboarddevices.tsx';
import DashboardStreams from './Pages/dashboardstreams.tsx';
import Dashboard from './Pages/dashboard.tsx';
import Users from './Pages/users.tsx';
import Streams from './Pages/streams.tsx';
import { StreamSrv } from './Components/streamsrv.tsx';
import { usePageActive } from "./hooks/usePageActive";
import { useMqtt } from './Components/mqtt.tsx';


function App() {

  //const { auth } = useAuth();
  const { user, auth, setAuth, setUser } = useAuth();
  const isPageActive = usePageActive();
  const {checkMqttConnection, endMqttConnection } = useMqtt();

  //const rand = Math.floor(Math.random() * 100);

  useEffect(() => {
      if (user?.data?.Token) {
          StreamSrv.updateProxyConfig(user.data.Token, setAuth, setUser);
      }
  }, [user]);

  
  useEffect(() => {
      if (isPageActive) {
          console.log("Page activate: check mqtt connection");
          checkMqttConnection();
      }
      else {
          console.log("Page not active, end mqtt connection");
          endMqttConnection();
      }
  }, [isPageActive]);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard/:dashboardId" element={<Dashboard />} />
        <Route path="/dashboards" element={auth ? <Dashboards /> : <Navigate to='/dashboards' />} />
        <Route path="/dashboards/d/:dashboardId" element={<DashboardDevices />} />
        <Route path="/dashboards/s/:dashboardId" element={<DashboardStreams />} />
        <Route path="/devices" element={auth ? <DeviceListMqttDB /> : <Navigate to='/login' />} />
        <Route path="/streams" element={auth ? <Streams /> : <Navigate to='/login' />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<Register />} />
        <Route path="/users" element={<Users />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
