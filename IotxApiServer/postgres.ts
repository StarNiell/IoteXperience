import { DeviceModel } from "./deviceModel";
import { DashboardModel } from "./dashboardModel";

class Postgres {
    private host: string;
    private port: number;
    private user: string;
    private password: string;
    private database: string;

    constructor(host: string, port: number, user: string, password: string, database: string) {
        this.host = host;
        this.port = port;
        this.user = user;
        this.password = password;
        this.database = database;
    }

    private getClient(): any {
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

    private async getConnection(): Promise<any> {
        var client = this.getClient();
        await client.connect();
        return client;
    }

    public async GetVocals(): Promise<any> {
        var rows: any = [];
        try {
            var connection = await this.getConnection();
            var res = await connection.query("SELECT * FROM KeyValues WHERE key = 'vocals'");
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
    }

    public async GetKeyValuesById(id): Promise<any> {
        var rows: any = [];
        try {
            var connection = await this.getConnection();
            var res = await connection.query("SELECT * FROM KeyValues WHERE id = $1", [id]);
            rows = res.rows;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection.end();
        }
        return rows;
    }

    public async GetKeyValuesByKey(key): Promise<any> {
        var rows: any = [];
        try {
            var connection = await this.getConnection();
            var res = await connection.query("SELECT * FROM KeyValues WHERE key = $1", [key]);
            rows = res.rows;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection.end();
        }
        return rows;
    }

    public async SetKeyValues(key: string, value: string): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();
            await connection.query("INSERT INTO KeyValues (key, value) VALUES ($1, $2)", [key, value]);
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
    }

    public async AddDevice(device: DeviceModel): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();

            var res
            if (res = await connection.query("SELECT COUNT(*) as Exists FROM devices WHERE device_id = $1", [device.device_id])) {
                if (res.rows[0].exists > 0) {
                    ret = true;
                }
            }

            if (!ret) {
                let lastId: number = 0;
                let sql: string = "INSERT INTO devices("
                sql += "device_id, device_title, device_description, device_topic, device_subscription, device_type, device_value, device_step, device_min, device_max, device_unit, device_status)"
                sql += "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);"
                await connection.query(sql, [device.device_id, device.title, device.description, device.topic, device.subscription, device.type, device.value, device.step, device.min, device.max, device.unit, device.status]);
                var res
                if (res = await connection.query("SELECT MAX(id) as id FROM devices")) {
                    lastId = res.rows[0].id;
                }
                if (lastId > 0) {
                    let position: number = 0;
                    if (res = await connection.query("SELECT MAX(position) as position FROM dashboard_devices WHERE dashboardid = 1")) {
                        position = res.rows[0].position + 1;
                    }
                    sql = "INSERT INTO dashboard_devices ("
                    sql += "dashboardid, deviceid, position) "
                    sql += "VALUES ($1, $2, $3);"
                    await connection.query(sql, [1, lastId, position]);
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
    }

    public async RemDevice(id: number): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "DELETE FROM dashboard_devices "
            sql += "WHERE deviceid = $1;"
            await connection.query(sql, [id]);
            sql = "DELETE FROM devices "
            sql += "WHERE id = $1;"
            await connection.query(sql, [id]);
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
    }

    public async GetDevices() {
        var rows: DeviceModel[] = [];
        try {
            var connection = await this.getConnection();
            var res
            if (res = await connection.query("SELECT * FROM devices")) {
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
    }

    public async GetDashboards() {
        var rows: DashboardModel[] = [];
        try {
            var connection = await this.getConnection();
            var res
            if (res = await connection.query("SELECT * FROM dashboards ORDER BY id")) {
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
    }

    public async GetDashboard(id: number) {
        var rows: any;
        var result: DashboardModel;
        try {
            var connection = await this.getConnection();
            let sql: string = "";
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
            sql += "	dev.device_timestamp ";
            sql += "FROM ";
            sql += "	devices dev ";
            sql += "ORDER BY dashboard_devices_position; ";
            var res
            if (res = await connection.query(sql)) {
                rows = res.rows;
                rows.forEach((row) => {
                    if (result == null) {
                        result = new DashboardModel({
                            id: row.dashboard_id,
                            name: row.dashboard_name,
                            devices: []
                        });
                    }
                    result.devices.push(new DeviceModel({
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
                        dashboard_device_id: row.dashboard_devices_id
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
    }

    public async DeleteDashboard(id: number): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "DELETE FROM dashboards "
            sql += "WHERE id = $1;"
            await connection.query(sql, [id]);
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
    }

    public async NewDashboard(name: string): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();

            var res
            if (res = await connection.query("SELECT COUNT(*) as Exists FROM dashboards WHERE name = $1", [name])) {
                if (res.rows[0].exists > 0) {
                    ret = true;
                }
            }

            if (!ret) {
                let sql: string = "INSERT INTO dashboards ("
                sql += "Name) "
                sql += "VALUES ($1);"
                await connection.query(sql, [name]);
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
    }

    public async EditDashboard(id: number, name: string): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();

            var res
            if (res = await connection.query("SELECT COUNT(*) as Exists FROM dashboards WHERE name = $1", [name])) {
                if (res.rows[0].exists > 0) {
                    ret = true;
                }
            }

            if (!ret) {
                let sql: string = "UPDATE dashboards SET "
                sql += "Name = ($1) "
                sql += "WHERE id = ($2);"
                await connection.query(sql, [name, id]);
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
    }

    public async DoLogin(username: string, password: string): Promise<any> {
        var ret = {};
        try {
            var connection = await this.getConnection();
            var res = await connection.query("SELECT ID, Username, Password, Email FROM Users WHERE (username = $1 OR Email = $1) AND password = $2", [username, password]);
            if (res.rows.length > 0) {
                var Token = await this.GetNewToken(res.rows[0].id);
                ret = {
                    "data":
                    {
                        "Token": Token,
                        "User":
                        {
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
    }

    private async GetNewToken(userID: number): Promise<any> {
        var token = [];
        try {
            var connection = await this.getConnection();
            //await connection.query("DELETE FROM Tokens WHERE userid = ($1)", [userID]);
            let res: any;
            res = await connection.query("SELECT token FROM Tokens WHERE userid = ($1) AND expire > now()", [userID]);
            if (res.rows.length > 0) {
                token = res.rows[0].token;
                await connection.query("UPDATE Tokens SET expire = DEFAULT WHERE token = ($1)", [token]);
            }
            else {
                res = await connection.query("INSERT INTO Tokens (userid) VALUES ($1) RETURNING token", [userID]);
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
    }

    public async GetUserIDByToken(token: string): Promise<number> {
        var ret = 0;
        try {
            var connection = await this.getConnection();
            var res = await connection.query("SELECT UserID FROM Tokens WHERE token = $1 AND Expire > NOW()", [token]);
            if (res.rows.length > 0) {
                ret = res.rows[0].userid;
                await connection.query("UPDATE Tokens SET Expire = DEFAULT WHERE Token = $1", [token]);
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
    }

    public async AddDashboardDevice(dashboard_id: number, device_id: number): Promise<boolean> {
        let ret: boolean = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "WITH LP AS ( ";
            sql += "    SELECT MAX(Position) as LastPosition FROM dashboard_devices ";
            sql += "    WHERE dashboardid = $1 ";
            sql += ") ";
            sql += "INSERT INTO dashboard_devices (dashboardid, deviceid, position) VALUES ( ";
            sql += "$1, $2, COALESCE((SELECT LastPosition + 1 FROM LP), 1)); ";
            await connection.query(sql, [dashboard_id, device_id]);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection.end();
        }
        return ret;
    }

    public async RemoveDashboardDevice(dashboard_id: number, dashboard_device_id: number): Promise<boolean> {
        let ret: boolean = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "WITH Deleted AS ( ";
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
            var res = await connection.query(sql);
            console.log(res);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection.end();
        }
        return ret;
    }

    private async DeviceSwapPosition(dashboard_id: number, pos1: number, pos2: number): Promise<boolean> {
        let ret: boolean = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "WITH Updated AS (";
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
            await connection.query(sql, [pos1, pos2, dashboard_id]);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection.end();
        }
        return ret;
    }
}

export { Postgres };