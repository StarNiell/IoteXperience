import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Bootstrap Bundle JS
import "bootstrap/dist/js/bootstrap.bundle.min";
import { Container } from 'react-bootstrap';
// Inter (variable font), bundled with the app: no request to external servers
import "@fontsource-variable/inter";
import "./App.css";
import ThemeProvider from "./theme/ThemeProvider.tsx";
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
      <StrictMode>
        <ThemeProvider>
          <AuthProvider>
            <MqttProvider>
              <DevicesProvider>
                <App />
              </DevicesProvider>
            </MqttProvider>
          </AuthProvider>
        </ThemeProvider>
      </StrictMode>
    );
  })
  .catch((error) => {
    console.error("Configuration not loaded:", error);
    root.render(
      <Container style={{ paddingTop: '40px' }}>
        <h4>IotxApp: configuration not available</h4>
        <p>The file <code>config.json</code> could not be read ({String(error?.message ?? error)}).</p>
        <p>Create it next to <code>index.html</code> from <code>config.example.json</code>.</p>
      </Container>
    );
  });
