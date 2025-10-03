const http = require("http");
const https = require("https");
const url = require("url");
const { spawn } = require("child_process");

class ProxyStream {
  constructor(deviceUrl) {
    this.deviceUrl = deviceUrl;
    this.clients = new Set(); // Usiamo Set per performance
    this.boundary = null;
    this.isRunning = false;
    this.ffmpegProcess = null;
    this.httpRequest = null;
    this.reconnectTimeout = null;
    
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
      } else if (attempts < 10) { // 10 tentativi da 500ms = 5 secondi
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

    // Ferma FFmpeg
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    // Ferma richiesta HTTP
    if (this.httpRequest) {
      this.httpRequest.destroy();
      this.httpRequest = null;
    }

    console.log(`Stream ${this.deviceUrl} fermato`);
  }

  // 🔹 Gestione RTSP con ffmpeg migliorata
  startRtspStream() {
    if (!this.isRunning) return;

    console.log(`Avvio stream RTSP: ${this.deviceUrl}`);
    this.boundary = "--frame";

    try {
      this.ffmpegProcess = spawn("ffmpeg", [
        "-i", this.deviceUrl,
        "-vf", "scale=1050:600:force_original_aspect_ratio=decrease",
        "-pix_fmt", "yuvj422p",
        "-f", "mjpeg",
        "-q:v", "5",
        "-r", "5",
        "-an",
        "pipe:1"
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let buffer = Buffer.alloc(0);
      let frameCount = 0;
      const maxBufferSize = 10 * 1024 * 1024; // 10MB max

      this.ffmpegProcess.stdout.on("data", (chunk) => {
        if (!this.isRunning) return;
        
        buffer = Buffer.concat([buffer, chunk]);

        // Prevenire memory leak per buffer troppo grandi
        if (buffer.length > maxBufferSize) {
          console.warn("Buffer troppo grande, reset");
          buffer = Buffer.alloc(0);
          return;
        }

        // Separazione frame JPEG
        let start, end;
        while ((start = buffer.indexOf(Buffer.from([0xff, 0xd8]))) !== -1 &&
               (end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start)) !== -1) {
          
          const frame = buffer.slice(start, end + 2);
          buffer = buffer.slice(end + 2);
          frameCount++;

          // Invia solo se ci sono client connessi
          if (this.clients.size > 0) {
            this.clients.forEach(client => {
              if (!client.destroyed && !client.finished) {
                try {
                  client.write(`${this.boundary}\r\n`);
                  client.write("Content-Type: image/jpeg\r\n");
                  client.write(`Content-Length: ${frame.length}\r\n\r\n`);
                  client.write(frame);
                  client.write("\r\n");
                } catch (err) {
                  console.warn("Errore scrittura client, rimuovo");
                  this.clients.delete(client);
                }
              } else {
                this.clients.delete(client);
              }
            });
          }

          // Pulizia client morti
          this.cleanupDeadClients();
        }
      });

      this.ffmpegProcess.stderr.on("data", (data) => {
        if (this.isRunning) {
          const message = data.toString();
          // Log solo errori importanti
          if (message.includes("error") || message.includes("Error") || 
              message.includes("failed") || message.includes("Unable")) {
            console.error("FFmpeg error:", message);
          }
        }
      });

      this.ffmpegProcess.on("close", (code) => {
        if (this.ffmpegProcess) {
          console.log(`FFmpeg terminato con codice ${code}`);
          this.ffmpegProcess = null;
        }

        // Riavvia solo se necessario e se ci sono client
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
      });

      this.ffmpegProcess.on("error", (err) => {
        console.error("Errore spawn FFmpeg:", err);
      });

    } catch (error) {
      console.error("Errore avvio FFmpeg:", error);
      this.stopStream();
    }
  }

  // 🔹 Gestione HTTP/MJPEG migliorata
  startHttpStream() {
    if (!this.isRunning) return;

    const parsed = url.parse(this.deviceUrl);
    const lib = parsed.protocol === "https:" ? https : http;

    const connect = () => {
      if (!this.isRunning) return;

      console.log(`Connettendo a ${this.deviceUrl}...`);
      
      try {
        this.httpRequest = lib.get(this.deviceUrl, (res) => {
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

          let buffer = Buffer.alloc(0);
          const boundaryBuffer = Buffer.from(this.boundary || "--frame");

          res.on("data", chunk => {
            if (!this.isRunning) return;
            
            buffer = Buffer.concat([buffer, chunk]);

            let boundaryIndex;
            while ((boundaryIndex = buffer.indexOf(boundaryBuffer)) !== -1) {
              const part = buffer.slice(0, boundaryIndex);
              buffer = buffer.slice(boundaryIndex + boundaryBuffer.length);

              if (part.length > 0) {
                const headerEnd = part.indexOf("\r\n\r\n");
                if (headerEnd !== -1) {
                  const jpegData = part.slice(headerEnd + 4);
                  if (jpegData.length > 0 && this.clients.size > 0) {
                    this.clients.forEach(client => {
                      if (!client.destroyed && !client.finished) {
                        try {
                          client.write(`${this.boundary}\r\n`);
                          client.write("Content-Type: image/jpeg\r\n");
                          client.write(`Content-Length: ${jpegData.length}\r\n\r\n`);
                          client.write(jpegData);
                          client.write("\r\n");
                        } catch (err) {
                          this.clients.delete(client);
                        }
                      } else {
                        this.clients.delete(client);
                      }
                    });
                    
                    this.cleanupDeadClients();
                  }
                }
              }
            }
          });

          res.on("end", () => {
            if (this.isRunning) {
              console.log(`Stream HTTP terminato, riconnessione...`);
              this.reconnectTimeout = setTimeout(connect, 2000);
            }
          });

          res.on("error", (err) => {
            if (this.isRunning) {
              console.error(`Errore risposta HTTP: ${err.message}`);
              this.reconnectTimeout = setTimeout(connect, 5000);
            }
          });
        });

        this.httpRequest.on("error", (err) => {
          if (this.isRunning) {
            console.error(`Errore connessione HTTP: ${err.message}`);
            this.reconnectTimeout = setTimeout(connect, 5000);
          }
        });

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

  cleanupDeadClients() {
    this.clients.forEach(client => {
      if (client.destroyed || client.finished || client.writableEnded) {
        this.clients.delete(client);
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
      }
    });
    this.clients.clear();
    
    console.log(`ProxyStream per ${this.deviceUrl} distrutto`);
  }
}

module.exports = ProxyStream;