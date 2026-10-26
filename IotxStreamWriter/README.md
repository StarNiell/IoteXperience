# IotxStreamWriter

Recorder of the IoteXperience home-automation system (Node.js, ffmpeg). It records a
**security camera** to video files on the server: MP4 (H.264), cut into segments of a few
minutes, one folder per day, with the date and time written on the picture.

> **Optional component.** It is needed only if you want to keep recordings of a camera. It is
> not used by the app, the API or the devices: IoteXperience works normally without it. It
> also needs [IotxVideoProxyServer](../IotxVideoProxyServer) when it records through the
> proxy (the usual setup), so it makes sense only together with the cameras.

## What it does

- Reads one camera stream, usually from the video proxy
  (`http://<server>:3002/stream/<camera id>`). The proxy already reads the camera, so
  recording does not open a second connection to it.
- Opens the stream as a **trusted client**: it sends the proxy's `TRUSTED_KEY` in the
  `X-Iotx-Trusted-Key` header (never in the address, so it does not end up in logs).
- Encodes it with ffmpeg (H.264, `-preset fast`, `-crf 25`) and writes the local date and time
  in the top-left corner.
- Splits the recording into files of `segmentTime` seconds, named by date and time:
  `recordings/2026-10-26/09-30.mp4`.

A camera address can also be used directly (`rtsp://…`, `http://…`): in that case the key is
not sent.

## Requirements

- Node.js 18 or later (no npm packages needed)
- **ffmpeg** in the `PATH`, with `libx264` and the `drawtext` filter (`libfreetype`): the
  usual distribution packages have both
- Disk space: plan for the recordings to grow; old files are **not** deleted automatically

## Configuration

### `config.json`

```json
{
  "cameraUrl": "http://192.168.1.107:3002/stream/Parcheggio",
  "outputDir": "./recordings",
  "segmentTime": 600,
  "fontSize": 24,
  "fontColor": "white",
  "boxColor": "black@0.5",
  "fileNamePattern": "%Y-%m-%d/%H-%M.mp4"
}
```

| Field | Default | Meaning |
|---|---|---|
| `cameraUrl` | | Stream to record: the proxy address of a camera (`…/stream/<id>`), or a camera address |
| `outputDir` | | Folder of the recordings (relative to the folder where the recorder is started) |
| `segmentTime` | `3600` | Length of each file, in seconds |
| `fontSize`, `fontColor`, `boxColor` | | Look of the date and time on the picture (ffmpeg colours, `@0.5` = 50% transparent) |
| `fileNamePattern` | `%Y-%m-%d/%H-%M.mp4` | File names, inside `outputDir` (`strftime` format) |

### `.env`

Copy [`.env.example`](.env.example) to `.env` (ignored by git):

| Variable | Meaning |
|---|---|
| `TRUSTED_KEY` | Same value as `TRUSTED_KEY` in the `.env` of IotxVideoProxyServer. Without it the proxy refuses the stream |

## Running

Start it from its folder (it reads `config.json` and `.env` from the current folder):

```
npm start
```

or under PM2:

```
pm2 start recorder.js --name IotxStreamWriter
```

One process records one camera: to record more cameras, run more copies, each in its own
folder with its own `config.json`.

## Notes

- If ffmpeg stops (camera or proxy unreachable), the recording stops and the process stays
  up, so PM2 does not restart it: restart it by hand (`pm2 restart IotxStreamWriter`).
