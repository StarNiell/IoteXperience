const express = require('express');
const cors = require('cors');
const ProxyStream = require('./proxyManager');
const CryptoUtil = require('./cryptoutil');
const config = require('./config');

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
const port = 3002;

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
let deviceFixed = config.fixedStreams || {};
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
    console.log(`Cleanup moduli: ${cleaned} moduli rimossi dalla cache`);
  }
}

// 🔥 FUNZIONE DISTRUZIONE PROXY
function safelyDestroyProxy(id, proxy) {
  try {
    console.log(`Distruzione proxy: ${id}`);
    
    if (proxy.destroy) {
      proxy.destroy();
    }
    
    if (proxy.stopStream) {
      proxy.stopStream();
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
    console.error(`Errore distruzione proxy ${id}:`, error);
  }
}

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

// 🔥 GRACEFUL SHUTDOWN
function shutdown() {
  console.log('Avvio shutdown server...');
  
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
  
  console.success('Server shutdown completato');
  process.exit(0);
}

// 🔥🔥🔥 ENDPOINTS 🔥🔥🔥

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
app.get('/streams', (req, res) => {
  res.send(`<h2>Stream disponibili:</h2>
    <ul>${Object.keys(deviceMap).map(id => `<li>${id}</li>`).join('')}</ul>`);
});

// Configurazione device
app.post('/config', (req, res) => {
  const tokenValid = req.body.tokenValid;
  if (!CryptoUtil.isTokenValid(tokenValid)) {
    console.error('Configurazione in entrata con token non valido:', tokenValid);
    return res.status(403).json({ error: 'Token non valido' });
  }

  const configMap = req.body.streams || {};
  deviceMap = { ...configMap, ...deviceFixed };

  if (Object.keys(configMap).length === 0) {
    aggressiveModuleCleanup();
  }

  for (const [id, streamInfo] of proxies.entries()) {
    if (!deviceMap[id]) {
      console.log(`Rimozione stream non più configurato: ${id}`);
      safelyDestroyProxy(id, streamInfo.proxy);
      proxies.delete(id);
      memoryStats.cleanups++;
    }
  }

  console.log('Lista Streams aggiornata:', deviceMap);
  res.json({ success: true, devices: Object.keys(deviceMap) });
});

// Stream video
app.get('/stream/:id', (req, res) => {
  const memBefore = process.memoryUsage().heapUsed;
  
  const { id } = req.params;
  const token = req.query.token;
  const trusted = req.query.trusted;

  if (!token && !trusted) {
    return res.status(401).send("Token mancante");
  }
  if (token && !CryptoUtil.isTokenValid(token)) {
    return res.status(403).send("Token non valido");
  }
  if (trusted && trusted !== 'IotxTrusted') {
    return res.status(403).send("Trusted non valido");
  }

  if (!deviceMap[id]) {
    return res.status(404).send("Stream non trovato");
  }

  try {
    if (!proxies.has(id)) {
      console.log(`Creazione nuovo proxy stream: ${id}`);
      proxies.set(id, {
        proxy: new ProxyStream(deviceMap[id]),
        lastClientActivity: Date.now(),
        isPermanent: false,
        createdAt: Date.now()
      });
    }

    const streamInfo = proxies.get(id);
    streamInfo.lastClientActivity = Date.now();

    if (!streamInfo.proxy.isRunning) {
      console.log(`Avvio stream: ${id}`);
      streamInfo.proxy.startStream();
    }

    res.on('close', () => {
      if (streamInfo.proxy && streamInfo.proxy.removeClient) {
        streamInfo.proxy.removeClient(res);
        safelyDestroyProxy(streamInfo.proxy.id, streamInfo.proxy);
      }
      const memAfter = process.memoryUsage().heapUsed;
      if (memAfter > memBefore * 1.5) {
        memoryStats.leaksDetected++;
        console.warn(`Possibile memory leak in stream ${id}`);
      }
    });

    streamInfo.proxy.addClient(res);

  } catch (error) {
    console.error(`Errore stream ${id}:`, error);
    if (!res.headersSent) {
      res.status(500).send("Errore interno");
    }
  }
});

// Gestione stream
app.post('/stream/:id/close', (req, res) => {
  const { id } = req.params;
  const streamInfo = proxies.get(id);
  
  if (streamInfo) {
    console.log(`Chiusura forzata stream: ${id}`);
    safelyDestroyProxy(id, streamInfo.proxy);
    proxies.delete(id);
    
    if (global.gc) {
      global.gc();
    }
    
    return res.json({ success: true, message: `Stream ${id} chiuso` });
  }
  res.status(404).json({ error: 'Stream non trovato' });
});

app.post('/stream/:id/restart', (req, res) => {
  const { id } = req.params;
  const streamInfo = proxies.get(id);
  
  if (streamInfo) {
    console.log(`Riavvio forzato stream: ${id}`);
    
    safelyDestroyProxy(id, streamInfo.proxy);
    proxies.delete(id);
    
    setTimeout(() => {
      try {
        const newProxy = new ProxyStream(deviceMap[id]);
        proxies.set(id, {
          proxy: newProxy,
          lastClientActivity: Date.now(),
          isPermanent: false,
          createdAt: Date.now()
        });
        newProxy.startStream();
        console.log(`Stream ${id} riavviato con successo`);
      } catch (error) {
        console.error(`Errore nel riavvio dello stream ${id}:`, error);
      }
    }, 1000);
    
    return res.json({ success: true, message: `Stream ${id} riavviato` });
  }
  res.status(404).json({ error: 'Stream non trovato' });
});

// Statistiche
app.get('/streamstats', (req, res) => {
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
app.get('/memory/deep', (req, res) => {
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

app.post('/memory/cleanup', (req, res) => {
  console.log('Cleanup memoria forzato...');
  
  for (const [id, streamInfo] of proxies.entries()) {
    safelyDestroyProxy(id, streamInfo.proxy);
  }
  proxies.clear();
  
  aggressiveModuleCleanup();
  
  if (global.gc) {
    global.gc();
    setTimeout(() => global.gc(), 1000);
  }
  
  memoryStats.cleanups++;
  res.json({ success: true, message: 'Cleanup completato' });
});

// Endpoint di debug
app.get('/endpoints', (req, res) => {
  const endpoints = [
    'GET  /                 - Pagina principale',
    'GET  /streams          - Lista stream disponibili',
    'POST /config           - Aggiorna configurazione streams',
    'GET  /stream/:id       - Stream video',
    'POST /stream/:id/close - Chiudi stream specifico', 
    'POST /stream/:id/restart - Riavvia stream specifico',
    'GET  /streamstats      - Statistiche streams',
    'GET  /memory/deep      - Statistiche memoria dettagliate',
    'POST /memory/cleanup   - Forza cleanup memoria',
    'GET  /endpoints        - Lista endpoint (questa)'
  ];
  
  res.json({ 
    message: 'Endpoint disponibili:',
    endpoints 
  });
});

// 🔥 AVVIO SERVER
app.listen(port, () => {
  console.success(`Video proxy server avviato su http://localhost:${port}`);
  console.info(`Memory guard attiva`);
  deviceMap = { ...deviceFixed };
  console.log('Lista Fixed Streams:', deviceMap);
  startOptimizedCleanup();
});

// 🔥 GESTIONE SHUTDOWN
process.on('SIGTERM', () => {
  console.warn('SIGTERM ricevuto, cleanup...');
  shutdown();
});

process.on('SIGINT', () => {
  console.warn('SIGINT ricevuto, cleanup...');
  shutdown();
});

module.exports = app;