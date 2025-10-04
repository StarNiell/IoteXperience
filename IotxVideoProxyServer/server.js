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
const proxies = new Map(); // Usiamo Map invece di oggetto per gestione più efficiente

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
  for (const [id, streamInfo] of proxies.entries()) {
    if (!deviceMap[id]) {
      console.log(`Rimozione stream non più configurato: ${id}`);
      safelyDestroyProxy(id, streamInfo.proxy);
      proxies.delete(id);
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

  try {
    // Crea ProxyStream solo se non esiste
    if (!proxies.has(id)) {
      proxies.set(id, {
        proxy: new ProxyStream(deviceMap[id]),
        lastClientActivity: Date.now(),
        isPermanent: false,
        createdAt: Date.now()
      });
    }

    const streamInfo = proxies.get(id);
    
    // Aggiorna attività
    streamInfo.lastClientActivity = Date.now();

    // Avvia lo stream solo se non è già attivo
    if (!streamInfo.proxy.isRunning) {
      streamInfo.proxy.startStream();
    }

    // Aggiungi il client con gestione errori
    res.on('close', () => {
      // Rimuovi il client quando la connessione viene chiusa
      if (streamInfo.proxy && streamInfo.proxy.removeClient) {
        streamInfo.proxy.removeClient(res);
      }
    });

    streamInfo.proxy.addClient(res);

  } catch (error) {
    console.error(`Errore durante l'aggiunta del client per lo stream ${id}:`, error);
    if (!res.headersSent) {
      res.status(500).send("Errore interno del server");
    }
  }
});

// Elenco stream disponibili
app.get('/streams', (req, res) => {
  res.send(`<h2>Stream disponibili:</h2>
    <ul>${Object.keys(deviceMap).map(id => `<li>${id}</li>`).join('')}</ul>`);
});

// Funzione per distruggere i proxy in modo sicuro
function safelyDestroyProxy(id, proxy) {
  try {
    console.log(`Distruzione sicura del proxy: ${id}`);
    
    // Chiama tutti i metodi di cleanup disponibili
    if (proxy.destroy) {
      proxy.destroy();
    }
    
    if (proxy.stopStream) {
      proxy.stopStream();
    }
    
    if (proxy.removeAllListeners) {
      proxy.removeAllListeners();
    }
    
    if (proxy.cleanup) {
      proxy.cleanup();
    }
    
    // Forza il garbage collection se disponibile
    if (global.gc) {
      global.gc();
    }
    
  } catch (error) {
    console.error(`Errore durante la distruzione del proxy ${id}:`, error);
  }
}

// Cleanup ottimizzato con gestione memoria
function startOptimizedCleanup() {
  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [id, streamInfo] of proxies.entries()) {
      const { proxy, lastClientActivity, isPermanent, createdAt } = streamInfo;
      
      // Condizioni per il cleanup
      const noClients = !proxy.clients || proxy.clients.size === 0;
      const inactiveForLong = now - lastClientActivity > 120000; // 2 minuti
      const tooOld = now - createdAt > 3600000; // 1 ora massimo
      
      if (!isPermanent && ((noClients && inactiveForLong) || tooOld)) {
        console.log(`Fermo stream inattivo o troppo vecchio: ${id}`);
        safelyDestroyProxy(id, proxy);
        proxies.delete(id);
        cleanedCount++;
      }
      
      // Cleanup dei client morti
      if (proxy.cleanupDeadClients) {
        proxy.cleanupDeadClients();
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleanup completato: ${cleanedCount} stream rimossi`);
    }
    
  }, 30000); // Ogni 30 secondi
}

// Endpoint per forzare la chiusura di uno stream specifico
app.post('/stream/:id/close', (req, res) => {
  const { id } = req.params;
  const streamInfo = proxies.get(id);
  
  if (streamInfo) {
    console.log(`Chiusura forzata stream: ${id}`);
    safelyDestroyProxy(id, streamInfo.proxy);
    proxies.delete(id);
    
    // Forza garbage collection se disponibile
    if (global.gc) {
      global.gc();
    }
    
    return res.json({ success: true, message: `Stream ${id} chiuso` });
  }
  res.status(404).json({ error: 'Stream non trovato' });
});

// Endpoint per riavviare uno stream specifico
app.post('/stream/:id/restart', (req, res) => {
  const { id } = req.params;
  const streamInfo = proxies.get(id);
  
  if (streamInfo) {
    console.log(`Riavvio forzato stream: ${id}`);
    
    // Distruggi completamente il vecchio proxy
    safelyDestroyProxy(id, streamInfo.proxy);
    proxies.delete(id);
    
    // Crea un nuovo proxy
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
      } catch (error) {
        console.error(`Errore nel riavvio dello stream ${id}:`, error);
      }
    }, 1000);
    
    return res.json({ success: true, message: `Stream ${id} riavviato` });
  }
  res.status(404).json({ error: 'Stream non trovato' });
});

// Endpoint per statistiche degli stream con info memoria
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

// Avvio server
app.listen(port, () => {
  console.log(`Video proxy server in ascolto su http://localhost:${port}`);
  deviceMap = { ...deviceFixed };
  console.log('Lista Fixed Streams:', deviceMap);
  startOptimizedCleanup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Ricevuto SIGTERM, cleanup degli stream...');
  for (const [id, streamInfo] of proxies.entries()) {
    safelyDestroyProxy(id, streamInfo.proxy);
  }
  proxies.clear();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Ricevuto SIGINT, cleanup degli stream...');
  for (const [id, streamInfo] of proxies.entries()) {
    safelyDestroyProxy(id, streamInfo.proxy);
  }
  proxies.clear();
  process.exit(0);
});
