const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Carica configurazione
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

// Reads KEY=value lines from .env (if present) without overwriting variables already set
// (e.g. by PM2). Kept dependency-free on purpose.
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return true;
}
loadEnvFile(path.resolve(".env"));

// Key for IotxVideoProxyServer (same value as TRUSTED_KEY there), sent as an HTTP header
const trustedKey = (process.env.TRUSTED_KEY || "").trim();
if (!trustedKey) {
  console.warn("TRUSTED_KEY not set: the video proxy will refuse the stream");
}

const url = config.cameraUrl;
const baseDir = path.resolve(config.outputDir);
const segmentTime = config.segmentTime || 3600; // default 1h
const fileNamePattern = config.fileNamePattern || "%Y-%m-%d/%H-%M.mp4";

let currentDay = "";

// Funzione per garantire la cartella del giorno
function ensureDailyFolder() {
  const now = new Date();
  const folderName = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const fullPath = path.join(baseDir, folderName);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log("Creata cartella:", fullPath);
  }

  return folderName;
}

// Avvio ffmpeg
function startRecording() {
  currentDay = ensureDailyFolder();

  const drawText = `drawtext=text='%{localtime}':x=10:y=10:fontsize=${config.fontSize}:fontcolor=${config.fontColor}:box=1:boxcolor=${config.boxColor}`;

  // The key goes in an HTTP header, not in the URL (it would end up in logs)
  const inputOptions = (trustedKey && /^https?:/i.test(url))
    ? ["-headers", `X-Iotx-Trusted-Key: ${trustedKey}\r\n`]
    : [];

  const ffmpeg = spawn("ffmpeg", [
    ...inputOptions,
    "-i", url,
    "-vf", drawText,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "25",
    "-f", "segment",
    "-strftime", "1",
    "-segment_time", String(segmentTime),
    path.join(baseDir, fileNamePattern)
  ]);

  /*
  ffmpeg.stderr.on("data", (data) => {
    console.log(`ffmpeg: ${data}`);
  });
  */

  ffmpeg.on("close", (code) => {
    console.log(`ffmpeg terminato con codice ${code}`);
  });

  return ffmpeg;
}

const ffmpeg = startRecording();

// 🔄 Controlla ogni minuto se è cambiato il giorno
setInterval(() => {
  const today = ensureDailyFolder();
  if (today !== currentDay) {
    console.log("Nuovo giorno rilevato, cartella aggiornata:", today);
    currentDay = today;
  }
}, 60 * 1000); // ogni minuto
