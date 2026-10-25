import express from 'express';
import { Postgres, AuthUser, UserSaveResult } from './postgres';
import { DeviceModel } from './deviceModel';
import { UserDashboardModel } from './userDashboardModel';
import { UserModel } from './userModel';
import { StreamModel } from './streamModel';
import { AppConfig } from './config';
import { createStreamToken, keyEquals } from './streamtoken';

type Request = express.Request;
type Response = express.Response;

// Access levels of a route
enum Access {
    User,   // any logged-in user
    Admin,  // administrators only
}

// Thrown by the helpers below to answer 400 Bad Request
class BadRequest extends Error { }

class Server {
    private app: express.Application;
    private port: number;
    private db: Postgres;

    constructor(exp: express.Application, port: number, db: Postgres) {
        this.app = exp;
        this.port = port;
        this.db = db;
    }

    public listen(): boolean {
        this.startRoutes();
        console.log(`Routes started`);
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
        return true;
    }

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    // Parameters sent by the app: in the query string for GET, in body.params for POST
    private params(req: Request): any {
        if (req.method === 'GET') return req.query ?? {};
        return req.body?.params ?? {};
    }

    // Positive integer id, or 400 Bad Request
    private id(value: any, name: string): number {
        const n = (typeof value === 'number') ? value
            : (typeof value === 'string' && /^\d+$/.test(value)) ? parseInt(value, 10)
                : NaN;
        if (!Number.isInteger(n) || n <= 0) {
            throw new BadRequest(`Invalid ${name}`);
        }
        return n;
    }

