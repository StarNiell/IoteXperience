# IotxApp

Web client of the IOTeXperience home-automation system (React 18 + Vite + react-bootstrap).
It talks to:

- **IotxApiServer** (HTTP): login, dashboards, devices, streams, MQTT credentials;
- the **MQTT broker** (WebSocket): device values (`iotx/out/#`) and commands (`iotx/in`);
- **IotxVideoProxyServer** (HTTP): camera streams.

## Configuration

The addresses are **not** compiled into the bundle: the app reads `config.json` at startup,
from the same folder as `index.html`. The file is not in git; `config.example.json` (in this
folder) is the template.

| Where | File to create | Notes |
|---|---|---|
| Development (`npm run dev`) | `public/config.json` | Vite serves the files of `public/` |
| Production (`npm run build` + `npm run preview`) | `dist/config.json` | keep it when `dist/` is replaced (e.g. `rsync --exclude config.json`) |

```json
{
  "wsDatabaseUrl": "http://your-server.example.com:5722",
  "mqttServer": "ws://your-server.example.com:5723",
  "mqttClientId": "iotxClient01",
  "streamProxyUrl": "http://your-server.example.com:3002"
}
```

- `wsDatabaseUrl`: IotxApiServer address.
- `mqttServer`: MQTT broker, WebSocket listener (`ws://` or `wss://`).
- `mqttClientId`: prefix of the MQTT client id (a random suffix is added per browser tab).
- `streamProxyUrl`: IotxVideoProxyServer address.

The file must contain only public addresses: the browser receives it as it is. The MQTT
username and password are given by IotxApiServer after login.

A change to `config.json` needs no rebuild: reload the page.

## Scripts

- `npm run dev` — development server (Vite, reachable on the local network)
- `npm run build` — type check and production build in `dist/`
- `npm run preview` — serves `dist/` (used in production)
- `npm run lint` — ESLint
