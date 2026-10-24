const express = require('express');
const cors = require('cors');
const ProxyStream = require('./proxyManager');
const axios = require('axios');
const CryptoUtil = require('./cryptoutil');
const settings = require('./settings');

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

console.success = (...args) => {
  originalConsole.log(`[${getTimestamp()}] [OK ]`, ...args);
};

// 🔥 FIX PER MODULI HTTP/HTTPS
const http = require('http');
const https = require('https');

const noKeepAliveAgent = new http.Agent({
  keepAlive: false,
  keepAliveMsecs: 1000,
  maxSockets: 1,
  maxFreeSockets: 1
});

const noKeepAliveAgentHttps = new https.Agent({
  keepAlive: false,
  keepAliveMsecs: 1000,
  maxSockets: 1,
  maxFreeSockets: 1
});

http.globalAgent = noKeepAliveAgent;
https.globalAgent = noKeepAliveAgentHttps;

const app = express();
const port = settings.port;

// Middleware
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(cors({
  maxAge: 300
}));

// Variabili globali
let deviceMap = {};
let deviceFixed = settings.fixedStreams;
const proxies = new Map();
let memoryStats = {
  peak: 0,
  cleanups: 0,
  leaksDetected: 0
};

// 🔥 CLEANUP AGGRESSIVO MODULI
const moduleCache = require('module')._cache;

function aggressiveModuleCleanup() {
  const safeModules = [
    'express', 'cors', 'http', 'https', 'url', 'child_process', 
    'fs', 'path', 'events', 'stream', 'buffer', 'util'
  ];
  
  let cleaned = 0;
  for (const modulePath in moduleCache) {
    const shouldKeep = safeModules.some(safe => 
      modulePath.includes(safe) || 
      modulePath.includes('node_modules')
    );
    
    if (!shouldKeep && !modulePath.includes('proxyManager') && !modulePath.includes('cryptoutil')) {
      delete moduleCache[modulePath];
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleanup modules: ${cleaned} removed from cache`);
  }
}

// 🔥 FUNZIONE DISTRUZIONE PROXY
function safelyDestroyProxy(id, proxy) {
  try {
    console.log(`Destoyed proxy: ${id}`);
    
    if (proxy.stopStream) {
      proxy.stopStream();
    }

    if (proxy.destroy) {
      proxy.destroy();
    }

    setTimeout(() => {
      if (proxy.cleanup) {
        proxy.cleanup();
      }
      
      if (global.gc) {
        setImmediate(() => global.gc());
      }
    }, 100);
    
  } catch (error) {
    console.error(`Error destroing proxy ${id}:`, error);
  }
}

/*
// 🔥 CLEANUP AUTOMATICO
function startOptimizedCleanup() {
  setInterval(() => {
    const now = Date.now();
    const memBefore = process.memoryUsage().heapUsed;
    let cleanedCount = 0;
    
    for (const [id, streamInfo] of proxies.entries()) {
      const { proxy, lastClientActivity, isPermanent, createdAt } = streamInfo;
      
      const noClients = !proxy.clients || proxy.clients.size === 0;
      const inactive = now - lastClientActivity > 45000;
      const tooOld = now - createdAt > 900000;
      
      if (!isPermanent && ((noClients && inactive) || tooOld)) {
        console.log(`Cleanup stream inattivo: ${id}`);
        safelyDestroyProxy(id, proxy);
        proxies.delete(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0 || Math.random() < 0.2) {
      aggressiveModuleCleanup();
    }
    
    const memAfter = process.memoryUsage().heapUsed;
    if (memAfter > memBefore * 1.3 && global.gc) {
      global.gc();
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleanup completato: ${cleanedCount} stream, memoria: ${(memAfter / 1024 / 1024).toFixed(2)}MB`);
    }
    
  }, 20000);
}
  */

// 🔥 GRACEFUL SHUTDOWN
function shutdown() {
  console.log('Start shutdown server...');
  
  memoryCleanup();
  
  console.success('Server shutdown completed');
  console.log('----------------------------------------------------------------');
  process.exit(0);
}

