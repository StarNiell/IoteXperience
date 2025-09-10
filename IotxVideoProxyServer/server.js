const express = require('express');
const cors = require('cors'); 
const fs = require('fs');
const ProxyStream = require('./proxyManager');
const CryptoUtil = require('./cryptoutil');

const app = express();
const port = 3002;

//const deviceMap = JSON.parse(fs.readFileSync('./devices.json', 'utf-8'));
app.use(express.json()); // Per gestire JSON nel body delle richieste
app.use(cors());
let deviceMap = {};

const proxies = {};

// Endpoint per aggiornare la configurazione dei device
app.post('/config', (req, res) => {
  let tokenValid = req.body.tokenValid;

  if (CryptoUtil.isTokenValid(tokenValid) === false) {
    console.log('Configurazione in entrata con token non valido:', tokenValid);
    return res.status(403).json({ error: 'Token non valido' });
  } 
  deviceMap = req.body.streams; // Aggiorna la mappa dei device

  console.log('Configurazione in entrata con token valido:', tokenValid);
  console.log('Lista Streams:', deviceMap);

  // Rimuovi vecchi proxy
  for (const id in proxies) {
    if (!deviceMap[id]) {
      proxies[id].close && proxies[id].close(); // Chiudi eventuali stream/proxy
      delete proxies[id];
    }
  }

  
  // Aggiungi nuovi proxy
  for (const [id, url] of Object.entries(deviceMap)) {
    if (!proxies[id]) {
      proxies[id] = new ProxyStream(url);

      app.get(`/stream/${id}`, (req, res) => {

        const token = req.query.token; // <--- recupero parametro dalla query string
        console.log(`Impostazione stream per ${id} da ${url} con token ${token}`);
        // Se non c’è il token
        if (!token) {
          return res.status(401).send("Token mancante");
        }
        
        // Validazione token (esempio usando CryptoUtil che avevi fatto prima)
        if (!CryptoUtil.isTokenValid(token)) {
          return res.status(403).send("Token non valido");
        }

        proxies[id].addClient(res);
      });
    }
  }

  res.json({ success: true, devices: Object.keys(deviceMap) });
});


app.get('/streams', (req, res) => {
  res.send(`<h2>Stream disponibili:</h2>
    <ul>${Object.keys(proxies).map(id => `<li>${id}</li>`).join('')}</ul>`);
});

app.listen(port, () => {
  console.log(`Video proxy server in ascolto su http://localhost:${port}`);
});