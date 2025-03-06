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
exports.Postgres = void 0;
class Postgres {
    constructor(host, port, user, password, database) {
        this.host = host;
        this.port = port;
        this.user = user;
        this.password = password;
        this.database = database;
    }
    getClient() {
        const { Client } = require('pg');
        // Database connection configuration
        const dbConfig = {
            user: this.user,
            password: this.password,
            host: this.host,
            port: this.port,
            database: this.database,
        };
        return new Client(dbConfig);
    }
    getConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            var client = this.getClient();
            yield client.connect();
            return client;
        });
    }
    GetVocals() {
        return __awaiter(this, void 0, void 0, function* () {
            var rows = [];
            try {
                var connection = yield this.getConnection();
                var res = yield connection.query("SELECT * FROM KeyValues WHERE key = 'vocals'");
                rows = res.rows;
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            console.log(rows);
            return rows;
        });
    }
    GetKeyValuesById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var rows = [];
            try {
                var connection = yield this.getConnection();
                var res = yield connection.query("SELECT * FROM KeyValues WHERE id = $1", [id]);
                rows = res.rows;
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return rows;
        });
    }
    GetKeyValuesByKey(key) {
        return __awaiter(this, void 0, void 0, function* () {
            var rows = [];
            try {
                var connection = yield this.getConnection();
                var res = yield connection.query("SELECT * FROM KeyValues WHERE key = $1", [key]);
                rows = res.rows;
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return rows;
        });
    }
    SetKeyValues(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                yield connection.query("INSERT INTO KeyValues (key, value) VALUES ($1, $2)", [key, value]);
                ret = true;
            }
            catch (err) {
                console.error(err);
                ret = false;
            }
            finally {
                connection.end();
            }
            return ret;
        });
    }
    DoLogin(username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = {};
            try {
                var connection = yield this.getConnection();
                var res = yield connection.query("SELECT ID, Username, Password, Email FROM Users WHERE (username = $1 OR Email = $1) AND password = $2", [username, password]);
                if (res.rows.length > 0) {
                    var Token = yield this.GetNewToken(res.rows[0].id);
                    ret = {
                        "data": {
                            "Token": Token,
                            "User": {
                                "ID": res.rows[0].id,
                                "Username": res.rows[0].username,
                                "Email": res.rows[0].email
                            }
                        }
                    };
                }
            }
            catch (err) {
                console.error(err);
                ret = {};
            }
            finally {
                connection.end();
            }
            return ret;
        });
    }
    GetNewToken(userID) {
        return __awaiter(this, void 0, void 0, function* () {
            var token = [];
            try {
                var connection = yield this.getConnection();
                yield connection.query("DELETE FROM Tokens WHERE userid = ($1)", [userID]);
                var res = yield connection.query("INSERT INTO Tokens (userid) VALUES ($1) RETURNING token", [userID]);
                if (res.rows.length > 0) {
                    token = res.rows[0].token;
                }
            }
            catch (err) {
                console.error(err);
                token = [];
            }
            finally {
                connection.end();
            }
            return token;
        });
    }
    GetUserIDByToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = 0;
            try {
                var connection = yield this.getConnection();
                var res = yield connection.query("SELECT UserID FROM Tokens WHERE token = $1 AND Expire > NOW()", [token]);
                if (res.rows.length > 0) {
                    ret = res.rows[0].userid;
                    yield connection.query("UPDATE Tokens SET Expire = DEFAULT WHERE Token = $1", [token]);
                }
            }
            catch (err) {
                console.error(err);
                ret = 0;
            }
            finally {
                connection.end();
            }
            return ret;
        });
    }
}
exports.Postgres = Postgres;
//# sourceMappingURL=postgres.js.map