function memoryCleanup() {
  console.log('Start memory cleanup...');
  
  for (const [id, streamInfo] of proxies.entries()) {
    safelyDestroyProxy(id, streamInfo.proxy);
  }
  proxies.clear();
  
  aggressiveModuleCleanup();
  
  if (global.gc) {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => global.gc(), i * 500);
    }
  }
}

// ACCESS CONTROL

// Trusted clients (IotxStreamWriter) and management endpoints: key TRUSTED_KEY.
// Header X-Iotx-Trusted-Key; the management endpoints also accept ?key=... (to open them in a browser).
function hasTrustedKey(req, allowQuery) {
  const given = req.get('X-Iotx-Trusted-Key') || (allowQuery ? req.query.key : undefined);
  return CryptoUtil.keyEquals(given, settings.trustedKey);
}

function requireTrustedKey(req, res, next) {
  if (!settings.trustedKey) {
    return res.status(403).json({ error: 'Management endpoints disabled (TRUSTED_KEY not set)' });
  }
  if (!hasTrustedKey(req, true)) {
    console.warn(`${req.method} ${req.path} denied (invalid key) from ${req.ip}`);
    return res.status(403).json({ error: 'Invalid key' });
  }
  next();
}

// STREAM LIST
// Read from IotxApiServer (GET /proxy/streams) at startup, every STREAM_REFRESH_SECONDS
// and when an unknown stream is requested. Fixed streams (config.js) are always added.

let lastRefresh = 0;
let refreshing = null;

function applyStreamList(apiStreams) {
  const newMap = { ...apiStreams, ...deviceFixed };

  // Stop the proxies of streams removed or whose URL changed
  for (const [id, streamInfo] of proxies.entries()) {
    if (newMap[id] !== deviceMap[id]) {
      console.log(newMap[id] ? `Stream URL changed, restarting proxy: ${id}` : `Removing unconfigured proxy: ${id}`);
      safelyDestroyProxy(id, streamInfo.proxy);
      proxies.delete(id);
      memoryStats.cleanups++;
    }
  }

  const before = Object.keys(deviceMap).sort().join(',');
  deviceMap = newMap;
  const after = Object.keys(deviceMap).sort().join(',');
  if (before !== after) {
    console.log(`Stream list updated: ${after || '(empty)'}`);
  }
}

