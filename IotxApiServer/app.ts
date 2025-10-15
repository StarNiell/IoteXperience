import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { Server } from './server';
import { Postgres } from './postgres';

const app = express();
app.use(cors());
app.use(morgan('tiny'));
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

var db = new Postgres('192.168.1.107', 5432, 'postgres', 'Goldendrops2025', 'datawh')

const server: Server = new Server(app, 3000, db);
if (server.listen()) {
    console.log('Server started');
} 


