import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { Server } from './server';
import { Postgres } from './postgres';
import { AppConfig } from './config';

const app = express();
app.use(cors());
// Request log ('tiny' format) without tokens or passwords in the URL
morgan.token('safe-url', (req: express.Request) =>
  (req.originalUrl || req.url).replace(/([?&](token|password)=)[^&]*/gi, '$1***'));
app.use(morgan(':method :safe-url :status :res[content-length] - :response-time ms'));
app.use(bodyParser.json());

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

console.log(AppConfig.envFile ? `Settings loaded from ${AppConfig.envFile}` : 'No .env file found: using environment variables only');
console.log(`Database: ${AppConfig.db.user}@${AppConfig.db.host}:${AppConfig.db.port}/${AppConfig.db.database}`);
console.log(`Plaintext password sync: ${AppConfig.passwordPlaintextSync ? 'ON (transition period)' : 'OFF'}`);

var db = new Postgres(AppConfig.db.host, AppConfig.db.port, AppConfig.db.user, AppConfig.db.password, AppConfig.db.database,
  AppConfig.passwordPlaintextSync);

const server: Server = new Server(app, AppConfig.port, db);
if (server.listen()) {
    console.log('Server started');
} 