    // Object parameter, or 400 Bad Request
    private object(value: any, name: string): any {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            throw new BadRequest(`Invalid ${name}`);
        }
        return value;
    }

    // Checks the token and the access level.
    // Returns the user, or null after sending the answer:
    //  - invalid or expired token: {"forbidden": ...} (the app logs the user out)
    //  - not an administrator: 403
    private async authorize(req: Request, res: Response, access: Access): Promise<AuthUser | null> {
        const token = this.params(req).token;
        const user = await this.db.GetUserByToken(token);
        if (!user) {
            res.json({ "forbidden": "Session expired or invalid token" });
            return null;
        }
        if (access === Access.Admin && !user.admin) {
            console.warn(`User ${user.id}: ${req.method} ${req.path} denied (administrator rights required)`);
            res.status(403).json({ "error": "Administrator rights required" });
            return null;
        }
        return user;
    }

    // Registers a route: checks authorization, catches errors, always answers
    private route(method: 'get' | 'post', path: string, access: Access,
        handler: (req: Request, res: Response, user: AuthUser) => Promise<void>) {
        this.app[method](path, async (req: Request, res: Response) => {
            try {
                const user = await this.authorize(req, res, access);
                if (!user) return;
                await handler(req, res, user);
            }
            catch (error) {
                this.fail(res, error, `${req.method} ${req.path}`);
            }
        });
    }

    private fail(res: Response, error: any, where: string) {
        if (error instanceof BadRequest) {
            if (!res.headersSent) res.status(400).json({ "error": error.message });
            return;
        }
        console.error(`${where}: ${error?.message ?? error}`);
        if (!res.headersSent) res.sendStatus(500);
    }

    // Answers 200 if the operation succeeded, 500 otherwise
    private done(res: Response, ok: boolean) {
        res.sendStatus(ok ? 200 : 500);
    }

    // Answer for user creation / editing
    private userSaved(res: Response, result: UserSaveResult) {
        if (result === "ok") res.sendStatus(200);
        else if (result === "duplicate") res.status(409).json({ "error": "Username or email already in use" });
        else res.sendStatus(500);
    }

    // ----------------------------------------------------------------------
    // Routes
    // ----------------------------------------------------------------------

    public startRoutes() {

        // Health check (no login, no database)
        this.app.get('/', (req, res) => {
            res.json({ "name": "IotxApiServer", "status": "ok" });
        });

        // --- Login ---

        this.app.post('/dologin', async (req, res) => {
            try {
                let username: string = "";
                let password: string = "";
                if (req.body?.params) {
                    username = req.body.params.username;
                    password = req.body.params.password;
                }
                else if (req.body) {
                    username = req.body?.username;
                    password = req.body?.password;
                }
                if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
                    res.sendStatus(401);
                    return;
                }
                let result = await this.db.DoLogin(username, password);
                if (Object.keys(result).length > 0) {
                    console.log(`Login: user ${result.data?.User?.ID}`);
                    res.json(result);
                }
                else {
                    console.warn(`Login failed for "${username}"`);
                    res.sendStatus(401);
                }
            }
            catch (error) {
                this.fail(res, error, 'POST /dologin');
            }
        });

        // --- Any logged-in user ---

        this.route('get', '/params', Access.User, async (req, res) => {
            const key = this.params(req).key;
            res.json(await this.db.GetKeyValuesByKey(key));
        });

        this.route('get', '/getdevices', Access.User, async (req, res) => {
            res.json(await this.db.GetDevices());
        });

        // Camera URLs (stream_url) only to administrators: users need only the stream id
        this.route('get', '/getstreams', Access.User, async (req, res, user) => {
            const streams: any[] = await this.db.GetStreams();
            res.json(user.admin ? streams : streams.map(({ stream_url, ...stream }) => stream));
        });

        // The user's dashboards; administrators can ask for all of them with all=true (admin pages)
        this.route('get', '/getdashboards', Access.User, async (req, res, user) => {
            const all = String(this.params(req).all ?? '') === 'true';
            res.json(all && user.admin ? await this.db.GetAllDashboards() : await this.db.GetDashboards(user.id));
        });

        // A dashboard: only if assigned to the user (administrators see all)
        this.route('get', '/getdashboard', Access.User, async (req, res, user) => {
            const id = this.id(this.params(req).id, 'id');
            if (!user.admin && !(await this.db.UserHasDashboard(user.id, id))) {
                console.warn(`User ${user.id}: dashboard ${id} denied (not assigned)`);
                res.status(403).json({ "error": "Dashboard not assigned to this user" });
                return;
            }
            const dashboard: any = await this.db.GetDashboard(id);
            if (dashboard && !user.admin && Array.isArray(dashboard.streams)) {
                dashboard.streams = dashboard.streams.map(({ stream_url, ...stream }) => stream);
            }
            res.json(dashboard);
        });

        // Token to open a video stream through the video proxy.
        // Users get it only for the streams in their dashboards (administrators: any stream).
        this.route('get', '/getstreamtoken', Access.User, async (req, res, user) => {
            const streamId = this.params(req).stream;
            if (typeof streamId !== 'string' || streamId.trim() === '') throw new BadRequest('Invalid stream');
            const cfg = AppConfig.streams;
            if (!cfg.tokenSecret) {
                res.status(503).json({ "error": "Stream tokens not configured (STREAM_TOKEN_SECRET)" });
                return;
            }
            if (!user.admin && !(await this.db.UserCanViewStream(user.id, streamId))) {
                console.warn(`User ${user.id}: stream "${streamId}" denied (not in the user's dashboards)`);
                res.status(403).json({ "error": "Stream not available for this user" });
                return;
            }
            const t = createStreamToken(cfg.tokenSecret, streamId, user.id, cfg.tokenTtlHours * 3600);
            res.json({ "stream": streamId, "token": t.token, "expires": t.expires.toISOString() });
        });

        // MQTT account of IotxApp: the app connects to the broker only after login
        this.route('get', '/getmqttcredentials', Access.User, async (req, res) => {
            const mqtt = AppConfig.mqtt;
            if (!mqtt.appUsername) {
                res.status(503).json({ "error": "MQTT account not configured (MQTT_APP_USERNAME)" });
                return;
            }
            res.json({ "username": mqtt.appUsername, "password": mqtt.appPassword });
        });

        // --- Video proxy (service key, no user session) ---

        // Stream list read by IotxVideoProxyServer: { "streams": { "<stream_id>": "<stream_url>" } }
        this.app.get('/proxy/streams', async (req, res) => {
            try {
                const key = AppConfig.streams.proxyServiceKey;
                if (!key) {
                    res.status(503).json({ "error": "Proxy access not configured (PROXY_SERVICE_KEY)" });
                    return;
                }
                if (!keyEquals(req.get('X-Iotx-Service-Key'), key)) {
                    console.warn(`GET /proxy/streams denied (invalid service key) from ${req.ip}`);
                    res.status(403).json({ "error": "Invalid service key" });
                    return;
                }
                res.json({ "streams": await this.db.GetStreamMap() });
            }
            catch (error) {
                this.fail(res, error, 'GET /proxy/streams');
            }
        });

        // --- Administrators: devices ---

        this.route('post', '/adddevice', Access.Admin, async (req, res) => {
            const device = this.object(this.params(req).device, 'device') as DeviceModel;
            this.done(res, await this.db.AddDevice(device));
        });

        this.route('post', '/remdevice', Access.Admin, async (req, res) => {
            const id = this.id(this.params(req).id, 'id');
            this.done(res, await this.db.RemDevice(id));
        });

        this.route('post', '/savedevice', Access.Admin, async (req, res) => {
            const device = this.object(this.params(req).device, 'device') as DeviceModel;
            device.id = this.id(device.id, 'device id');
            this.done(res, await this.db.SaveDevice(device));
        });

        // --- Administrators: dashboards ---

        this.route('post', '/newdashboard', Access.Admin, async (req, res) => {
            const name = this.params(req).name;
            if (typeof name !== 'string' || name.trim() === '') throw new BadRequest('Invalid name');
            this.done(res, await this.db.NewDashboard(name));
        });

        this.route('post', '/editdashboard', Access.Admin, async (req, res) => {
            const p = this.params(req);
            const id = this.id(p.id, 'id');
            if (typeof p.name !== 'string' || p.name.trim() === '') throw new BadRequest('Invalid name');
            this.done(res, await this.db.EditDashboard(id, p.name));
        });

        this.route('post', '/deletedashboard', Access.Admin, async (req, res) => {
            const id = this.id(this.params(req).id, 'id');
            this.done(res, await this.db.DeleteDashboard(id));
        });

        this.route('post', '/adddashboarddevice', Access.Admin, async (req, res) => {
            const p = this.params(req);
            const dashboardid = this.id(p.dashboardid, 'dashboardid');
            const deviceid = this.id(p.deviceid, 'deviceid');
            res.json(await this.db.AddDashboardDevice(dashboardid, deviceid));
        });

        this.route('post', '/remdashboarddevice', Access.Admin, async (req, res) => {
            const p = this.params(req);
            const dashboardid = this.id(p.dashboardid, 'dashboardid');
            const dashboarddeviceid = this.id(p.dashboarddeviceid, 'dashboarddeviceid');
            res.json(await this.db.RemoveDashboardDevice(dashboardid, dashboarddeviceid));
        });

        this.route('post', '/adddashboardstream', Access.Admin, async (req, res) => {
            const p = this.params(req);
            const dashboardid = this.id(p.dashboardid, 'dashboardid');
            const streamid = this.id(p.streamid, 'streamid');
            res.json(await this.db.AddDashboardStream(dashboardid, streamid));
        });

        this.route('post', '/remdashboardstream', Access.Admin, async (req, res) => {
            const p = this.params(req);
            const dashboardid = this.id(p.dashboardid, 'dashboardid');
            const dashboardstreamid = this.id(p.dashboardstreamid, 'dashboardstreamid');
            res.json(await this.db.RemoveDashboardStream(dashboardid, dashboardstreamid));
        });

        this.route('get', '/getusersdashboard', Access.Admin, async (req, res) => {
            const id = this.id(this.params(req).id, 'id');
            res.json(await this.db.GetUsersDashboard(id));
        });

        this.route('post', '/saveusersdashboard', Access.Admin, async (req, res) => {
            const users = this.params(req).users;
            if (!Array.isArray(users)) throw new BadRequest('Invalid users');
            this.done(res, await this.db.SaveUsersDashboard(users as UserDashboardModel[]));
        });

        // --- Administrators: users ---

        this.route('get', '/getusers', Access.Admin, async (req, res) => {
            res.json(await this.db.GetUsers());
        });

        this.route('post', '/newuser', Access.Admin, async (req, res) => {
            const user = this.object(this.params(req).userr, 'user') as UserModel;
            if (typeof user.username !== 'string' || user.username.trim() === '') throw new BadRequest('Invalid username');
            if (typeof user.password !== 'string' || user.password === '') throw new BadRequest('Password required');
            this.userSaved(res, await this.db.NewUser(user));
        });

        this.route('post', '/edituser', Access.Admin, async (req, res, current) => {
            const user = this.object(this.params(req).userr, 'user') as UserModel;
            user.id = this.id(user.id, 'user id');
            if (typeof user.username !== 'string' || user.username.trim() === '') throw new BadRequest('Invalid username');
            // An administrator cannot remove their own administrator rights (avoids locking everyone out)
            if (user.id === current.id && user.admin !== true) {
                throw new BadRequest('You cannot remove your own administrator rights');
            }
            // Changing the password closes the user's other sessions (the caller's own session is kept)
            this.userSaved(res, await this.db.EditUser(user, String(this.params(req).token ?? '')));
        });

        this.route('post', '/deleteuser', Access.Admin, async (req, res, current) => {
            const id = this.id(this.params(req).id, 'id');
            if (id === current.id) throw new BadRequest('You cannot delete your own user');
            this.done(res, await this.db.DeleteUser(id));
        });

        this.route('post', '/resettoken', Access.Admin, async (req, res) => {
            const id = this.id(this.params(req).id, 'id');
            this.done(res, await this.db.ResetToken(id));
        });

        // --- Administrators: streams ---

        this.route('post', '/newstream', Access.Admin, async (req, res) => {
            const stream = this.object(this.params(req).stream, 'stream') as StreamModel;
            this.done(res, await this.db.NewStream(stream));
        });

        this.route('post', '/editstream', Access.Admin, async (req, res) => {
            const stream = this.object(this.params(req).stream, 'stream') as StreamModel;
            stream.id = this.id(stream.id, 'stream id');
            this.done(res, await this.db.EditStream(stream));
        });

        this.route('post', '/deletestream', Access.Admin, async (req, res) => {
            const id = this.id(this.params(req).id, 'id');
            this.done(res, await this.db.DeleteStream(id));
        });

        // --- Anything else ---

        this.app.get('*', function (req, res) {
            res.sendStatus(404);
        })

        this.app.post('*', function (req, res) {
            res.sendStatus(404);
        })

    }
}

export { Server };
