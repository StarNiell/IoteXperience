import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import React from 'react';
import { useAuth } from './Auth/auth.tsx';
import Navbar from './Components/navbar.tsx';
import Home from './Pages/home.tsx';
import DeviceListMqttDB from './Pages/devicelistmqttdb.tsx';
import Login from './Auth/login.tsx';
import Logout from './Auth/logout.tsx';
import Forgot from './Auth/forgot.tsx';
import Dashboards from './Pages/dashboards.tsx';
import Profile from './Pages/profile.tsx';
import DashboardContent from './Pages/dashboardcontent.tsx';
import Dashboard from './Pages/dashboard.tsx';
import Users from './Pages/users.tsx';
import Streams from './Pages/streams.tsx';


// Pages that need a logged-in user: otherwise go to the login page
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user?.data?.Token ? <>{children}</> : <Navigate to='/login' replace />;
};

// Administration pages: other users go to the home page (the server refuses them anyway)
const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user?.data?.Token) return <Navigate to='/login' replace />;
  return user.data.User?.admin ? <>{children}</> : <Navigate to='/' replace />;
};

// The MQTT connection is managed by MqttProvider (Components/mqtt.tsx):
// it follows the login state and the page visibility by itself.
function App() {
  return (
    <BrowserRouter>
      <div className="iotx-shell">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard/:dashboardId" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/dashboards" element={<RequireAdmin><Dashboards /></RequireAdmin>} />
            <Route path="/dashboards/d/:dashboardId" element={<RequireAdmin><DashboardContent kind="devices" /></RequireAdmin>} />
            <Route path="/dashboards/s/:dashboardId" element={<RequireAdmin><DashboardContent kind="streams" /></RequireAdmin>} />
            <Route path="/devices" element={<RequireAdmin><DeviceListMqttDB /></RequireAdmin>} />
            <Route path="/streams" element={<RequireAdmin><Streams /></RequireAdmin>} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
            <Route path="*" element={<Navigate to='/' replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App
