const express = require('express');
const cors = require('cors');
const ProxyStream = require('./proxyManager');
const CryptoUtil = require('./cryptoutil');
const config = require('./config');

const app = express();
const port = 3002;

app.use(express.json());
app.use(cors());

let deviceMap = {};
let deviceFixed = config.fixedStreams || {};
const proxies = {};

// Endpoint per aggiornare la configurazione dei device
app.post('/config', (req, res) => {
  const tokenValid = req.body.tokenValid;
  if (!CryptoUtil.isTokenValid(tokenValid)) {
    console.log('Configurazione in entrata con token non valido:', tokenValid);
    return res.status(403).json({ error: 'Token non valido' });
  }

  const configMap = req.body.streams || {};
  deviceMap = { ...configMap, ...deviceFixed };

  // Rimuovi vecchi proxy non più presenti
  for (const id in proxies) {
    if (!deviceMap[id]) {
      proxies[id].proxy.stopStream();
      delete proxies[id];
    }
  }

  console.log('Lista Streams aggiornata:', deviceMap);
  res.json({ success: true, devices: Object.keys(deviceMap) });
});

// Route unica per tutti gli stream
app.get('/stream/:id', (req, res) => {
  const { id } = req.params;
  const token = req.query.token;
  const trusted = req.query.trusted;

  // Validazione
  if (!token && !trusted) {
    return res.status(401).send("Token mancante");
  }
  if (token && !CryptoUtil.isTokenValid(token)) {
    return res.status(403).send("Token non valido");
  }
  if (trusted && trusted !== 'IotxTrusted') {
    return res.status(403).send("Trusted non valido");
  }

  // Verifica che lo stream esista
  if (!deviceMap[id]) {
    return res.status(404).send("Stream non trovato");
  }

  // Crea ProxyStream solo se non esiste
  if (!proxies[id]) {
    proxies[id] = {
      proxy: new ProxyStream(deviceMap[id]),
      lastClientActivity: Date.now(),
      isPermanent: false
    };
  }

  // Aggiorna attività
  proxies[id].lastClientActivity = Date.now();

  // Avvia lo stream solo se non è già attivo
  if (!proxies[id].proxy.isRunning) {
    proxies[id].proxy.startStream();
  }

  // Aggiungi il client
  proxies[id].proxy.addClient(res);
});

// Elenco stream disponibili
app.get('/streams', (req, res) => {
  res.send(`<h2>Stream disponibili:</h2>
    <ul>${Object.keys(deviceMap).map(id => `<li>${id}</li>`).join('')}</ul>`);
});

// Avvio server
app.listen(port, () => {
  console.log(`Video proxy server in ascolto su http://localhost:${port}`);
  deviceMap = { ...deviceFixed };
  console.log('Lista Fixed Streams:', deviceMap);
  startOptimizedCleanup();
});

// Cleanup ottimizzato
function startOptimizedCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [id, streamInfo] of Object.entries(proxies)) {
      const { proxy, lastClientActivity, isPermanent } = streamInfo;
      if (!isPermanent && proxy.clients.size === 0 && now - lastClientActivity > 120000) {
        console.log(`Fermo stream inattivo: ${id}`);
        proxy.stopStream();
        delete proxies[id];
      }
      proxy.cleanupDeadClients();
    }
  }, 30000);
}


// Endpoint per forzare la chiusura di uno stream specifico
app.post('/stream/:id/close', (req, res) => {
  const { id } = req.params;
  if (proxies[id]) {
    console.log(`Chiusura forzata stream: ${id}`);
    proxies[id].proxy.destroy && proxies[id].proxy.destroy();
    proxies[id].proxy.stopStream();
    delete proxies[id];
    return res.json({ success: true, message: `Stream ${id} chiuso` });
  }
  res.status(404).json({ error: 'Stream non trovato' });
});

// Endpoint per riavviare uno stream specifico
app.post('/stream/:id/restart', (req, res) => {
  const { id } = req.params;
  if (proxies[id]) {
    console.log(`Riavvio forzato stream: ${id}`);
    proxies[id].proxy.stopStream();
    setTimeout(() => {
      proxies[id].proxy.startStream();
    }, 1000);
    return res.json({ success: true, message: `Stream ${id} riavviato` });
  }
  res.status(404).json({ error: 'Stream non trovato' });
});

// Endpoint per statistiche degli stream
app.get('/streamstats', (req, res) => {
  const stats = {};
  for (const [id, streamInfo] of Object.entries(proxies)) {
    const { proxy, lastClientActivity } = streamInfo;
    stats[id] = {
      clients: proxy.clients ? proxy.clients.size : 0,
      isRunning: proxy.isRunning,
      lastActivity: new Date(lastClientActivity).toISOString(),
      uptime: proxy.isRunning && proxy.startTime ? Date.now() - proxy.startTime : 0
    };
  }
  res.json(stats);
});

// Per forzare la chiusura di uno stream specifico
function closeStream(id) {
  if (proxies[id]) {
    console.log(`Chiusura forzata stream: ${id}`);
    proxies[id].proxy.destroy();
    delete proxies[id];
  }
}

// Per riavviare uno stream specifico
function restartStream(id) {
  if (proxies[id]) {
    console.log(`Riavvio forzato stream: ${id}`);
    proxies[id].proxy.stopStream();
    setTimeout(() => {
      proxies[id].proxy.startStream();
    }, 1000);
  }
}

// Statistiche degli stream
function getStreamStats() {
  const stats = {};
  for (const [id, streamInfo] of Object.entries(proxies)) {
    const { proxy, lastClientActivity } = streamInfo;
    stats[id] = {
      clients: proxy.clients.size,
      isRunning: proxy.isRunning,
      lastActivity: new Date(lastClientActivity).toISOString(),
      uptime: proxy.isRunning ? Date.now() - proxy.startTime : 0
    };
  }
  return stats;
}
  