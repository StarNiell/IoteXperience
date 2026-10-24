import configData from './config.json';

interface Config {
  wsDatabaseUrl: string;
  mqttServer: string;
  mqttClientId: string;
  streamProxyUrl: string;
}

const config: Config = configData;

export default config;