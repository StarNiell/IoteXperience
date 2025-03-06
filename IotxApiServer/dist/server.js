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
        this.app.get('/test', (req, res) => {
            res.json({ "key": 1, "name": "mannitidiriale", "value": 123 });
        });
        this.app.get('/test2', (req, res) => {
            res.json({ "key": 2, "name": "scartiloffista", "value": 899 });
        });
        this.app.get('/params', (req, res) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.query);
            var token = req.query.token;
            var UserID = yield this.db.GetUserIDByToken(token);
            console.log(UserID);
            if (UserID <= 0) {
                res.sendStatus(401);
                return;
            }
            else {
                var key = req.query.key;
                let result = yield this.db.GetKeyValuesByKey(key);
                res.json(result);
            }
        }));
        this.app.post('/dologin', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var username = req.body.username;
            var password = req.body.password;
            let result = yield this.db.DoLogin(username, password);
            console.log(result);
            if (Object.keys(result).length > 0) {
                res.json(result);
            }
            else {
                res.sendStatus(401);
                return;
            }
        }));
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