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
import { loadConfig } from "./config/config.ts";

  // OVERRIDE CONSOLE LOG CON TIMESTAMP
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  const getTimestamp = () => new Date().toISOString();

  console.log = (...args) => {
    originalConsole.log(`[${getTimestamp()}] [LOG]`, ...args);
  };

  console.error = (...args) => {
    originalConsole.error(`[${getTimestamp()}] [ERR]`, ...args);
  };

  console.warn = (...args) => {
    originalConsole.warn(`[${getTimestamp()}] [WRN]`, ...args);
  };

  console.info = (...args) => {
    originalConsole.info(`[${getTimestamp()}] [INF]`, ...args);
  };

  localStorage.setItem("mqtt-connected-status", "disconnected");
  
  const clientId = generateGUID();
  localStorage.setItem("client-id", clientId);
  console.log("IotX client-id: " + clientId);

  function generateGUID(): string {
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 1000000);
    return `${timestamp}-${randomNum}`;
  }
const root = createRoot(document.getElementById('root')!);

// The configuration (config.json next to index.html) is read before the app starts
loadConfig()
  .then(() => {
    root.render(
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
    );
  })
  .catch((error) => {
    console.error("Configuration not loaded:", error);
    root.render(
      <Container style={{ paddingTop: '40px', color: '#ddd' }}>
        <h4>IotxApp: configuration not available</h4>
        <p>The file <code>config.json</code> could not be read ({String(error?.message ?? error)}).</p>
        <p>Create it next to <code>index.html</code> from <code>config.example.json</code>.</p>
      </Container>
    );
  });
