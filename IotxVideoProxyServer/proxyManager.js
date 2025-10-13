const http = require("http");
const https = require("https");
const url = require("url");
const { spawn } = require("child_process");


class ProxyStream {
  constructor(deviceUrl) {
    this.deviceUrl = deviceUrl;
    this.clients = new Set();
    this.boundary = null;
    this.isRunning = false;
    this.ffmpegProcess = null;
    this.httpRequest = null;
    this.reconnectTimeout = null;
    this.buffer = Buffer.alloc(0);
    this.maxBufferSize = 2 * 1024 * 1024; // 2MB max
    
    // Binding per mantenere il contesto
    this._onFfmpegData = this._onFfmpegData.bind(this);
    this._onFfmpegClose = this._onFfmpegClose.bind(this);
    this._onFfmpegError = this._onFfmpegError.bind(this);
    this._onHttpData = this._onHttpData.bind(this);
    this._onHttpEnd = this._onHttpEnd.bind(this);
    this._onHttpError = this._onHttpError.bind(this);
    
    this.startStream();
  }

  addClient(res) {
    const waitForBoundary = (attempts = 0) => {
      if (this.boundary || !this.deviceUrl.startsWith("http")) {
        res.writeHead(200, {
          "Content-Type": `multipart/x-mixed-replace; boundary=${this.boundary || "--frame"}`,
          "Cache-Control": "no-cache",
          "Connection": "close",
          "Pragma": "no-cache",
        });

        this.clients.add(res);

        const cleanup = () => {
          this.clients.delete(res);
          // Cleanup memoria
          res.removeAllListeners();
          if (this.clients.size === 0) {
            setTimeout(() => {
              if (this.clients.size === 0) {
                this.stopStream();
              }
            }, 30000);
          }
        };

        res.on("close", cleanup);
        res.on("end", cleanup);
        res.on("error", cleanup);
      } else if (attempts < 10) {
        setTimeout(() => waitForBoundary(attempts + 1), 500);
      } else {
        res.writeHead(503, { "Content-Type": "text/plain" });
        res.end("Stream non ancora pronto, riprova tra pochi secondi...");
      }
    };

    waitForBoundary();
  }

  startStream() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.buffer = Buffer.alloc(0); // Reset buffer
    
