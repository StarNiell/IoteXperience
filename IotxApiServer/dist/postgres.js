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
const deviceModel_1 = require("./deviceModel");
const dashboardModel_1 = require("./dashboardModel");
const userDashboardModel_1 = require("./userDashboardModel");
const streamModel_1 = require("./streamModel");
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
    AddDevice(device) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT COUNT(*) as Exists FROM devices WHERE device_id = $1", [device.device_id])) {
                    if (res.rows[0].exists > 0) {
                        ret = true;
                    }
                }
                if (!ret) {
                    let lastId = 0;
                    let sql = "INSERT INTO devices(";
                    sql += "device_id, device_title, device_description, device_topic, device_subscription, device_type, device_value, device_step, device_min, device_max, device_unit, device_status, device_unit2, device_value2, device_offset, device_offset2) ";
                    sql += "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);";
                    yield connection.query(sql, [device.device_id, device.title, device.description, device.topic, device.subscription, device.type, device.value, device.step, device.min, device.max, device.unit, device.status, device.value2, device.unit2, device.offset, device.offset2]);
                    var res;
                    if (res = yield connection.query("SELECT MAX(id) as id FROM devices")) {
                        lastId = res.rows[0].id;
                    }
                    if (lastId > 0) {
                        let position = 0;
                        if (res = yield connection.query("SELECT MAX(position) as position FROM dashboard_devices WHERE dashboardid = 1")) {
                            position = res.rows[0].position + 1;
                        }
                        sql = "INSERT INTO dashboard_devices (";
                        sql += "dashboardid, deviceid, position) ";
                        sql += "VALUES ($1, $2, $3);";
                        yield connection.query(sql, [1, lastId, position]);
                        ret = true;
                    }
                }
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
    RemDevice(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "DELETE FROM dashboard_devices ";
                sql += "WHERE deviceid = $1;";
                yield connection.query(sql, [id]);
                sql = "DELETE FROM devices ";
                sql += "WHERE id = $1;";
                yield connection.query(sql, [id]);
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
    GetDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            var rows = [];
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT * FROM devices")) {
                    rows = res.rows;
                }
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
    GetDashboards(userid) {
        return __awaiter(this, void 0, void 0, function* () {
            var rows = [];
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT d.* FROM dashboards d JOIN user_dashboards ud on d.id = ud.dashboardid where ud.userid = $1 ORDER BY id", [userid])) {
                    rows = res.rows;
                }
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
    GetDashboard(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var rows;
            var result;
            try {
                var connection = yield this.getConnection();
                let sql = "";
                sql = "SELECT ";
                sql += "	" + id.toString() + " as dashboard_id, ";
                sql += "	(SELECT Name FROM dashboards WHERE id = " + id.toString() + ") as dashboard_name, ";
                sql += "	COALESCE((SELECT id FROM dashboard_devices WHERE dashboardid = " + id.toString() + " AND deviceid = dev.id), 0) as dashboard_devices_id, ";
                sql += "	COALESCE((SELECT Position FROM dashboard_devices WHERE dashboardid = " + id.toString() + " AND deviceid = dev.id), 999999) as dashboard_devices_position, ";
                sql += "	dev.id as devid, ";
                sql += "	dev.device_id, ";
                sql += "	dev.device_title, ";
                sql += "	dev.device_description, ";
                sql += "	dev.device_topic, ";
                sql += "	dev.device_subscription, ";
                sql += "	dev.device_type, ";
                sql += "	dev.device_value, ";
                sql += "	dev.device_step, ";
                sql += "	dev.device_min, ";
                sql += "	dev.device_max, ";
                sql += "	dev.device_unit, ";
                sql += "	dev.device_status, ";
                sql += "	dev.device_timestamp, ";
                sql += "	dev.device_value2, ";
                sql += "	dev.device_unit2, ";
                sql += "	dev.device_offset, ";
                sql += "	dev.device_offset2 ";
                sql += "FROM ";
                sql += "	devices dev ";
                sql += "ORDER BY dashboard_devices_position; ";
                var res;
                if (res = yield connection.query(sql)) {
                    rows = res.rows;
                    rows.forEach((row) => {
                        if (result == null) {
                            result = new dashboardModel_1.DashboardModel({
                                id: row.dashboard_id,
                                name: row.dashboard_name,
                                devices: [],
                                streams: []
                            });
                        }
                        result.devices.push(new deviceModel_1.DeviceModel({
                            id: row.devid,
                            topic: row.device_topic,
                            device_id: row.device_id,
                            timestamp: row.device_timestamp,
                            type: row.device_type,
                            value: row.device_value,
                            unit: row.device_unit,
                            subscription: row.device_subscription,
                            status: row.device_status,
                            step: row.device_step,
                            min: row.device_min,
                            max: row.device_max,
                            title: row.device_title,
                            description: row.device_description,
                            position: row.dashboard_devices_position,
                            dashboard_device_id: row.dashboard_devices_id,
                            value2: row.value2,
                            unit2: row.unit2,
                            offset: row.offset,
                            offset2: row.offset2
                        }));
                    });
                    sql = "SELECT ";
                    sql += "	" + id.toString() + " as dashboard_id, ";
                    sql += "	(SELECT Name FROM dashboards WHERE id = " + id.toString() + ") as dashboard_name, ";
                    sql += "	COALESCE((SELECT id FROM dashboard_streams WHERE dashboardid = " + id.toString() + " AND streamid = str.id), 0) as dashboard_streams_id, ";
                    sql += "	COALESCE((SELECT Position FROM dashboard_streams WHERE dashboardid = " + id.toString() + " AND streamid = str.id), 999999) as dashboard_streams_position, ";
                    sql += "	str.id as Strid, ";
                    sql += "	str.stream_id, ";
                    sql += "	str.stream_description, ";
                    sql += "	str.stream_url ";
                    sql += "FROM ";
                    sql += "	streams str ";
                    sql += "ORDER BY dashboard_streams_position; ";
                    var res;
                    if (res = yield connection.query(sql)) {
                        rows = res.rows;
                        rows.forEach((row) => {
                            if (result == null) {
                                result = new dashboardModel_1.DashboardModel({
                                    id: row.dashboard_id,
                                    name: row.dashboard_name,
                                    devices: [],
                                    streams: []
                                });
                            }
                            result.streams.push(new streamModel_1.StreamModel({
                                id: row.strid,
                                stream_id: row.stream_id,
                                stream_url: row.stream_url,
                                stream_description: row.stream_description,
                                position: row.dashboard_streams_position,
                                dashboard_stream_id: row.dashboard_streams_id
                            }));
                        });
                    }
                }
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return result;
        });
    }
    GetUsersDashboard(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var rows;
            var result = [];
            try {
                var connection = yield this.getConnection();
                let sql = "";
                sql = "SELECT  ";
                sql += "    COALESCE((SELECT id FROM user_dashboards WHERE dashboardid=$1 AND userid = u.id), 0) as id, ";
                sql += "    u.id as userid, ";
                sql += "    u.username, ";
                sql += "    $1 as dashboardid, ";
                sql += "    (SELECT defaultdb FROM user_dashboards WHERE dashboardid=$1 AND userid = u.id) as defaultdb ";
                sql += "from users u ";
                sql += "ORDER BY u.username; ";
                var res;
                if (res = yield connection.query(sql, [id])) {
                    rows = res.rows;
                    rows.forEach((row) => {
                        var _a;
                        result.push(new userDashboardModel_1.UserDashboardModel({
                            id: row.id,
                            userId: row.userid,
                            userName: row.username,
                            dashboardId: row.dashboardid,
                            isDefault: (_a = row.defaultdb) !== null && _a !== void 0 ? _a : false,
                            hasAccess: (row.id > 0)
                        }));
                    });
                }
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return result;
        });
    }
    SaveUsersDashboard(usersDashboard) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            var ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "";
                for (const element of usersDashboard) {
                    if (element.id == 0 && element.hasAccess) {
                        sql = "INSERT INTO user_dashboards (userid, dashboardid, defaultdb) VALUES ($1, $2, $3);";
                        yield connection.query(sql, [element.userId, element.dashboardId, (_a = element.isDefault) !== null && _a !== void 0 ? _a : false]);
                    }
                    else if (element.id > 0 && element.hasAccess && element.isDefault) {
                        sql = "UPDATE user_dashboards SET defaultdb = false WHERE dashboardid = $1;";
                        yield connection.query(sql, [element.dashboardId]);
                        sql = "UPDATE user_dashboards SET defaultdb = true WHERE id = $1;";
                        yield connection.query(sql, [element.id]);
                    }
                    else if (element.id > 0 && !element.hasAccess) {
                        sql = "DELETE FROM user_dashboards WHERE id = $1;";
                        yield connection.query(sql, [element.id]);
                    }
                }
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
    DeleteDashboard(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "DELETE FROM user_dashboards WHERE dashboardid = $1;";
                yield connection.query(sql, [id]);
                sql = "DELETE FROM dashboard_devices WHERE dashboardid = $1;";
                yield connection.query(sql, [id]);
                sql = "DELETE FROM dashboard_streams WHERE dashboardid = $1;";
                yield connection.query(sql, [id]);
                sql = "DELETE FROM dashboards ";
                sql += "WHERE id = $1;";
                yield connection.query(sql, [id]);
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
    NewDashboard(name) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT COUNT(*) as Exists FROM dashboards WHERE name = $1", [name])) {
                    if (res.rows[0].exists > 0) {
                        ret = true;
                    }
                }
                if (!ret) {
                    let sql = "INSERT INTO dashboards (";
                    sql += "Name) ";
                    sql += "VALUES ($1);";
                    yield connection.query(sql, [name]);
                    ret = true;
                }
                if (ret) {
                    let sql = "INSERT INTO user_dashboards (userid, dashboardid, defaultdb) ";
                    sql += "SELECT ";
                    sql += "	1 as userid, ";
                    sql += "	(SELECT MAX(id) FROM dashboards) as dashboardid, ";
                    sql += "	FALSE as defaultdb;";
                    yield connection.query(sql);
                }
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
    EditDashboard(id, name) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT COUNT(*) as Exists FROM dashboards WHERE name = $1 and id <> $2", [name, id])) {
                    if (res.rows[0].exists > 0) {
                        ret = true;
                    }
                }
                if (!ret) {
                    let sql = "UPDATE dashboards SET ";
                    sql += "Name = ($1) ";
                    sql += "WHERE id = ($2);";
                    yield connection.query(sql, [name, id]);
                    ret = true;
                }
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
    SaveDevice(device) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "UPDATE devices SET ";
                sql += "device_title = ($2), ";
                sql += "device_description = ($3), ";
                sql += "device_min = ($4), ";
                sql += "device_max = ($5), ";
                sql += "device_offset = ($5), ";
                sql += "device_offset2 = ($5) ";
                sql += "WHERE id = ($1);";
                yield connection.query(sql, [device.id, device.title, device.description, device.min, device.max, device.offset, device.offset2]);
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
    GetUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            var rows = [];
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT * FROM Users ORDER BY username")) {
                    rows = res.rows;
                }
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
    DeleteUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            let sql = "";
            try {
                var connection = yield this.getConnection();
                sql = "DELETE FROM tokens ";
                sql += "WHERE userid = $1;";
                yield connection.query(sql, [id]);
                sql = "DELETE FROM user_dashboards ";
                sql += "WHERE userid = $1;";
                yield connection.query(sql, [id]);
                sql = "DELETE FROM users ";
                sql += "WHERE id = $1;";
                yield connection.query(sql, [id]);
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
    NewUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT COUNT(*) as Exists FROM dashboards WHERE name = $1", [user.username])) {
                    if (res.rows[0].exists > 0) {
                        ret = true;
                    }
                }
                if (!ret) {
                    let sql = "INSERT INTO users (";
                    sql += "username, ";
                    sql += "password, ";
                    sql += "email, ";
                    sql += "admin) ";
                    sql += "VALUES ($1, $2, $3, $4);";
                    yield connection.query(sql, [user.username, user.password, user.email, user.admin]);
                    ret = true;
                }
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
    EditUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT COUNT(*) as Exists FROM users WHERE username = $1 and id <> $2", [user.username, user.id])) {
                    if (res.rows[0].exists > 0) {
                        ret = true;
                    }
                }
                if (!ret) {
                    let sql = "UPDATE users SET ";
                    sql += "username = ($1), ";
                    sql += "password = ($2), ";
                    sql += "email = ($3), ";
                    sql += "admin = ($4) ";
                    sql += "WHERE id = ($5);";
                    yield connection.query(sql, [user.username, user.password, user.email, user.admin, user.id]);
                    ret = true;
                }
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
    ResetToken(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            let sql = "";
            try {
                var connection = yield this.getConnection();
                sql = "DELETE FROM tokens ";
                sql += "WHERE userid = $1;";
                yield connection.query(sql, [id]);
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
                let sql = "";
                sql = "SELECT u.id, u.username, u.email, ud.dashboardid, ud.defaultdb, u.admin ";
                sql += "FROM users u ";
                sql += "LEFT JOIN user_dashboards ud ON u.id = ud.userid ";
                sql += "WHERE (u.username = $1 OR u.email = $1) AND u.password = $2 ";
                sql += "ORDER BY ud.defaultdb DESC ";
                sql += "LIMIT 1; ";
                var res = yield connection.query(sql, [username, password]);
                if (res.rows.length > 0) {
                    var Token = yield this.GetNewToken(res.rows[0].id);
                    ret = {
                        "data": {
                            "Token": Token,
                            "User": {
                                "ID": res.rows[0].id,
                                "Username": res.rows[0].username,
                                "Email": res.rows[0].email,
                                "dashboardid": res.rows[0].dashboardid,
                                "admin": res.rows[0].admin
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
                //await connection.query("DELETE FROM Tokens WHERE userid = ($1)", [userID]);
                let res;
                res = yield connection.query("SELECT token FROM Tokens WHERE userid = ($1) AND expire > now()", [userID]);
                if (res.rows.length > 0) {
                    token = res.rows[0].token;
                    yield connection.query("UPDATE Tokens SET expire = DEFAULT WHERE token = ($1)", [token]);
                }
                else {
                    res = yield connection.query("INSERT INTO Tokens (userid) VALUES ($1) RETURNING token", [userID]);
                    if (res.rows.length > 0) {
                        token = res.rows[0].token;
                    }
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
    AddDashboardDevice(dashboard_id, device_id) {
        return __awaiter(this, void 0, void 0, function* () {
            let ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "WITH LP AS ( ";
                sql += "    SELECT MAX(Position) as LastPosition FROM dashboard_devices ";
                sql += "    WHERE dashboardid = $1 ";
                sql += ") ";
                sql += "INSERT INTO dashboard_devices (dashboardid, deviceid, position) VALUES ( ";
                sql += "$1, $2, COALESCE((SELECT LastPosition + 1 FROM LP), 1)); ";
                yield connection.query(sql, [dashboard_id, device_id]);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return ret;
        });
    }
    RemoveDashboardDevice(dashboard_id, dashboard_device_id) {
        return __awaiter(this, void 0, void 0, function* () {
            let ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "WITH Deleted AS ( ";
                sql += "    DELETE FROM dashboard_devices ";
                sql += "    WHERE id = " + dashboard_device_id.toString() + " ";
                sql += "    RETURNING Position ";
                sql += ") \n";
                sql += "UPDATE dashboard_devices ";
                sql += "SET Position = Position - 1 ";
                sql += "WHERE  ";
                sql += "	dashboardid = " + dashboard_id.toString() + " ";
                sql += "	AND Position > (SELECT Position FROM Deleted); ";
                console.log(sql);
                var res = yield connection.query(sql);
                console.log(res);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return ret;
        });
    }
    DeviceSwapPosition(dashboard_id, pos1, pos2) {
        return __awaiter(this, void 0, void 0, function* () {
            let ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "WITH Updated AS (";
                sql += "SELECT id, Position, ";
                sql += "    CASE ";
                sql += "        WHEN Position = $1 THEN $2 ";
                sql += "        WHEN $1 < $2 AND Position > $1 AND Position <= $2 THEN Position - 1 ";
                sql += "        WHEN $1 > $2 AND Position >= $2 AND Position < $1 THEN Position + 1 ";
                sql += "    ELSE Position ";
                sql += "    END AS NewPosition ";
                sql += "FROM dashboard_devices WHERE dashboard_id $3) ";
                sql += "UPDATE dashboard_devices ";
                sql += "SET Position = Updated.NewPosition ";
                sql += "FROM Updated ";
                sql += "WHERE dashboard_devices.id = Updated.id;";
                yield connection.query(sql, [pos1, pos2, dashboard_id]);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return ret;
        });
    }
    GetStreams() {
        return __awaiter(this, void 0, void 0, function* () {
            var rows = [];
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT * FROM Streams ORDER BY stream_id")) {
                    rows = res.rows;
                }
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
    AddDashboardStream(dashboard_id, stream_id) {
        return __awaiter(this, void 0, void 0, function* () {
            let ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "WITH LP AS ( ";
                sql += "    SELECT MAX(Position) as LastPosition FROM dashboard_streams ";
                sql += "    WHERE dashboardid = $1 ";
                sql += ") ";
                sql += "INSERT INTO dashboard_streams (dashboardid, streamid, position) VALUES ( ";
                sql += "$1, $2, COALESCE((SELECT LastPosition + 1 FROM LP), 1)); ";
                yield connection.query(sql, [dashboard_id, stream_id]);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return ret;
        });
    }
    RemoveDashboardStream(dashboard_id, dashboard_stream_id) {
        return __awaiter(this, void 0, void 0, function* () {
            let ret = false;
            try {
                var connection = yield this.getConnection();
                let sql = "WITH Deleted AS ( ";
                sql += "    DELETE FROM dashboard_streams ";
                sql += "    WHERE id = " + dashboard_stream_id.toString() + " ";
                sql += "    RETURNING Position ";
                sql += ") \n";
                sql += "UPDATE dashboard_streams ";
                sql += "SET Position = Position - 1 ";
                sql += "WHERE  ";
                sql += "	dashboardid = " + dashboard_id.toString() + " ";
                sql += "	AND Position > (SELECT Position FROM Deleted); ";
                console.log(sql);
                var res = yield connection.query(sql);
                console.log(res);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                connection.end();
            }
            return ret;
        });
    }
    DeleteStream(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            let sql = "";
            try {
                var connection = yield this.getConnection();
                sql = "DELETE FROM streams ";
                sql += "WHERE id = $1;";
                yield connection.query(sql, [id]);
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
    NewStream(stream) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT COUNT(*) as Exists FROM streams WHERE stream_id = $1", [stream.stream_id])) {
                    if (res.rows[0].exists > 0) {
                        ret = true;
                    }
                }
                if (!ret) {
                    let sql = "INSERT INTO streams (";
                    sql += "stream_id, ";
                    sql += "stream_url, ";
                    sql += "stream_description) ";
                    sql += "VALUES ($1, $2, $3);";
                    yield connection.query(sql, [stream.stream_id, stream.stream_url, stream.stream_description]);
                    ret = true;
                }
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
    EditStream(stream) {
        return __awaiter(this, void 0, void 0, function* () {
            var ret = false;
            try {
                var connection = yield this.getConnection();
                var res;
                if (res = yield connection.query("SELECT COUNT(*) as Exists FROM users WHERE username = $1 and id <> $2", [stream.stream_id, stream.id])) {
                    if (res.rows[0].exists > 0) {
                        ret = true;
                    }
                }
                if (!ret) {
                    let sql = "UPDATE streams SET ";
                    sql += "stream_id = ($1), ";
                    sql += "stream_url = ($2), ";
                    sql += "stream_description = ($3) ";
                    sql += "WHERE id = ($4);";
                    yield connection.query(sql, [stream.stream_id, stream.stream_url, stream.stream_description, stream.id]);
                    ret = true;
                }
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
}
exports.Postgres = Postgres;
//# sourceMappingURL=postgres.js.map