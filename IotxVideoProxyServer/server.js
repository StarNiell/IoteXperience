const express = require('express');
const cors = require('cors'); 
const fs = require('fs');
const ProxyStream = require('./proxyManager');
const CryptoUtil = require('./cryptoutil');
const config = require('./config');

const app = express();
const port = 3002;

//const deviceMap = JSON.parse(fs.readFileSync('./devices.json', 'utf-8'));
app.use(express.json()); // Per gestire JSON nel body delle richieste
app.use(cors());
let deviceMap = {};
let deviceFixed = config.fixedStreams;

const proxies = {};

// Endpoint per aggiornare la configurazione dei device
app.post('/config', (req, res) => {
  let tokenValid = req.body.tokenValid;

  if (CryptoUtil.isTokenValid(tokenValid) === false) {
    console.log('Configurazione in entrata con token non valido:', tokenValid);
    return res.status(403).json({ error: 'Token non valido' });
  } 
  let configMap = req.body.streams; // Aggiorna la mappa dei device
  //deviceMap = configMap;

  console.log('Configurazione in entrata con token valido:', tokenValid);

  if (deviceMap)
  {
    // Rimuovi vecchi proxy
    for (const id in proxies) {
      if (!deviceMap[id]) {
        proxies[id].close && proxies[id].close(); // Chiudi eventuali stream/proxy
        delete proxies[id];
      }
    }
  }

  deviceMap = { ...configMap, ...deviceFixed };
  console.log('Lista Streams:', deviceMap);
  
  // Aggiungi nuovi proxy
  addStreams();

  res.json({ success: true, devices: Object.keys(configMap) });
});


app.get('/streams', (req, res) => {
  res.send(`<h2>Stream disponibili:</h2>
    <ul>${Object.keys(proxies).map(id => `<li>${id}</li>`).join('')}</ul>`);
});

app.listen(port, () => {
  console.log(`Video proxy server in ascolto su http://localhost:${port}`);
  deviceMap = deviceFixed; 
  console.log('Lista Fixed Streams:', deviceMap);
  addStreams();
  startOptimizedCleanup();
});

function addStreams() {
  // Aggiungi nuovi proxy
  for (const [id, url] of Object.entries(deviceMap)) {
    if (!proxies[id]) {
      proxies[id] = new ProxyStream(url);

      app.get(`/stream/${id}`, (req, res) => {
        const token = req.query.token;
        const trusted = req.query.trusted;
        
        console.log(`Richiesta stream per ${id} da ${url} con token ${token} o trusted ${trusted}`);
        
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

        // Aggiungi il client allo stream
        proxies[id].addClient(res);
      });
    }
  }
}

// Cleanup automatico degli stream inattivi
function startCleanupInterval() {
  setInterval(() => {
    for (const [id, proxy] of Object.entries(proxies)) {
      // Se non ci sono client connessi da più di 1 minuto, distruggi il proxy
      if (proxy.clients.size === 0 && proxy.isRunning) {
        console.log(`Nessun client per stream ${id}, verifico se fermare...`);
        
        // Opzione 1: Ferma immediatamente lo stream ma mantieni il proxy
        proxy.stopStream();
        
        // Opzione 2: Se vuoi eliminare completamente il proxy dopo più tempo:
        // if (Date.now() - proxy.lastActivity > 300000) { // 5 minuti
        //   console.log(`Eliminazione proxy inattivo: ${id}`);
        //   proxy.destroy();
        //   delete proxies[id];
        // }
      }
    }
  }, 60000); // Controlla ogni minuto
}

// Avvia il cleanup
startCleanupInterval();

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('Chiusura graceful di tutti gli stream...');
  for (const [id, proxy] of Object.entries(proxies)) {
    proxy.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Terminazione di tutti gli stream...');
  for (const [id, proxy] of Object.entries(proxies)) {
    proxy.destroy();
  }
  process.exit(0);
});