    if (this.deviceUrl.startsWith("rtsp://")) {
      this.startRtspStream();
    } else {
      this.startHttpStream();
    }
  }

  stopStream() {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Cleanup timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Ferma FFmpeg e rimuovi listener
    if (this.ffmpegProcess) {
      this.ffmpegProcess.stdout?.removeListener("data", this._onFfmpegData);
      this.ffmpegProcess.stderr?.removeListener("data", this._onFfmpegData);
      this.ffmpegProcess.removeListener("close", this._onFfmpegClose);
      this.ffmpegProcess.removeListener("error", this._onFfmpegError);
      
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    // Ferma richiesta HTTP e rimuovi listener
    if (this.httpRequest) {
      this.httpRequest.removeListener("error", this._onHttpError);
      this.httpRequest.destroy();
      this.httpRequest = null;
    }

    // Libera memoria del buffer
    this.buffer = Buffer.alloc(0);

    if (this.httpResponse) {
      this.httpResponse.removeAllListeners();
      this.httpResponse.destroy && this.httpResponse.destroy();
      this.httpResponse = null;
    }
      
    console.log(`Stream ${this.deviceUrl} fermato`);
  }

  // 🔹 Gestione RTSP con ffmpeg - MEMORY SAFE
  startRtspStream() {
    if (!this.isRunning) return;

    console.log(`Avvio stream RTSP: ${this.deviceUrl}`);
    this.boundary = "--frame";

    /*
        "-vf", "scale=1050:600",
        "-pix_fmt", "yuvj422p",
    */
    try {
      this.ffmpegProcess = spawn("ffmpeg", [
        "-i", this.deviceUrl,
        "-f", "mjpeg",
        "-q:v", "5",
        "-r", "5",
        "-an",
        "pipe:1"
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.ffmpegProcess.stdout.on("data", this._onFfmpegData);
      this.ffmpegProcess.stderr.on("data", (data) => {
        // Log solo errori importanti per ridurre memory allocation
        if (this.isRunning) {
          const message = data.toString();
          if (message.includes("error") || message.includes("Error") || 
              message.includes("failed") || message.includes("Unable")) {
            console.error("FFmpeg error:", message.substring(0, 200)); // Limita lunghezza
          }
        }
      });

      this.ffmpegProcess.on("close", this._onFfmpegClose);
      this.ffmpegProcess.on("error", this._onFfmpegError);

    } catch (error) {
      console.error("Errore avvio FFmpeg:", error);
      this.stopStream();
    }
  }

  // Handler per dati FFmpeg - OTTIMIZZATO
  _onFfmpegData(chunk) {
    if (!this.isRunning) return;
    
    // Prevenire memory leak per buffer troppo grandi
    if (this.buffer.length + chunk.length > this.maxBufferSize) {
      console.warn("Buffer troppo grande, reset");
      this.buffer = Buffer.alloc(0);
      return;
    }
    
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Separazione frame JPEG con gestione memoria efficiente
    let start, end;
    while ((start = this.buffer.indexOf(Buffer.from([0xff, 0xd8]))) !== -1 &&
           (end = this.buffer.indexOf(Buffer.from([0xff, 0xd9]), start)) !== -1) {
      
      const frame = this.buffer.slice(start, end + 2);
      this.buffer = this.buffer.slice(end + 2);

      // Invia solo se ci sono client connessi
      if (this.clients.size > 0) {
        this._broadcastToClients(frame);
      }

      // Pulizia periodica client morti
      if (Math.random() < 0.1) { // 10% di probabilità per ridurre CPU
        this.cleanupDeadClients();
      }
    }
  }

  // Handler chiusura FFmpeg
  _onFfmpegClose(code) {
    if (this.ffmpegProcess) {
      console.log(`FFmpeg terminato con codice ${code}`);
      this.ffmpegProcess = null;
    }

    // Riavvia solo se necessario
    if (this.isRunning && this.clients.size > 0) {
      console.log("Riavvio FFmpeg in 3 secondi...");
      this.reconnectTimeout = setTimeout(() => {
        if (this.isRunning && this.clients.size > 0) {
          this.startRtspStream();
        }
      }, 3000);
    } else {
      this.isRunning = false;
    }
  }

  // Handler errori FFmpeg
  _onFfmpegError(err) {
    console.error("Errore FFmpeg:", err.message);
  }

  // 🔹 Gestione HTTP/MJPEG - MEMORY SAFE
  startHttpStream() {
    if (!this.isRunning) return;

    const parsed = url.parse(this.deviceUrl);
    const lib = parsed.protocol === "https:" ? https : http;


    const connect = () => {
      if (!this.isRunning) return;

      console.log(`Connettendo a ${this.deviceUrl}...`);
      
      try {
        this.httpRequest = lib.get(this.deviceUrl, (res) => {
          this.httpResponse = res;
          if (!this.boundary && res.headers["content-type"]) {
            const ct = res.headers["content-type"];
            const match = ct.match(/boundary=([^\s;]+)/i);
            if (match) {
              this.boundary = match[1].startsWith("--") ? match[1] : "--" + match[1];
              console.log(`Boundary rilevato: ${this.boundary}`);
            } else {
              this.boundary = "--frame";
            }
          }

          this.buffer = Buffer.alloc(0); // Reset buffer
          const boundaryBuffer = Buffer.from(this.boundary || "--frame");

          res.on("data", this._onHttpData);
          res.on("end", this._onHttpEnd);
          res.on("error", this._onHttpError);

        });

        this.httpRequest.on("error", this._onHttpError);
        this.httpRequest.on("close", () => {
          if (this.isRunning && this.clients.size > 0) {
            this.reconnectTimeout = setTimeout(connect, 2000);
          }
        });

      } catch (error) {
        console.error("Errore connessione HTTP:", error);
        if (this.isRunning) {
          this.reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();
  }

  // Handler dati HTTP
  _onHttpData(chunk) {
    if (!this.isRunning) return;
    
    // Limita dimensione buffer
    if (this.buffer.length + chunk.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(chunk.length); // Rimuovi dati vecchi
    }
    
    this.buffer = Buffer.concat([this.buffer, chunk]);

    const boundaryBuffer = Buffer.from(this.boundary || "--frame");
    let boundaryIndex;

    while ((boundaryIndex = this.buffer.indexOf(boundaryBuffer)) !== -1) {
      const part = this.buffer.slice(0, boundaryIndex);
      this.buffer = this.buffer.slice(boundaryIndex + boundaryBuffer.length);

      if (part.length > 0) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd !== -1) {
          const jpegData = part.slice(headerEnd + 4);
          if (jpegData.length > 0 && this.clients.size > 0) {
            this._broadcastToClients(jpegData);
          }
        }
      }
      // Pulizia periodica client morti
      if (Math.random() < 0.1) { // 10% di probabilità per ridurre CPU
        this.cleanupDeadClients();
      }
    }
  }

  // Handler fine HTTP
  _onHttpEnd() {
    if (this.isRunning) {
      console.log(`Stream HTTP terminato, riconnessione...`);
      this.reconnectTimeout = setTimeout(() => {
        if (this.isRunning) this.startHttpStream();
      }, 2000);
    }
  }

  // Handler errori HTTP
  _onHttpError(err) {
    if (this.isRunning) {
      console.error(`Errore HTTP: ${err.message}`);
      this.reconnectTimeout = setTimeout(() => {
        if (this.isRunning) this.startHttpStream();
      }, 5000);
    }
  }

  // 🔹 Broadcast ottimizzato ai client
  _broadcastToClients(frameData) {
    this.clients.forEach(client => {
      if (!client.destroyed && !client.finished && client.writable) {
        try {
          client.write(`${this.boundary}\r\n`);
          client.write("Content-Type: image/jpeg\r\n");
          client.write(`Content-Length: ${frameData.length}\r\n\r\n`);
          client.write(frameData);
          client.write("\r\n");
        } catch (err) {
          // Client problematico, rimuovi
          this.clients.delete(client);
          client.destroy();
        }
      } else {
        // Client morto, rimuovi
        this.clients.delete(client);
      }
    });
  }

  cleanupDeadClients() {
    this.clients.forEach(client => {
      if (client.destroyed || client.finished || client.writableEnded || !client.writable) {
        this.clients.delete(client);
        client.destroy();
        console.log("Rimosso client morto, totale client:", this.clients.size);
      }
    });
  }

  // Metodo per cleanup completo
  destroy() {
    this.stopStream();
    
    // Chiudi tutti i client
    this.clients.forEach(client => {
      if (!client.destroyed) {
        client.end();
        client.destroy();
      }
    });
    this.clients.clear();
    
    // Libera memoria
    this.buffer = Buffer.alloc(0);
    
    // Rimuovi riferimenti
    this._onFfmpegData = null;
    this._onFfmpegClose = null;
    this._onFfmpegError = null;
    this._onHttpData = null;
    this._onHttpEnd = null;
    this._onHttpError = null;
    
    console.log(`ProxyStream per ${this.deviceUrl} distrutto completamente`);
  }
}

module.exports = ProxyStream;