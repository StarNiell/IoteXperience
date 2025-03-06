import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './Auth/auth.tsx';
import Navbar from './Components/navbar.tsx';
import Home from './Pages/home.tsx';
import Dashboard from './Pages/dashboard.tsx';
import Testdb from './Pages/testdb.tsx';
import Testmqtt from './Pages/testmqtt.tsx';
import Login from './Auth/login.tsx';
import Logout from './Auth/logout.tsx';
import Register from './Auth/register.tsx';

function App() {

  const { auth } = useAuth();

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={auth ? <Dashboard /> : <Navigate to='/login' />} />
        <Route path="/testdb" element={auth ? <Testdb /> : <Navigate to='/login' />} />
        <Route path="/testmqtt" element={auth ? <Testmqtt /> : <Navigate to='/login' />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
