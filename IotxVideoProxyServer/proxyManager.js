const http = require("http");
const https = require("https");
const url = require("url");
const { spawn } = require("child_process");

// 🔥 TIMESTAMP ANCHE PER PROXYSTREAM
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const getTimestamp = () => new Date().toISOString();

console.log = (...args) => {
  originalConsoleLog(`[${getTimestamp()}] ℹ️`, ...args);
};

console.error = (...args) => {
  originalConsoleError(`[${getTimestamp()}] ❌`, ...args);
};

console.warn = (...args) => {
  originalConsoleWarn(`[${getTimestamp()}] ⚠️`, ...args);
};

class ProxyStream {
  constructor(deviceUrl) {
    this.deviceUrl = deviceUrl;
    this.clients = new Set();
    this.boundary = null;
    this.isRunning = false;
    this.ffmpegProcess = null;
    this.httpRequest = null;
    this.reconnectTimeout = null;
    this.buffer = null;
    this.maxBufferSize = 1 * 1024 * 1024; // Ridotto a 1MB
    
    // Stats per debug
    this.stats = {
      framesProcessed: 0,
      clientsServed: 0,
      memoryUsage: 0
    };
    
    this.startStream();
  }

  addClient(res) {
    const waitForBoundary = (attempts = 0) => {
      if (this.boundary || !this.deviceUrl.startsWith("http")) {
        // Imposta headers senza mantenere riferimento alla response
        const headers = {
          "Content-Type": `multipart/x-mixed-replace; boundary=${this.boundary || "--frame"}`,
          "Cache-Control": "no-cache",
          "Connection": "close",
          "Pragma": "no-cache",
        };
        
        try {
          res.writeHead(200, headers);
        } catch (err) {
          return; // Client già chiuso
        }

        this.clients.add(res);
        this.stats.clientsServed++;

        const cleanup = () => {
          if (this.clients.has(res)) {
            this.clients.delete(res);
            // Forza garbage collection del client
            res.removeAllListeners();
            res.destroy();
          }
          
          if (this.clients.size === 0) {
            setTimeout(() => {
              if (this.clients.size === 0) {
                this.stopStream();
              }
            }, 10000); // Ridotto a 10 secondi
          }
        };

        // Usa once invece di on per evitare listener duplicati
        res.once("close", cleanup);
        res.once("end", cleanup);
        res.once("error", cleanup);
      } else if (attempts < 8) { // Ridotti i tentativi
        setTimeout(() => waitForBoundary(attempts + 1), 300);
      } else {
        try {
          res.writeHead(503, { "Content-Type": "text/plain" });
          res.end("Stream non pronto");
        } catch (err) {
          // Ignora errori su client già chiusi
        }
      }
    };

    waitForBoundary();
  }

  startStream() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.buffer = Buffer.alloc(0);
    
