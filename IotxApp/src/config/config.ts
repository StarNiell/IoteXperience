// Runtime configuration of IotxApp.
//
// The settings are NOT compiled into the bundle: they are read at startup from config.json,
// served next to index.html (production: dist/config.json; development: public/config.json).
// The file is not in git: copy config.example.json and adapt it.
// It must contain only public addresses: the browser receives it as it is.

export interface Config {
  wsDatabaseUrl: string;     // IotxApiServer address
  mqttServer: string;        // MQTT broker, WebSocket (ws://... or wss://...)
  mqttClientId: string;      // prefix of the MQTT client id
  streamProxyUrl: string;    // IotxVideoProxyServer address
}

const config: Config = {
  wsDatabaseUrl: '',
  mqttServer: '',
  mqttClientId: 'iotxClient',
  streamProxyUrl: '',
};

const REQUIRED: (keyof Config)[] = ['wsDatabaseUrl', 'mqttServer', 'streamProxyUrl'];

// Reads config.json; must complete before the app is rendered
export async function loadConfig(): Promise<void> {
  const url = `${import.meta.env.BASE_URL}config.json`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    // e.g. the file is missing and the server answers with index.html
    throw new Error(`${url}: file missing or not valid JSON`);
  }
  for (const key of Object.keys(config) as (keyof Config)[]) {
    const value = data[key];
    if (typeof value === 'string' && value.trim() !== '') {
      config[key] = value.trim().replace(/\/+$/, '');
    }
  }
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`${url}: missing ${missing.join(', ')}`);
  }
}

export default config;
