import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './Auth/auth.tsx';
import Navbar from './Components/navbar.tsx';
import Home from './Pages/home.tsx';
import DashboardTest from './Pages/dashboardTest.tsx';
import Testdb from './Pages/testdb.tsx';
import DeviceListMqttDB from './Pages/devicelistmqttdb.tsx';
import Login from './Auth/login.tsx';
import Logout from './Auth/logout.tsx';
import Register from './Auth/register.tsx';
import Dashboards from './Pages/dashboards.tsx';
import Profile from './Pages/profile.tsx';
import DashboardDevices from './Pages/dashboarddevices.tsx';
import Dashboard from './Pages/dashboard.tsx';
import Users from './Pages/users.tsx';

function App() {

  const { auth } = useAuth();

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboardtest" element={auth ? <DashboardTest /> : <Navigate to='/login' />} />
        <Route path="/dashboard/:dashboardId" element={<Dashboard />} />
        <Route path="/dashboards" element={auth ? <Dashboards /> : <Navigate to='/dashboards' />} />
        <Route path="/dashboards/:dashboardId" element={<DashboardDevices />} />
        <Route path="/testdb" element={auth ? <Testdb /> : <Navigate to='/login' />} />
        <Route path="/devices" element={auth ? <DeviceListMqttDB /> : <Navigate to='/login' />} />
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
