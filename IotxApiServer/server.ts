import express from 'express';
import { Postgres } from './postgres';
import { DeviceModel } from './deviceModel';
import { DashboardModel } from './dashboardModel';
import { UserDashboardModel } from './userDashboardModel';
import { UserModel } from './userModel';
import { StreamModel } from './streamModel';

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
                    res.json({ "forbidden": "Session expired or invalid token" });
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
                if (!username || !password) {
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
                if (!res.headersSent)
                    res.sendStatus(500);
            }

        });

        this.app.post('/adddevice', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var device = req.body.params.device as DeviceModel;
                let result = await this.db.AddDevice(device);
                if (result) {
                    console.log('Inserted');
                    res.sendStatus(200);
                }
            }
        });

        this.app.post('/remdevice', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id as number;
                let result = await this.db.RemDevice(id);
                if (result) {
                    console.log('Removed');
                    res.sendStatus(200);
                }
            }
        });

        this.app.get('/getdevices', async (req, res) => {
            try {
                console.log(req.query);
                var token = req.query.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    var key = req.query.key;
                    let result = await this.db.GetDevices();
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.get('/getdashboards', async (req, res) => {
            try {
                console.log(req.query);
                var token = req.query.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    var key = req.query.key;
                    let result = await this.db.GetDashboards(UserID);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/deletedashboard', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id as number;
                let result = await this.db.DeleteDashboard(id);
                if (result) {
                    console.log('Deleted');
                    res.sendStatus(200);
                }
            }
        });

        this.app.post('/newdashboard', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var name = req.body.params.name as string;
                let result = await this.db.NewDashboard(name);
                if (result) {
                    console.log('Inserted');
                    res.sendStatus(200);
                }
            }
        });

        this.app.post('/editdashboard', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var id = req.body.params.id as number;
                var name = req.body.params.name as string;
                let result = await this.db.EditDashboard(id, name);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        });


        this.app.get('/getdashboard', async (req, res) => {
            try {
                console.log(req.query);
                var token = req.query.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    let id: number = parseInt(req.query.id as string, 10);
                    let result = await this.db.GetDashboard(id);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/adddashboarddevice', async (req, res) => {
            try {
                console.log(req.body.params);
                var token = req.body.params.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    let id: number = parseInt(req.body.params.dashboardid as string, 10);
                    let deviceid: number = parseInt(req.body.params.deviceid as string, 10);
                    let result = await this.db.AddDashboardDevice(id, deviceid);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/remdashboarddevice', async (req, res) => {
            try {
                console.log(req.body.params);
                var token = req.body.params.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    let dashboardid: number = parseInt(req.body.params.dashboardid as string, 10);
                    let dashboarddeviceid: number = parseInt(req.body.params.dashboarddeviceid as string, 10);
                    let result = await this.db.RemoveDashboardDevice(dashboardid, dashboarddeviceid);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/adddashboardstream', async (req, res) => {
            try {
                console.log(req.body.params);
                var token = req.body.params.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    let id: number = parseInt(req.body.params.dashboardid as string, 10);
                    let streamid: number = parseInt(req.body.params.streamid as string, 10);
                    let result = await this.db.AddDashboardStream(id, streamid);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/remdashboardstream', async (req, res) => {
            try {
                console.log(req.body.params);
                var token = req.body.params.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    let dashboardid: number = parseInt(req.body.params.dashboardid as string, 10);
                    let dashboardstreamid: number = parseInt(req.body.params.dashboardstreamid as string, 10);
                    let result = await this.db.RemoveDashboardStream(dashboardid, dashboardstreamid);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/savedevice', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var device = req.body.params.device as DeviceModel;
                let result = await this.db.SaveDevice(device);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        });

        this.app.get('/getusersdashboard', async (req, res) => {
            try {
                console.log(req.query);
                var token = req.query.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    let id: number = parseInt(req.query.id as string, 10);
                    let result = await this.db.GetUsersDashboard(id);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/saveusersdashboard', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            } 
            else {
                var usersDashboard = req.body.params.users as UserDashboardModel[];
                let result = await this.db.SaveUsersDashboard(usersDashboard);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        });

        this.app.get('/getusers', async (req, res) => {
            try {
                console.log(req.query);
                var token = req.query.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    var key = req.query.key;
                    let result = await this.db.GetUsers();
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/deleteuser', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id as number;
                let result = await this.db.DeleteUser(id);
                if (result) {
                    console.log('Deleted');
                    res.sendStatus(200);
                }
            }
        });

        this.app.post('/newUser', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var user = req.body.params.userr as UserModel;
                let result = await this.db.NewUser(user);
                if (result) {
                    console.log('Inserted');
                    res.sendStatus(200);
                }
            }
        });

        this.app.post('/edituser', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var user = req.body.params.userr as UserModel;
                let result = await this.db.EditUser(user);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        });

        this.app.post('/resettoken', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id as number;
                let result = await this.db.ResetToken(id);
                if (result) {
                    console.log('Reset Token');
                    res.sendStatus(200);
                }
            }
        });

        this.app.get('/getstreams', async (req, res) => {
            try {
                console.log(req.query);
                var token = req.query.token as string;
                var UserID = await this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return
                }
                else {
                    var key = req.query.key;
                    let result = await this.db.GetStreams();
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error?.message)
                res.sendStatus(500);
            }
        });

        this.app.post('/deletestream', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id as number;
                let result = await this.db.DeleteStream(id);
                if (result) {
                    console.log('Deleted');
                    res.sendStatus(200);
                }
            }
        });

        this.app.post('/newStream', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var stream = req.body.params.stream as StreamModel;
                let result = await this.db.NewStream(stream);
                if (result) {
                    console.log('Inserted');
                    res.sendStatus(200);
                }
            }
        });

        this.app.post('/editstream', async (req, res) => {
            console.log(req.body.params);
            var token = req.body.params.token as string;
            var UserID = await this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return
            }
            else {
                var stream = req.body.params.stream as StreamModel;
                let result = await this.db.EditStream(stream);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
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