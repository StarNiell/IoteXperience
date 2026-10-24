// Settings of IotxVideoProxyServer.
//
// Secrets and addresses come from environment variables, optionally read from a .env file
// (see .env.example). Variables already set in the environment (e.g. by PM2) are not overwritten.
// Fixed streams (cameras not in the database) come from config.js (see config.example.js).

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFile() {
  const candidates = [
    process.env.IOTX_ENV_FILE,
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
  ].filter(Boolean);
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file });
      return file;
    }
  }
  return null;
}

function str(name) {
  return (process.env[name] || '').trim();
}

function int(name, defaultValue) {
  const value = str(name);
  if (value === '') return defaultValue;
  const n = parseInt(value, 10);
  if (isNaN(n)) throw new Error(`Setting ${name} must be a number, found "${value}"`);
  return n;
}

function loadFixedStreams() {
  const file = path.resolve(__dirname, 'config.js');
  if (!fs.existsSync(file)) return { file: null, streams: {} };
  const config = require(file);
  return { file, streams: { ...(config.fixedStreams || {}) } };
}

const envFile = loadEnvFile();
const fixed = loadFixedStreams();

module.exports = {
  envFile,
  configFile: fixed.file,
  port: int('PORT', 3002),
  // IotxApiServer address, used to read the stream list (GET /proxy/streams)
  apiUrl: str('API_URL').replace(/\/+$/, ''),
  // Key to read the stream list from IotxApiServer (same value as PROXY_SERVICE_KEY there)
  proxyServiceKey: str('PROXY_SERVICE_KEY'),
  // Secret to verify the stream tokens (same value as STREAM_TOKEN_SECRET in IotxApiServer)
  streamTokenSecret: str('STREAM_TOKEN_SECRET'),
  // Key for trusted clients (e.g. IotxStreamWriter) and for the management endpoints.
  // Empty = disabled.
  trustedKey: str('TRUSTED_KEY'),
  // How often the stream list is read again from IotxApiServer
  streamRefreshSeconds: int('STREAM_REFRESH_SECONDS', 60),
  // Cameras not in the database: { "<stream id>": "<url>" }
  fixedStreams: fixed.streams,
};
