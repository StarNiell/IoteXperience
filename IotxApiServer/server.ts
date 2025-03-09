import express from 'express';
import { Postgres } from './postgres';
import { DeviceModel } from './deviceModel';

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
        let ret: boolean = false;
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
            this.startRoutes();
            console.log(`Routes started`);
            ret = true;
        });
        return ret;
    }

    public startRoutes() {

        this.app.get('/', async (req, res) => {
            let result = await this.db.GetVocals();
            res.json(result);
        });

        // Test only
        this.app.get('/test', (req, res) => {
            res.json({ "key": 1, "name": "mannitidiriale", "value": 123 });
        });

        // Test only
        this.app.get('/test2', (req, res) => {
            res.json({ "key": 2, "name": "scartiloffista", "value": 899 });
        });

        // Test only
        this.app.get('/params', async (req, res) => {
            try {
                console.log(req.query);
                var token = req.query.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({"forbidden": "Session expired or invalid token"});
                    return
                }
                else {
                    var key = req.query.key;
                    let result = await this.db.GetKeyValuesByKey(key);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/dologin', async (req, res) => {
            try {
                let  username: string = "";
                let password: string = "";
                if (req.body?.params)
                {
                    username = req.body.params.username;
                    password = req.body.params.password;
                }
                else if (req.body){
                    username = req.body?.username;
                    password = req.body?.password;
                }
                if (!username || !password)
                {
                    res.sendStatus(401);
                }
                let result = await this.db.DoLogin(username, password);
                console.log(result);
                if (Object.keys(result).length > 0) {
                    res.json(result);
                }
                else {
                    res.sendStatus(401);
                    return
                }
            }
            catch (error) {
                console.log(error.message);
                res.sendStatus(500);
            }

        });

        this.app.post('/adddevice', async (req, res) => {
            var key = req.body.params.key;
            var device = req.body.params.device as DeviceModel;
            let result = await this.db.AddDevice(device);
            if (result) {
                console.log('Inserted');
                res.sendStatus(200);
            }
        });

        // Test only
        this.app.post('/insert', async (req, res) => {
            var key = req.body.key;
            var value = req.body.value;
            let result = await this.db.SetKeyValues(key, value)
            if (result) {
                console.log('Inserted');
                res.sendStatus(200);
            }
        });

        this.app.get('*', function (req, res) {
            res.sendStatus(404);
        })

        this.app.post('*', function (req, res) {
            res.sendStatus(404);
        })

    }
}

export { Server };