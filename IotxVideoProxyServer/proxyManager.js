const http = require("http");
const https = require("https");
const url = require("url");
const { spawn } = require("child_process");

class ProxyStream {
  constructor(deviceUrl) {
    this.deviceUrl = deviceUrl;
    this.clients = [];
    this.boundary = null; // per HTTP sarà rilevato, per RTSP fisso
    this.startStream();
  }

  addClient(res) {
    // Se il boundary non è pronto per HTTP
    if (!this.boundary && this.deviceUrl.startsWith("http")) {
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("Stream non ancora pronto, riprova tra pochi secondi...");
      return;
    }

    res.writeHead(200, {
      "Content-Type": `multipart/x-mixed-replace; boundary=${this.boundary || "--frame"}`,
      "Cache-Control": "no-cache",
      "Connection": "close",
      "Pragma": "no-cache",
    });

    this.clients.push(res);

    res.on("close", () => {
      this.clients = this.clients.filter(c => c !== res);
    });
  }

  startStream() {
    if (this.deviceUrl.startsWith("rtsp://")) {
      this.startRtspStream();
    } else {
      this.startHttpStream();
    }
  }

  // 🔹 Gestione RTSP con ffmpeg
  startRtspStream() {
    console.log(process.env.PATH);
    console.log(`Connettendo a stream RTSP: ${this.deviceUrl}`);
    this.boundary = "--frame";

    const ffmpeg = spawn("ffmpeg", [
      "-i", this.deviceUrl, // input RTSP
      "-f", "mjpeg",        // output in MJPEG
      "-q:v", "5",          // qualità JPEG (1=alta, 31=bassa)
      "-r", "5",            // frame rate
      "-an",                // disabilita audio
      "pipe:1"              // output su stdout
    ]);

    let buffer = Buffer.alloc(0);

    ffmpeg.stdout.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      // separa i frame JPEG (0xFFD8...0xFFD9)
      let start, end;
      while ((start = buffer.indexOf(Buffer.from([0xff, 0xd8]))) !== -1 &&
             (end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start)) !== -1) {
        const frame = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);

        this.clients.forEach(c => {
          c.write(`${this.boundary}\r\n`);
          c.write("Content-Type: image/jpeg\r\n");
          c.write(`Content-Length: ${frame.length}\r\n\r\n`);
          c.write(frame);
          c.write("\r\n");
        });
      }
    });

    ffmpeg.stderr.on("data", (data) => {
      // utile per debug
      // console.log("ffmpeg:", data.toString());
    });

    ffmpeg.on("close", (code) => {
      console.log(`ffmpeg terminato con codice ${code}, riavvio tra 5s...`);
      setTimeout(() => this.startRtspStream(), 5000);
    });
  }

  // 🔹 Gestione HTTP/MJPEG (codice originale adattato)
  startHttpStream() {
    const parsed = url.parse(this.deviceUrl);
    const lib = parsed.protocol === "https:" ? https : http;

    const connect = () => {
      console.log(`Connettendo a ${this.deviceUrl}...`);
      const request = lib.get(this.deviceUrl, (res) => {
        if (!this.boundary && res.headers["content-type"]) {
          const ct = res.headers["content-type"];
          const match = ct.match(/boundary=([^\s;]+)/i);
          if (match) {
            this.boundary = match[1].startsWith("--") ? match[1] : "--" + match[1];
            console.log(`Boundary rilevato automaticamente: ${this.boundary}`);
          } else {
            console.warn("Impossibile rilevare il boundary dagli header!");
            this.boundary = "--frame";
          }
        }

        let buffer = Buffer.alloc(0);
        const boundaryBuffer = Buffer.from(this.boundary || "--frame");

        res.on("data", chunk => {
          buffer = Buffer.concat([buffer, chunk]);

          let boundaryIndex;
          while ((boundaryIndex = buffer.indexOf(boundaryBuffer)) !== -1) {
            const part = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + boundaryBuffer.length);

            if (part.length > 0) {
              const headerEnd = part.indexOf("\r\n\r\n");
              if (headerEnd !== -1) {
                const jpegData = part.slice(headerEnd + 4);
                if (jpegData.length > 0) {
                  this.clients.forEach(c => {
                    c.write(`${this.boundary}\r\n`);
                    c.write("Content-Type: image/jpeg\r\n");
                    c.write(`Content-Length: ${jpegData.length}\r\n\r\n`);
                    c.write(jpegData);
                    c.write("\r\n");
                  });
                }
              }
            }
          }
        });

        res.on("end", () => {
          console.log(`Stream terminato da ${this.deviceUrl}. Riconnessione...`);
          setTimeout(connect, 2000);
        });
      });

      request.on("error", (err) => {
        console.error(`Errore di connessione a ${this.deviceUrl}: ${err.message}`);
        setTimeout(connect, 5000);
      });
    };

    connect();
  }
}

module.exports = ProxyStream;