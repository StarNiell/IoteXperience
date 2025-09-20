import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Bootstrap Bundle JS
import "bootstrap/dist/js/bootstrap.bundle.min";
import { Container } from 'react-bootstrap';
import "./App.css";
import AuthProvider from "./Auth/auth.tsx";
import MqttProvider from "./Components/mqtt.tsx";
import DevicesProvider from "./Components/devices-from-db.tsx";

  localStorage.setItem("mqtt-connected-status", "disconnected");
  
  const clientId = generateGUID();
  localStorage.setItem("client-id", clientId);
  console.log("IotX client-id: " + clientId);

  function generateGUID(): string {
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 1000000);
    return `${timestamp}-${randomNum}`;
  }
createRoot(document.getElementById('root')!).render(
  <Container style={{ minHeight: '100vh', paddingTop: '20px' }}>
    <div className='rounded' style={{ backgroundColor: '#222222', minHeight: '95vh', padding: '10px' }}>
      <StrictMode>
        <AuthProvider>
          <MqttProvider>
            <DevicesProvider>
              <App />
            </DevicesProvider>
          </MqttProvider>
        </AuthProvider>
      </StrictMode>
    </div>
  </Container>
)