async function refreshStreams() {
  if (!settings.apiUrl || !settings.proxyServiceKey) return false;
  if (refreshing) return refreshing;    // one request at a time

  refreshing = (async () => {
    try {
      const response = await axios.get(`${settings.apiUrl}/proxy/streams`, {
        headers: { 'X-Iotx-Service-Key': settings.proxyServiceKey },
        timeout: 5000,
      });
      const streams = response.data && response.data.streams;
      if (!streams || typeof streams !== 'object') throw new Error('invalid response');
      applyStreamList(streams);
      lastRefresh = Date.now();
      return true;
    }
    catch (error) {
      // Keep the current list if the API is not reachable
      const status = error.response ? ` (HTTP ${error.response.status})` : '';
      console.error(`Stream list not updated from ${settings.apiUrl}: ${error.message}${status}`);
      return false;
    }
    finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

//ENDPOINTS

// Endpoint base
app.get('/', (req, res) => {
  res.send(`
    <h1>Video Proxy Server</h1>
    <p>Server streaming proxy in esecuzione</p>
    <ul>
      <li><a href="/streams">/streams</a> - Lista stream</li>
      <li><a href="/streamstats">/streamstats</a> - Statistiche</li>
      <li><a href="/memory/deep">/memory/deep</a> - Memoria</li>
      <li><a href="/endpoints">/endpoints</a> - Tutti gli endpoint</li>
    </ul>
  `);
});

// Elenco stream disponibili
app.get('/streams', requireTrustedKey, (req, res) => {
  res.send(`<h2>Stream disponibili:</h2>
    <ul>${Object.keys(deviceMap).map(id => `<li>${id}</li>`).join('')}</ul>`);
});

// Stream list configuration from the browser: removed.
// The proxy now reads the stream list from IotxApiServer.
app.post('/config', (req, res) => {
  res.status(410).json({ error: 'Removed: the stream list is read from IotxApiServer' });
});

// Stream video
app.get('/stream/:id', async (req, res) => {
  const memBefore = process.memoryUsage().heapUsed;
  let isOpen = true;
  
  const resId = CryptoUtil.generateRandomString(12);
  res.append('X-UIdenity', resId);

  const { id } = req.params;
  const token = req.query.token;

  // Access: a token issued by IotxApiServer for this stream, or the trusted key (header only)
  let client;
  if (hasTrustedKey(req, false)) {
    client = 'trusted client';
  }
  else if (token) {
    const userId = CryptoUtil.verifyStreamToken(settings.streamTokenSecret, id, token);
    if (userId === null) {
      console.warn(`Stream ${id}: invalid or expired token from ${req.ip}`);
      return res.status(403).send("Invalid or expired token");
    }
    client = `user ${userId}`;
  }
  else {
    return res.status(401).send("Missing token");
  }

  // Unknown stream: it may have just been added, read the list again (at most every 10 s)
  if (!deviceMap[id] && Date.now() - lastRefresh > 10000) {
    await refreshStreams();
  }
  if (!deviceMap[id]) {
    return res.status(404).send("Stream not found");
  }
  console.log(`Stream ${id} requested by ${client} - id: ${resId}`);

  try {
    if (!proxies.has(id)) {
      console.log(`Creating new proxy stream: ${id}`);
      proxies.set(id, {
        proxy: new ProxyStream(id, deviceMap[id]),
        lastClientActivity: Date.now(),
        isPermanent: false,
        createdAt: Date.now()
      });
    }

    const streamInfo = proxies.get(id);
    streamInfo.lastClientActivity = Date.now();

    if (!streamInfo.proxy.isRunning) {
      console.log(`Starting ProxyStream: ${id}`);
      streamInfo.proxy.startStream();
    }

    res.on('close', () => {
      isOpen = false;
      console.log(`Client closed on stream ${id} - id: ${resId}`);
      const memAfter = process.memoryUsage().heapUsed;
      if (memAfter > memBefore * 1.5) {
        memoryStats.leaksDetected++;
        console.warn(`Possible memory leak in stream ${id} (memBefore: ${(memBefore / 1024 / 1024).toFixed(2)}MB, memAfter: ${(memAfter / 1024 / 1024).toFixed(2)}MB -> ${((memAfter - memBefore) / 1024 / 1024).toFixed(2)}MB )`);
      }
    });

    if (isOpen)
    {
      streamInfo.proxy.addClient(res);
    }

  } catch (error) {
    console.error(`Stream Error ${id}:`, error);
    if (!res.headersSent) {
      res.status(500).send("Internal Error");
    }
  }
});


// Gestione stream
app.post('/stream/:id/close', requireTrustedKey, (req, res) => {
  const { id } = req.params;
  const streamInfo = proxies.get(id);
  
  if (streamInfo) {
    console.log(`Closing forced stream: ${id}`);
    safelyDestroyProxy(id, streamInfo.proxy);
    proxies.delete(id);
    
    if (global.gc) {
      global.gc();
    }
    
    return res.json({ success: true, message: `Stream ${id} closed` });
  }
  res.status(404).json({ error: 'Stream not found' });
});

app.post('/stream/:id/restart', requireTrustedKey, (req, res) => {
  const { id } = req.params;
  const streamInfo = proxies.get(id);
  
  if (streamInfo) {
    console.log(`Restart forced stream: ${id}`);
    
    safelyDestroyProxy(id, streamInfo.proxy);
    proxies.delete(id);
    
    setTimeout(() => {
      try {
        const newProxy = new ProxyStream(id, deviceMap[id]);
        proxies.set(id, {
          proxy: newProxy,
          lastClientActivity: Date.now(),
          isPermanent: false,
          createdAt: Date.now()
        });
        newProxy.startStream();
        console.log(`Stream ${id} restarted`);
      } catch (error) {
        console.error(`Errore during restarting stream ${id}:`, error);
      }
    }, 1000);
    
    return res.json({ success: true, message: `Stream ${id} restarted` });
  }
  res.status(404).json({ error: 'Stream not found' });
});

// Statistiche
app.get('/streamstats', requireTrustedKey, (req, res) => {
  const stats = {
    streams: {},
    memory: {
      rss: process.memoryUsage().rss,
      heapTotal: process.memoryUsage().heapTotal,
      heapUsed: process.memoryUsage().heapUsed,
      external: process.memoryUsage().external
    },
    summary: {
      totalStreams: proxies.size,
      totalClients: 0,
      activeStreams: 0
    }
  };
  
  for (const [id, streamInfo] of proxies.entries()) {
    const { proxy, lastClientActivity, createdAt } = streamInfo;
    const clientCount = proxy.clients ? proxy.clients.size : 0;
    
    stats.summary.totalClients += clientCount;
    if (proxy.isRunning) stats.summary.activeStreams++;
    
    stats.streams[id] = {
      clients: clientCount,
      isRunning: proxy.isRunning,
      lastActivity: new Date(lastClientActivity).toISOString(),
      uptime: proxy.isRunning && proxy.startTime ? Date.now() - proxy.startTime : 0,
      age: Date.now() - createdAt
    };
  }
  
  res.json(stats);
});

// Memory management
app.get('/memory/deep', requireTrustedKey, (req, res) => {
  const mem = process.memoryUsage();
  const stats = {
    memory: {
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(mem.external / 1024 / 1024).toFixed(2)} MB`
    },
    proxies: proxies.size,
    modules: Object.keys(moduleCache).length,
    stats: memoryStats
  };
  
  if (mem.heapUsed > memoryStats.peak) {
    memoryStats.peak = mem.heapUsed;
  }
  
  res.json(stats);
});

app.post('/memory/cleanup', requireTrustedKey, (req, res) => {
  console.log('Called memory cleanup...');
  memoryCleanup();
  memoryStats.cleanups++;
  res.json({ success: true, message: 'Cleanup completed' });
});

// Endpoint di debug
app.get('/endpoints', requireTrustedKey, (req, res) => {
  const endpoints = [
    'GET  /                 - Main page',
    'GET  /streams          - Stream available list',
    'GET  /stream/:id       - Stream video',
    'POST /stream/:id/close - Close stream specified', 
    'POST /stream/:id/restart - Restart stream specified',
    'GET  /streamstats      - Streams stats',
    'GET  /memory/deep      - Detailed Memory stats',
    'POST /memory/cleanup   - Memory clueanp forced',
    'GET  /endpoints        - Endpoint list (current)'
  ];
  
  res.json({ 
    message: 'Available endpoints :',
    endpoints 
  });
});

// 🔥 AVVIO SERVER
app.listen(port, () => {
  console.log(``);
  console.log(`*****************************************************************`);
  console.success(`Video proxy server started on http://localhost:${port}`);
  console.info(`Memory guard activated`);
  console.log(settings.envFile ? `Settings loaded from ${settings.envFile}` : 'No .env file found: using environment variables only');
  console.log(settings.configFile ? `Fixed streams from ${settings.configFile}: ${Object.keys(deviceFixed).join(', ') || '(none)'}` : 'No config.js: no fixed streams');
  console.log(`Stream tokens: ${settings.streamTokenSecret ? 'enabled' : 'DISABLED (STREAM_TOKEN_SECRET not set): only trusted clients'}`);
  console.log(`Trusted key: ${settings.trustedKey ? 'enabled' : 'disabled (TRUSTED_KEY not set): no trusted clients, management endpoints disabled'}`);
  deviceMap = { ...deviceFixed };
  if (settings.apiUrl && settings.proxyServiceKey) {
    console.log(`Stream list from ${settings.apiUrl}, refreshed every ${settings.streamRefreshSeconds} s`);
    refreshStreams();
    setInterval(refreshStreams, settings.streamRefreshSeconds * 1000);
  } else {
    console.warn('API_URL or PROXY_SERVICE_KEY not set: only fixed streams are available');
  }
  //startOptimizedCleanup(); non serve all'avvio
});

// 🔥 GESTIONE SHUTDOWN
process.on('SIGTERM', () => {
  console.warn('SIGTERM received, cleanup...');
  shutdown();
});

process.on('SIGINT', () => {
  console.warn('SIGINT received, cleanup...');
  shutdown();
});

module.exports = app;