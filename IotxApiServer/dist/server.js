"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
class Server {
    constructor(exp, port, db) {
        this.app = exp;
        this.port = port;
        this.db = db;
    }
    listen() {
        let ret = false;
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
            this.startRoutes();
            console.log(`Routes started`);
            ret = true;
        });
        return ret;
    }
    startRoutes() {
        this.app.get('/', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let result = yield this.db.GetVocals();
            res.json(result);
        }));
        // Test only
        this.app.get('/test', (req, res) => {
            res.json({ "key": 1, "name": "mannitidiriale", "value": 123 });
        });
        // Test only
        this.app.get('/test2', (req, res) => {
            res.json({ "key": 2, "name": "scartiloffista", "value": 899 });
        });
        // Test only
        this.app.get('/params', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.query);
                var token = req.query.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    var key = req.query.key;
                    let result = yield this.db.GetKeyValuesByKey(key);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/dologin', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                let username = "";
                let password = "";
                if ((_a = req.body) === null || _a === void 0 ? void 0 : _a.params) {
                    username = req.body.params.username;
                    password = req.body.params.password;
                }
                else if (req.body) {
                    username = (_b = req.body) === null || _b === void 0 ? void 0 : _b.username;
                    password = (_c = req.body) === null || _c === void 0 ? void 0 : _c.password;
                }
                if (!username || !password) {
                    res.sendStatus(401);
                }
                let result = yield this.db.DoLogin(username, password);
                console.log(result);
                if (Object.keys(result).length > 0) {
                    res.json(result);
                }
                else {
                    res.sendStatus(401);
                    return;
                }
            }
            catch (error) {
                console.log(error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/adddevice', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var device = req.body.params.device;
                let result = yield this.db.AddDevice(device);
                if (result) {
                    console.log('Inserted');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.post('/remdevice', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id;
                let result = yield this.db.RemDevice(id);
                if (result) {
                    console.log('Removed');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.get('/getdevices', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.query);
                var token = req.query.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    var key = req.query.key;
                    let result = yield this.db.GetDevices();
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.get('/getdashboards', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.query);
                var token = req.query.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    var key = req.query.key;
                    let result = yield this.db.GetDashboards(UserID);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/deletedashboard', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id;
                let result = yield this.db.DeleteDashboard(id);
                if (result) {
                    console.log('Deleted');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.post('/newdashboard', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var name = req.body.params.name;
                let result = yield this.db.NewDashboard(name);
                if (result) {
                    console.log('Inserted');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.post('/editdashboard', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var id = req.body.params.id;
                var name = req.body.params.name;
                let result = yield this.db.EditDashboard(id, name);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.get('/getdashboard', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.query);
                var token = req.query.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    let id = parseInt(req.query.id, 10);
                    let result = yield this.db.GetDashboard(id);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/adddashboarddevice', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.body.params);
                var token = req.body.params.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    let id = parseInt(req.body.params.dashboardid, 10);
                    let deviceid = parseInt(req.body.params.deviceid, 10);
                    let result = yield this.db.AddDashboardDevice(id, deviceid);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/remdashboarddevice', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.body.params);
                var token = req.body.params.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    let dashboardid = parseInt(req.body.params.dashboardid, 10);
                    let dashboarddeviceid = parseInt(req.body.params.dashboarddeviceid, 10);
                    let result = yield this.db.RemoveDashboardDevice(dashboardid, dashboarddeviceid);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/adddashboardstream', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.body.params);
                var token = req.body.params.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    let id = parseInt(req.body.params.dashboardid, 10);
                    let streamid = parseInt(req.body.params.streamid, 10);
                    let result = yield this.db.AddDashboardStream(id, streamid);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/remdashboardstream', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.body.params);
                var token = req.body.params.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    let dashboardid = parseInt(req.body.params.dashboardid, 10);
                    let dashboardstreamid = parseInt(req.body.params.dashboardstreamid, 10);
                    let result = yield this.db.RemoveDashboardStream(dashboardid, dashboardstreamid);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/savedevice', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var device = req.body.params.device;
                let result = yield this.db.SaveDevice(device);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.get('/getusersdashboard', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.query);
                var token = req.query.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    let id = parseInt(req.query.id, 10);
                    let result = yield this.db.GetUsersDashboard(id);
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/saveusersdashboard', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var usersDashboard = req.body.params.users;
                let result = yield this.db.SaveUsersDashboard(usersDashboard);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.get('/getusers', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.query);
                var token = req.query.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    var key = req.query.key;
                    let result = yield this.db.GetUsers();
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/deleteuser', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id;
                let result = yield this.db.DeleteUser(id);
                if (result) {
                    console.log('Deleted');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.post('/newUser', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var user = req.body.params.userr;
                let result = yield this.db.NewUser(user);
                if (result) {
                    console.log('Inserted');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.post('/edituser', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var user = req.body.params.userr;
                let result = yield this.db.EditUser(user);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.post('/resettoken', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id;
                let result = yield this.db.ResetToken(id);
                if (result) {
                    console.log('Reset Token');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.get('/getstreams', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.query);
                var token = req.query.token;
                var UserID = yield this.db.GetUserIDByToken(token);
                console.log(UserID);
                if (UserID <= 0) {
                    res.json({ "forbidden": "Session expired or invalid token" });
                    return;
                }
                else {
                    var key = req.query.key;
                    let result = yield this.db.GetStreams();
                    res.json(result);
                }
            }
            catch (error) {
                console.log(error === null || error === void 0 ? void 0 : error.message);
                res.sendStatus(500);
            }
        }));
        this.app.post('/deletestream', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var key = req.body.params.key;
                var id = req.body.params.id;
                let result = yield this.db.DeleteStream(id);
                if (result) {
                    console.log('Deleted');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.post('/newStream', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var stream = req.body.params.stream;
                let result = yield this.db.NewStream(stream);
                if (result) {
                    console.log('Inserted');
                    res.sendStatus(200);
                }
            }
        }));
        this.app.post('/editstream', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.body.params);
            var token = req.body.params.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.json({ "forbidden": "Session expired or invalid token" });
                return;
            }
            else {
                var stream = req.body.params.stream;
                let result = yield this.db.EditStream(stream);
                if (result) {
                    console.log('Updated');
                    res.sendStatus(200);
                }
            }
        }));
        // Test only
        this.app.post('/insert', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var key = req.body.key;
            var value = req.body.value;
            let result = yield this.db.SetKeyValues(key, value);
            if (result) {
                console.log('Inserted');
                res.sendStatus(200);
            }
        }));
        this.app.get('*', function (req, res) {
            res.sendStatus(404);
        });
        this.app.post('*', function (req, res) {
            res.sendStatus(404);
        });
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map