    if (this.deviceUrl.startsWith("rtsp://")) {
      this.startRtspStream();
    } else {
      this.startHttpStream();
    }
  }

  stopStream() {
    if (!this.isRunning) return;
    
    this.isRunning = false;

    // Cleanup aggressivo
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // FFmpeg cleanup
    if (this.ffmpegProcess) {
      this.cleanupFfmpeg();
    }

    // HTTP cleanup
    if (this.httpRequest) {
      this.cleanupHttp();
    }

    // Buffer cleanup
    this.buffer = null;
    
    console.log(`Stream ${this.deviceUrl} fermato. Stats:`, this.stats);
  }

  cleanupFfmpeg() {
    if (this.ffmpegProcess) {
      // Rimuovi tutti i listener
      this.ffmpegProcess.stdout?.removeAllListeners();
      this.ffmpegProcess.stderr?.removeAllListeners();
      this.ffmpegProcess.removeAllListeners();
      
      // Uccidi il processo
      this.ffmpegProcess.kill('SIGKILL'); // Più aggressivo
      this.ffmpegProcess = null;
      
      // Forza garbage collection
      if (global.gc) {
        setImmediate(() => global.gc());
      }
    }
  }

  cleanupHttp() {
    if (this.httpRequest) {
      this.httpRequest.removeAllListeners();
      this.httpRequest.destroy();
      this.httpRequest = null;
    }
  }

  startRtspStream() {
    if (!this.isRunning) return;

    console.log(`Avvio stream RTSP: ${this.deviceUrl}`);
    this.boundary = "--frame";

    try {
      this.ffmpegProcess = spawn("ffmpeg", [
        "-i", this.deviceUrl,
        "-vf", "scale=800:450", // Ridotta risoluzione per meno memoria
        "-f", "mjpeg",
        "-q:v", "8", // Qualità più bassa
        "-r", "3",   // Frame rate più basso
        "-an",
        "-fflags", "nobuffer",
        "-flags", "low_delay",
        "-max_delay", "0",
        "pipe:1"
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let buffer = Buffer.alloc(0);
      const frameHeader = Buffer.from([0xff, 0xd8]);
      const frameFooter = Buffer.from([0xff, 0xd9]);

      const onData = (chunk) => {
        if (!this.isRunning) return;
        
        // Gestione memoria più conservativa
        if (buffer.length + chunk.length > this.maxBufferSize) {
          buffer = buffer.slice(buffer.length - 100000); // Mantieni solo gli ultimi 100KB
        }
        
        buffer = Buffer.concat([buffer, chunk], Math.min(buffer.length + chunk.length, this.maxBufferSize));

        let start = buffer.indexOf(frameHeader);
        let end = -1;
        
        while (start !== -1) {
          end = buffer.indexOf(frameFooter, start);
          if (end !== -1) {
            const frame = buffer.slice(start, end + 2);
            buffer = buffer.slice(end + 2);
            
            this.stats.framesProcessed++;
            
            if (this.clients.size > 0) {
              this.broadcastFrame(frame);
            }
            
            start = buffer.indexOf(frameHeader);
          } else {
            break;
          }
        }
        
        // Cleanup memoria ogni 100 frame
        if (this.stats.framesProcessed % 100 === 0) {
          this.cleanupDeadClients();
        }
      };

      const onClose = (code) => {
        if (this.ffmpegProcess) {
          this.ffmpegProcess.stdout?.removeListener("data", onData);
          this.ffmpegProcess.stderr?.removeAllListeners();
          this.ffmpegProcess.removeListener("close", onClose);
          this.ffmpegProcess.removeListener("error", onClose);
          this.ffmpegProcess = null;
        }

        buffer = null;
        
        if (this.isRunning && this.clients.size > 0) {
          this.reconnectTimeout = setTimeout(() => {
            if (this.isRunning && this.clients.size > 0) {
              this.startRtspStream();
            }
          }, 2000);
        }
      };

      this.ffmpegProcess.stdout.on("data", onData);
      this.ffmpegProcess.stderr.on("data", () => {}); // Ignora stderr
      this.ffmpegProcess.on("close", onClose);
      this.ffmpegProcess.on("error", onClose);

    } catch (error) {
      console.error("Errore avvio FFmpeg:", error);
      this.stopStream();
    }
  }

  startHttpStream() {
    if (!this.isRunning) return;

    const parsed = url.parse(this.deviceUrl);
    const lib = parsed.protocol === "https:" ? https : http;

    let buffer = Buffer.alloc(0);
    const boundary = this.boundary = "--frame";
    const boundaryBuffer = Buffer.from(boundary);

    const connect = () => {
      if (!this.isRunning) return;

      try {
        this.httpRequest = lib.get(this.deviceUrl, (res) => {
          const onData = (chunk) => {
            if (!this.isRunning) return;
            
            if (buffer.length + chunk.length > this.maxBufferSize) {
              buffer = buffer.slice(-50000); // Mantieni solo ultimi 50KB
            }
            
            buffer = Buffer.concat([buffer, chunk]);

            let boundaryIndex = buffer.indexOf(boundaryBuffer);
            while (boundaryIndex !== -1) {
              if (boundaryIndex > 0) {
                const frameData = buffer.slice(0, boundaryIndex);
                if (this.clients.size > 0) {
                  this.broadcastFrame(frameData);
                }
              }
              buffer = buffer.slice(boundaryIndex + boundaryBuffer.length);
              boundaryIndex = buffer.indexOf(boundaryBuffer);
            }
          };

          const onEnd = () => {
            res.removeListener("data", onData);
            res.removeListener("end", onEnd);
            res.removeListener("error", onEnd);
            buffer = null;
            
            if (this.isRunning) {
              this.reconnectTimeout = setTimeout(connect, 3000);
            }
          };

          res.on("data", onData);
          res.on("end", onEnd);
          res.on("error", onEnd);
        });

        this.httpRequest.on("error", () => {
          this.httpRequest?.removeAllListeners();
          this.httpRequest = null;
          buffer = null;
          
          if (this.isRunning) {
            this.reconnectTimeout = setTimeout(connect, 5000);
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

  broadcastFrame(frameData) {
    const boundary = this.boundary || "--frame";
    const headers = `${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frameData.length}\r\n\r\n`;
    
    this.clients.forEach(client => {
      if (client.writable && !client.destroyed) {
        try {
          client.write(headers);
          client.write(frameData);
          client.write("\r\n");
        } catch (err) {
          this.clients.delete(client);
          client.destroy();
        }
      } else {
        this.clients.delete(client);
      }
    });
  }

  cleanupDeadClients() {
    const initialSize = this.clients.size;
    this.clients.forEach(client => {
      if (client.destroyed || !client.writable || client.finished) {
        this.clients.delete(client);
        client.removeAllListeners();
        client.destroy();
      }
    });
    
    if (this.clients.size === 0 && initialSize > 0) {
      setTimeout(() => this.stopStream(), 5000);
    }
  }

  destroy() {
    console.log(`Distruzione completa stream: ${this.deviceUrl}`);
    
    this.stopStream();
    
    // Cleanup aggressivo clients
    this.clients.forEach(client => {
      client.removeAllListeners();
      client.destroy();
    });
    this.clients.clear();
    
    // Nullifica tutte le proprietà
    this.buffer = null;
    this.stats = null;
    this.deviceUrl = null;
    
    // Forza garbage collection
    if (global.gc) {
      setImmediate(() => {
        global.gc();
        setTimeout(() => global.gc(), 1000);
      });
    }
  }
}

module.exports = ProxyStream;