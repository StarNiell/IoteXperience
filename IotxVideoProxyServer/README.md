# IotxVideoProxyServer

Video proxy of the IoteXperience home-automation system (Node.js, Express, ffmpeg). It brings
the **security cameras** into [IotxApp](../IotxApp): it reads each camera once and sends the
picture to every viewer as an MJPEG stream that a browser shows in a plain `<img>`.

> **Optional component.** It is needed only if you want to see cameras in the app. Without
> it, IoteXperience works normally: dashboards, devices and users do not depend on it. Just
> don't add cameras (*Administration → Cameras*) and don't start this server.

## What it does

- **One connection per camera.** However many people watch a camera, the proxy opens it once
  and shares the frames. It stops reading a camera 10 seconds after the last viewer leaves.
- **Any camera the browser cannot show by itself.**
  - `rtsp://…` cameras (most IP cameras): ffmpeg converts the video to MJPEG
    (5 frames per second, no audio).
  - `http(s)://…` MJPEG cameras: the stream is relayed as it is.
  - If a camera drops, the proxy reconnects by itself while someone is watching.
- **Camera addresses stay on the server.** The app never sees them (they often contain the
  camera password): it only knows the camera id.
- **Access with signed tokens.** To open a camera the app asks
  [IotxApiServer](../IotxApiServer) for a token (`GET /getstreamtoken`), valid only for that
  camera and that user, and only for cameras on the user's dashboards. The proxy checks the
  signature with the secret it shares with the API; the token is checked when the stream is
  opened (a stream already playing is not cut when the token expires).
- **Camera list from the API.** The cameras are the ones configured in the app; the proxy
  reads the list from the API at startup, every `STREAM_REFRESH_SECONDS` and whenever an
  unknown camera is requested. Cameras added or changed in the app are picked up without a
  restart. Extra cameras can be fixed in `config.js`.
- **Trusted clients.** Programs on the server, such as [IotxStreamWriter](../IotxStreamWriter),
  can open a stream with a key (`TRUSTED_KEY`) instead of a user token.

```
 IP camera (RTSP / MJPEG) ──▶ IotxVideoProxyServer ──MJPEG──▶ IotxApp (browsers)
                                   ▲        │                └─ token from IotxApiServer
           camera list (service key)│        └──MJPEG──▶ IotxStreamWriter (trusted key)
                              IotxApiServer
```

## Requirements

- Node.js 18 or later
- **ffmpeg** in the `PATH` (needed for RTSP cameras)
- IotxApiServer reachable from the proxy, with the same `STREAM_TOKEN_SECRET` and
  `PROXY_SERVICE_KEY`

## Configuration

### `.env`

Copy [`.env.example`](.env.example) to `.env` (ignored by git). Variables already set in the
environment (e.g. by PM2) win over the file.

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3002` | HTTP port. The app reaches it at the address in its `streamProxyUrl` setting |
| `API_URL` | | IotxApiServer address, e.g. `http://localhost:3000` |
| `PROXY_SERVICE_KEY` | | Key to read the camera list. **Same value** as `PROXY_SERVICE_KEY` in IotxApiServer |
| `STREAM_REFRESH_SECONDS` | `60` | How often the camera list is read again |
| `STREAM_TOKEN_SECRET` | | Secret to check the viewers' tokens. **Same value** as `STREAM_TOKEN_SECRET` in IotxApiServer. Empty: only trusted clients can open streams |
| `TRUSTED_KEY` | | Key for trusted clients and for the management endpoints. Empty: both disabled |

Without `API_URL` or `PROXY_SERVICE_KEY` only the cameras in `config.js` are available.

Generate keys and secrets with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `config.js` (optional)

Cameras that are not in the app's camera list, always available. Copy
[`config.example.js`](config.example.js) to `config.js` (ignored by git, because camera
addresses may contain passwords):

```js
class Config {
    static fixedStreams = {
        'Camera-1': 'http://192.168.1.123/stream',
        'Camera-2': 'rtsp://user:password@192.168.1.124:554/h264_stream',
    };
}
module.exports = Config;
```

## Running

```
npm ci
npm start
```

In production it runs under PM2 with:

```
node --expose-gc --max-old-space-size=512 server.js
```

(`--expose-gc` lets the proxy free memory right after a stream is closed.) The startup log
says which settings are active.

## Endpoints

### `GET /stream/:id`

The stream of camera `:id` (`multipart/x-mixed-replace`, JPEG frames), to use as the `src` of
an `<img>`.

Access, one of:

- `?token=<token>`: a token from IotxApiServer (`GET /getstreamtoken?stream=<id>`) for this camera;
- header `X-Iotx-Trusted-Key: <TRUSTED_KEY>` (trusted clients; the key is **not** accepted in the URL here).

| Answer | When |
|---|---|
| 200 + stream | access granted |
| 401 `Missing token` | neither token nor key |
| 403 `Invalid or expired token` | wrong token, expired, or issued for another camera |
| 404 `Stream not found` | no camera with this id (after reading the list again) |
| 503 `Stream not yet ready…` | an HTTP camera did not answer within 5 seconds: retry |

### `GET /`

A small page with links, no key needed.

### Management (key `TRUSTED_KEY`)

These need the key in the header `X-Iotx-Trusted-Key` or, to open them in a browser, as
`?key=…`. Without `TRUSTED_KEY` they answer 403.

| Endpoint | What it does |
|---|---|
| `GET /streams` | List of the camera ids known to the proxy (HTML) |
| `GET /streamstats` | For each open stream: viewers, running, last activity, uptime; memory usage |
| `GET /memory/deep` | Memory usage and cleanup counters |
| `POST /memory/cleanup` | Closes every stream and frees memory |
| `POST /stream/:id/close` | Closes a stream (viewers are disconnected) |
| `POST /stream/:id/restart` | Closes a stream and opens it again |
| `GET /endpoints` | List of the endpoints |

`POST /config`, which once loaded the camera list from the browser, has been removed: it
answers 410.
