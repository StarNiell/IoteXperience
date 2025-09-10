import configData from './config.json';

interface Config {
  wsDatabaseUrl: string;
  mqttServer: string;
  mqttClientId: string;
  mqttUsername: string;
  mqttPassword: string;
  streamProxyUrl: string;
  hashingSecret: string;
}

const config: Config = configData;

export default config;