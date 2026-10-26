# IotxApiServer

HTTP API of the IoteXperience home-automation system (Node.js, Express, TypeScript,
PostgreSQL). It is used by [IotxApp](../IotxApp) and by
[IotxVideoProxyServer](../IotxVideoProxyServer). It handles:

- login and user sessions;
- users, dashboards, devices and cameras (stored in PostgreSQL);
- the MQTT account the app uses to reach the broker (given only after login);
- the signed tokens that open a camera stream through the video proxy.

The API does **not** talk to MQTT: device values and commands go directly between the app
and the broker.

## Contents

- [Requirements](#requirements)
- [Configuration](#configuration)
- [Running](#running)
- [Conventions](#conventions)
- [Endpoints](#endpoints): [public](#public) · [login](#login) · [user](#logged-in-users) ·
  [video proxy](#video-proxy-service-key) · [devices](#administrators-devices) ·
  [dashboards](#administrators-dashboards) · [users](#administrators-users) ·
  [cameras](#administrators-cameras)
- [Database](#database)

## Requirements

- Node.js 18 or later
- PostgreSQL (in production: 16), with a role for the API (e.g. `iotx_api`)

## Configuration

Settings are environment variables, usually written in a `.env` file next to the sources
(copy [`.env.example`](.env.example)). `.env` is ignored by git. Variables already set in the
environment (e.g. by PM2) win over the file. Another file can be chosen with `IOTX_ENV_FILE`.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `PORT` | | `3000` | HTTP port |
| `DB_HOST` | yes | | PostgreSQL host |
| `DB_PORT` | | `5432` | PostgreSQL port |
| `DB_NAME` | yes | | Database name (production `datawh`, development `datawh_dev`) |
| `DB_USER` | yes | | Database role |
| `DB_PASSWORD` | yes | | Password of the role |
| `PASSWORD_PLAINTEXT_SYNC` | | `true` | Transition period: also keep the old plaintext password column up to date (see [Passwords](#passwords)) |
| `STREAM_TOKEN_SECRET` | for cameras | | Secret that signs the stream tokens. **Same value** in the video proxy. Empty: `/getstreamtoken` answers 503 |
| `STREAM_TOKEN_TTL_HOURS` | | `24` | Validity of a stream token (checked only when the stream is opened) |
| `PROXY_SERVICE_KEY` | for cameras | | Key the video proxy uses to read the camera list. **Same value** in the video proxy. Empty: `/proxy/streams` answers 503 |
| `MQTT_APP_USERNAME` | for the app | | Broker account given to the app after login. Empty: `/getmqttcredentials` answers 503 |
| `MQTT_APP_PASSWORD` | for the app | | Its password |

Generate the secrets with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

At startup the log says which settings are active (without showing the secrets).

## Running

```
npm ci
npm start              # development: nodemon + ts-node (installed globally)
npx tsc && node dist/app.js   # build and run the compiled version (production)
```

In production the server runs under PM2 (`node dist/app.js`). Each request is logged
(method, address, status, time) with tokens and passwords masked.

### Passwords

Passwords are stored as scrypt hashes (`users.password_hash`). During the transition from the
old plaintext column `users.password`:

1. keep `PASSWORD_PLAINTEXT_SYNC=true` while an older server version may still use the database;
2. compute the missing hashes: `npm run hash-passwords` (or `node dist/tools/hash-passwords.js`);
3. when every server is updated: set `PASSWORD_PLAINTEXT_SYNC=false` and clear the old column
   with `node dist/tools/hash-passwords.js --clear-plaintext`.

## Conventions

**Parameters.** GET requests take their parameters in the query string
(`/getdashboard?token=...&id=2`). POST requests take a JSON body with the parameters inside
`params`:

```json
{ "params": { "token": "…", "id": 2 } }
```

**Session token.** `POST /dologin` returns a token; every other call (except the public ones)
sends it as the `token` parameter. A token stays valid while it is used: each request moves
its expiry forward (the duration is the default of the `tokens.expire` column).

**Answers.**

| Status | When |
|---|---|
| 200 + JSON | data requests |
| 200 (`OK`, no JSON) | changes that succeeded |
| 200 + `{"forbidden": "Session expired or invalid token"}` | missing, invalid or expired token: the app logs the user out |
| 400 + `{"error": "Invalid <name>"}` | a parameter is missing or wrong (e.g. an id that is not a positive integer) |
| 401 | wrong username or password (`/dologin`) |
| 403 + `{"error": "…"}` | administrator rights required, or the item is not assigned to the user |
| 409 + `{"error": "Username or email already in use"}` | user creation or editing |
| 500 | database error (details in the server log only) |
| 503 + `{"error": "… not configured …"}` | the feature needs a setting that is empty |

Numeric database columns (e.g. `device_min`) may arrive as strings: convert them on the client.

**Access levels.** *User*: any logged-in user. *Admin*: users with `admin = true`; other
users get 403.

## Endpoints

### Public

#### `GET /`

Health check, no login and no database.

```json
{ "name": "IotxApiServer", "status": "ok" }
```

### Login

#### `POST /dologin`

| Parameter | Description |
|---|---|
| `username` | username **or** email |
| `password` | password |

(Inside `params`; a plain body `{ "username", "password" }` is accepted too.)

Answer 200:

```json
{
  "data": {
    "Token": "8d0c…-uuid",
    "User": { "ID": 1, "Username": "aniello", "Email": "aniello@example.com", "dashboardid": 1, "admin": true }
  }
}
```

`dashboardid` is the user's default dashboard (the one marked *default*, otherwise the first
one), or `null` if no dashboard is assigned. If the user already has a valid token, the same
token is returned. Wrong credentials: 401.

### Logged-in users

#### `GET /getdashboards` — *User*

Dashboards assigned to the user: `[{ "id": 1, "name": "Home" }, …]`, ordered by id.

| Parameter | Description |
|---|---|
| `all` | optional, `true`: **every** dashboard (administrators only; ignored for other users). Used by the admin pages |

#### `GET /getdashboard` — *User*

| Parameter | Description |
|---|---|
| `id` | dashboard id |

A user can read only an assigned dashboard (otherwise 403); administrators can read any.
The answer lists **all** devices and cameras: the ones on this dashboard have
`dashboard_device_id` / `dashboard_stream_id` other than 0 and come first, in dashboard order.

```json
{
  "id": 1,
  "name": "Home",
  "devices": [
    {
      "id": 1, "device_id": "pump01", "type": "switch", "title": "Garden pump", "description": "",
      "topic": "iotx/out/switch-pump01", "subscription": "iotx/in",
      "value": "0", "unit": "state", "value2": null, "unit2": null, "status": "ok", "timestamp": null,
      "step": "1", "min": "0", "max": "100", "offset": "0", "offset2": "0",
      "position": 1, "dashboard_device_id": 12
    }
  ],
  "streams": [
    { "id": 1, "stream_id": "parking", "stream_description": "Parking", "stream_url": "rtsp://…",
      "position": 1, "dashboard_stream_id": 3 }
  ]
}
```

`stream_url` is returned to administrators only. Live values come from MQTT, not from this
call.

#### `GET /getdevices` — *User*

Every device registered in the database, as stored (column names `device_*`):

```json
[{ "id": 1, "device_id": "pump01", "device_title": "Garden pump", "device_description": "",
   "device_topic": "iotx/out/switch-pump01", "device_subscription": "iotx/in", "device_type": "switch",
   "device_value": "0", "device_step": "1", "device_min": "0", "device_max": "100", "device_unit": "state",
   "device_status": "ok", "device_timestamp": null, "device_value2": null, "device_unit2": null,
   "device_offset": "0", "device_offset2": "0" }]
```

#### `GET /getstreams` — *User*

Every camera, ordered by `stream_id`: `[{ "id", "stream_id", "stream_url", "stream_description" }]`.
`stream_url` (it may contain the camera password) is returned to administrators only.

#### `GET /getstreamtoken` — *User*

| Parameter | Description |
|---|---|
| `stream` | `stream_id` of the camera |

Token that opens that camera through the video proxy:

```json
{ "stream": "parking", "token": "1.1792950000.Qm9…", "expires": "2026-10-27T09:00:00.000Z" }
```

The app then opens `<proxy>/stream/<stream>?token=<token>`. A user gets a token only for the
cameras on their dashboards (otherwise 403); administrators for any camera. 503 if
`STREAM_TOKEN_SECRET` is empty.

Token format: `<userId>.<expires>.<signature>`, where `expires` is in Unix seconds and
`signature` = HMAC-SHA256(`STREAM_TOKEN_SECRET`, `"<streamId>|<userId>|<expires>"`), base64url.
The same algorithm is in the video proxy (`cryptoutil.js`): keep the two in step.

#### `GET /getmqttcredentials` — *User*

Broker account for the app: `{ "username": "…", "password": "…" }`. 503 if
`MQTT_APP_USERNAME` is empty. Use a broker account with limited rights (read `iotx/out/#`,
write `iotx/in`).

#### `GET /params` — *User*

| Parameter | Description |
|---|---|
| `key` | key to read |

Rows of the `keyvalues` table with that key: `[{ "id", "key", "value" }]`.

### Video proxy (service key)

#### `GET /proxy/streams`

Used by IotxVideoProxyServer to know which cameras exist. No user session: it needs the header
`X-Iotx-Service-Key` with the value of `PROXY_SERVICE_KEY` (otherwise 403; 503 if the key is
not set).

```json
{ "streams": { "parking": "rtsp://user:password@192.168.1.50:554/stream1" } }
```

Only cameras with both an id and an address are listed.

### Administrators: devices

A device is identified by `device_id` (sent by the device in its MQTT messages). Devices seen
on MQTT but not in the database appear in IotxApp as *new* and must be added before they can
be put on a dashboard.

#### `POST /adddevice` — *Admin*

| Parameter | Description |
|---|---|
| `device` | object: `device_id`, `title`, `description`, `topic`, `subscription`, `type`, `value`, `step`, `min`, `max`, `unit`, `status`, `value2`, `unit2`, `offset`, `offset2` |

Registers the device and also puts it on dashboard 1. If a device with the same `device_id`
exists already, nothing changes (answer 200).

#### `POST /savedevice` — *Admin*

| Parameter | Description |
|---|---|
| `device` | object: `id` (database id), `title`, `description`, `min`, `max`, `offset`, `offset2` |

Only these fields can be changed: type, topic and `device_id` come from the device.
`offset` is added to the main value, `offset2` to the second one (sensors); `min`/`max` set the
range of the sensor gauge.

#### `POST /remdevice` — *Admin*

| Parameter | Description |
|---|---|
| `id` | database id of the device |

Deletes the device and takes it off every dashboard. If it keeps publishing, it shows up
again as a new device.

### Administrators: dashboards

#### `POST /newdashboard` — *Admin*

| Parameter | Description |
|---|---|
| `name` | dashboard name (not empty) |

Creates the dashboard and gives access to user 1. A name already in use: nothing is created
(answer 200).

#### `POST /editdashboard` — *Admin*

| Parameter | Description |
|---|---|
| `id` | dashboard id |
| `name` | new name (not empty) |

A name used by another dashboard: nothing changes (answer 200).

#### `POST /deletedashboard` — *Admin*

| Parameter | Description |
|---|---|
| `id` | dashboard id |

Deletes the dashboard with its user access, devices and cameras assignments (the devices and
cameras themselves are kept). IotxApp does not offer to delete dashboard 1.

#### `POST /adddashboarddevice` — *Admin*

| Parameter | Description |
|---|---|
| `dashboardid` | dashboard id |
| `deviceid` | database id of the device |

Puts the device at the end of the dashboard. Answer: `true` / `false`.

#### `POST /remdashboarddevice` — *Admin*

| Parameter | Description |
|---|---|
| `dashboardid` | dashboard id |
| `dashboarddeviceid` | `dashboard_device_id` of the device on that dashboard (from `/getdashboard`) |

Takes the device off the dashboard; the following ones move up. Answer: `true` / `false`.

#### `POST /adddashboardstream` — *Admin*

| Parameter | Description |
|---|---|
| `dashboardid` | dashboard id |
| `streamid` | database id of the camera |

Puts the camera at the end of the dashboard. Answer: `true` / `false`.

#### `POST /remdashboardstream` — *Admin*

| Parameter | Description |
|---|---|
| `dashboardid` | dashboard id |
| `dashboardstreamid` | `dashboard_stream_id` of the camera on that dashboard |

Answer: `true` / `false`.

#### `GET /getusersdashboard` — *Admin*

| Parameter | Description |
|---|---|
| `id` | dashboard id |

Every user, with their access to this dashboard:

```json
[{ "id": 5, "userId": 2, "userName": "guest", "dashboardId": 1, "hasAccess": true, "isDefault": true },
 { "id": 0, "userId": 3, "userName": "maria", "dashboardId": 1, "hasAccess": false, "isDefault": false }]
```

`id` is the access record (0: no access).

#### `POST /saveusersdashboard` — *Admin*

| Parameter | Description |
|---|---|
| `users` | the list from `/getusersdashboard`, with `hasAccess` / `isDefault` changed |

For each user: gives or removes access, and sets the *default* dashboard (the one opened after
login). Default is per user: making this dashboard the default clears the flag on the user's
other dashboards. All the changes are saved together (transaction).

### Administrators: users

#### `GET /getusers` — *Admin*

Every user, ordered by username, **without** passwords: `[{ "id", "username", "email", "admin" }]`.

#### `POST /newuser` — *Admin*

| Parameter | Description |
|---|---|
| `userr` | object: `username` (required), `password` (required), `email`, `admin` (`true`/`false`) |

409 if the username or the email is already used (also as the other one: a username equal to
someone's email is refused).

#### `POST /edituser` — *Admin*

| Parameter | Description |
|---|---|
| `userr` | object: `id`, `username`, `email`, `admin`, `password` (empty: unchanged) |

A new password signs the user out on their other devices (the caller's own session is kept).
An administrator cannot remove their own administrator rights (400). 409 for a duplicate
username or email.

#### `POST /resettoken` — *Admin*

| Parameter | Description |
|---|---|
| `id` | user id |

Deletes the user's sessions: they must log in again on every device.

#### `POST /deleteuser` — *Admin*

| Parameter | Description |
|---|---|
| `id` | user id |

Deletes the user with their sessions and dashboard access. You cannot delete yourself (400);
IotxApp does not offer to delete user 1.

### Administrators: cameras

A camera (*stream*) has an id used in the stream address (`stream_id`, letters, digits, `-`,
`_`), the camera address read by the video proxy (`stream_url`: `rtsp://…`, `http(s)://…`) and
a name shown in the app (`stream_description`).

#### `POST /newstream` — *Admin*

| Parameter | Description |
|---|---|
| `stream` | object: `stream_id`, `stream_url`, `stream_description` |

An id already in use: nothing is created (answer 200). The video proxy sees the new camera
within `STREAM_REFRESH_SECONDS`, or as soon as someone opens it.

#### `POST /editstream` — *Admin*

| Parameter | Description |
|---|---|
| `stream` | object: `id`, `stream_id`, `stream_url`, `stream_description` |

An id used by another camera: nothing changes (answer 200). If the address changes, the video
proxy restarts that stream at its next refresh.

#### `POST /deletestream` — *Admin*

| Parameter | Description |
|---|---|
| `id` | database id of the camera |

## Database

Main tables (PostgreSQL):

| Table | Content |
|---|---|
| `users` | `id`, `username`, `email`, `admin`, `password_hash` (scrypt), `password` (old plaintext column, emptied after the transition) |
| `tokens` | user sessions: `token` (uuid), `userid`, `expire` |
| `dashboards` | `id`, `name` |
| `user_dashboards` | access of users to dashboards: `userid`, `dashboardid`, `defaultdb` |
| `devices` | registered devices (`device_*` columns) |
| `dashboard_devices` | devices on a dashboard: `dashboardid`, `deviceid`, `position` |
| `streams` | cameras: `stream_id`, `stream_url`, `stream_description` |
| `dashboard_streams` | cameras on a dashboard: `dashboardid`, `streamid`, `position` |
| `keyvalues` | generic settings: `key`, `value` |

All queries use parameters (`$1`, `$2`, …), never values written into the SQL text.
