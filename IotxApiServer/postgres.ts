import { DeviceModel } from "./deviceModel";
import { DashboardModel } from "./dashboardModel";
import { UserDashboardModel } from "./userDashboardModel";
import { UserModel } from "./userModel";
import { StreamModel } from "./streamModel";
import { Pool, PoolClient } from "pg";
import { hashPassword, verifyPassword, verifyDummy, plaintextEquals, isPasswordHash } from "./passwords";

export interface AuthUser {
    id: number;
    admin: boolean;
}

// Result of creating or editing a user
export type UserSaveResult = "ok" | "duplicate" | "error";

class Postgres {
    private host: string;
    private port: number;
    private user: string;
    private password: string;
    private database: string;
    private pool: Pool;
    // Transition period: also keep the legacy plaintext column "password" up to date and use it
    // as the reference at login, because the old server version still reads it.
    private plaintextSync: boolean;

    constructor(host: string, port: number, user: string, password: string, database: string, plaintextSync: boolean = true) {
        this.plaintextSync = plaintextSync;
        this.host = host;
        this.port = port;
        this.user = user;
        this.password = password;
        this.database = database;

        // One shared connection pool instead of a new connection for every query.
        this.pool = new Pool({
            user: this.user,
            password: this.password,
            host: this.host,
            port: this.port,
            database: this.database,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
        // An idle client can fail (e.g. database restarted): log it instead of crashing the process.
        this.pool.on('error', (err) => {
            console.error('PostgreSQL idle client error:', err.message);
        });
    }

    // Closes all the pool connections (used by command-line tools)
    public async close(): Promise<void> {
        await this.pool.end();
    }

    // Returns a client from the pool: it must be released with connection?.release()
    private async getConnection(): Promise<PoolClient> {
        return await this.pool.connect();
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
            connection?.release();
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
            connection?.release();
        }
        return rows;
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
                sql += "device_id, device_title, device_description, device_topic, device_subscription, device_type, device_value, device_step, device_min, device_max, device_unit, device_status, device_unit2, device_value2, device_offset, device_offset2) "
                sql += "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);"
                await connection.query(sql, [device.device_id, device.title, device.description, device.topic, device.subscription, device.type, device.value, device.step, device.min, device.max, device.unit, device.status, device.unit2 ?? "", device.value2 ?? 0, device.offset ?? 0, device.offset2 ?? 0]);
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
            connection?.release();
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
            connection?.release();
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
            connection?.release();
        }
        return rows;
    }

    // Every dashboard (administrator pages)
    public async GetAllDashboards() {
        var rows: any[] = [];
        try {
            var connection = await this.getConnection();
            const res = await connection.query("SELECT * FROM dashboards ORDER BY id");
            rows = res.rows;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
        }
        return rows;
    }

    public async GetDashboards(userid: number) {
        var rows: DashboardModel[] = [];
        try {
            var connection = await this.getConnection();
            var res
            if (res = await connection.query("SELECT d.* FROM dashboards d JOIN user_dashboards ud on d.id = ud.dashboardid where ud.userid = $1 ORDER BY id", [userid])) {
                rows = res.rows;
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
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
            sql += "	$1::integer as dashboard_id, ";
            sql += "	(SELECT Name FROM dashboards WHERE id = $1::integer) as dashboard_name, ";
            sql += "	COALESCE((SELECT id FROM dashboard_devices WHERE dashboardid = $1::integer AND deviceid = dev.id), 0) as dashboard_devices_id, ";
            sql += "	COALESCE((SELECT Position FROM dashboard_devices WHERE dashboardid = $1::integer AND deviceid = dev.id), 999999) as dashboard_devices_position, ";
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
            
            var res
            if (res = await connection.query(sql, [id])) {
                rows = res.rows;
                rows.forEach((row) => {
                    if (result == null) {
                        result = new DashboardModel({
                            id: row.dashboard_id,
                            name: row.dashboard_name,
                            devices: [],
                            streams: []
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
                        dashboard_device_id: row.dashboard_devices_id,
                        value2: row.device_value2,
                        unit2: row.device_unit2,
                        offset: row.device_offset,
                        offset2: row.device_offset2
                    }));

                });

                sql = "SELECT ";
                sql += "	$1::integer as dashboard_id, ";
                sql += "	(SELECT Name FROM dashboards WHERE id = $1::integer) as dashboard_name, ";
                sql += "	COALESCE((SELECT id FROM dashboard_streams WHERE dashboardid = $1::integer AND streamid = str.id), 0) as dashboard_streams_id, ";
                sql += "	COALESCE((SELECT Position FROM dashboard_streams WHERE dashboardid = $1::integer AND streamid = str.id), 999999) as dashboard_streams_position, ";
                sql += "	str.id as Strid, ";
                sql += "	str.stream_id, ";
                sql += "	str.stream_description, ";
                sql += "	str.stream_url ";
                sql += "FROM ";
                sql += "	streams str ";
                sql += "ORDER BY dashboard_streams_position; ";

                var res
                if (res = await connection.query(sql, [id])) {
                    rows = res.rows;
                    rows.forEach((row) => {
                        if (result == null) {
                            result = new DashboardModel({
                                id: row.dashboard_id,
                                name: row.dashboard_name,
                                devices: [],
                                streams: []
                            });
                        }
                        result.streams.push(new StreamModel({
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
            connection?.release();
        }
        return result;
    }

    public async GetUsersDashboard(id: number) {
        var rows: any;
        var result: UserDashboardModel[] = [];
        try {
            var connection = await this.getConnection();
            let sql: string = "";
            sql = "SELECT  ";
            sql += "    COALESCE((SELECT id FROM user_dashboards WHERE dashboardid=$1 AND userid = u.id), 0) as id, ";
            sql += "    u.id as userid, ";
            sql += "    u.username, ";
            sql += "    $1 as dashboardid, ";
            sql += "    (SELECT defaultdb FROM user_dashboards WHERE dashboardid=$1 AND userid = u.id) as defaultdb ";
            sql += "from users u ";
            sql += "ORDER BY u.username; ";
            var res
            if (res = await connection.query(sql, [id])) {
                rows = res.rows;
                rows.forEach((row) => {
                    result.push(new UserDashboardModel({
                        id: row.id,
                        userId: row.userid,
                        userName: row.username,
                        dashboardId: row.dashboardid,
                        isDefault: row.defaultdb ?? false,
                        hasAccess: (row.id > 0)
                    }));
                });
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
        }
        return result;
    }

    public async SaveUsersDashboard(usersDashboard: UserDashboardModel[]): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "";

            // "Default" is per user: the dashboard opened after login.
            // Making one dashboard the default clears the flag on the user's other dashboards.
            await connection.query("BEGIN");
            for (const element of usersDashboard) {
                const isDefault = element.hasAccess && element.isDefault === true;
                if (isDefault) {
                    sql = "UPDATE user_dashboards SET defaultdb = false WHERE userid = $1 AND dashboardid <> $2;";
                    await connection.query(sql, [element.userId, element.dashboardId]);
                }
                if (element.id == 0 && element.hasAccess) {
                    sql = "INSERT INTO user_dashboards (userid, dashboardid, defaultdb) VALUES ($1, $2, $3);";
                    await connection.query(sql, [element.userId, element.dashboardId, isDefault]);
                }
                else if (element.id > 0 && element.hasAccess) {
                    sql = "UPDATE user_dashboards SET defaultdb = $2 WHERE id = $1;";
                    await connection.query(sql, [element.id, isDefault]);
                }
                else if (element.id > 0 && !element.hasAccess) {
                    sql = "DELETE FROM user_dashboards WHERE id = $1;";
                    await connection.query(sql, [element.id]);
                }
            }
            await connection.query("COMMIT");
            ret = true;
        }
        catch (err) {
            console.error(err);
            try { await connection?.query("ROLLBACK"); } catch { }
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async DeleteDashboard(id: number): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();

            let sql = "DELETE FROM user_dashboards WHERE dashboardid = $1;";
            await connection.query(sql, [id]);

            sql = "DELETE FROM dashboard_devices WHERE dashboardid = $1;";
            await connection.query(sql, [id]);

            sql = "DELETE FROM dashboard_streams WHERE dashboardid = $1;";
            await connection.query(sql, [id]);

            sql = "DELETE FROM dashboards "
            sql += "WHERE id = $1;"
            await connection.query(sql, [id]);
            ret = true;
        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
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

            if (ret) {
                let sql: string = "INSERT INTO user_dashboards (userid, dashboardid, defaultdb) "
                sql += "SELECT "
                sql += "	1 as userid, "
                sql += "	(SELECT MAX(id) FROM dashboards) as dashboardid, "
                sql += "	FALSE as defaultdb;"
                await connection.query(sql);
            }

        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async EditDashboard(id: number, name: string): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();

            var res
            if (res = await connection.query("SELECT COUNT(*) as Exists FROM dashboards WHERE name = $1 and id <> $2", [name, id])) {
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
            connection?.release();
        }
        return ret;
    }

    public async SaveDevice(device: DeviceModel): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();

            let sql: string = "UPDATE devices SET "
            sql += "device_title = ($2), "
            sql += "device_description = ($3), "
            sql += "device_min = ($4), "
            sql += "device_max = ($5), "
            sql += "device_offset = ($6), "
            sql += "device_offset2 = ($7) "
            sql += "WHERE id = ($1);"
            await connection.query(sql, [device.id, device.title, device.description, device.min, device.max, device.offset, device.offset2]);
            ret = true;

        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async GetUsers() {
        var rows: any[] = [];
        try {
            var connection = await this.getConnection();
            var res
            if (res = await connection.query("SELECT * FROM Users ORDER BY username")) {
                // Passwords and password hashes are never sent to the client
                rows = res.rows.map((row) => {
                    const { password, password_hash, ...user } = row;
                    return user;
                });
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
        }
        return rows;
    }

    public async DeleteUser(id: number): Promise<boolean> {
        var ret = false;
        let sql: string = "";
        try {
            var connection = await this.getConnection();

            sql = "DELETE FROM tokens "
            sql += "WHERE userid = $1;"
            await connection.query(sql, [id]);

            sql = "DELETE FROM user_dashboards "
            sql += "WHERE userid = $1;"
            await connection.query(sql, [id]);

            sql = "DELETE FROM users "
            sql += "WHERE id = $1;"
            await connection.query(sql, [id]);

            ret = true;
        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    // True if another user (id <> excludeId) already uses this username or email,
    // either as username or as email (the login accepts both).
    private async UserExists(connection: PoolClient, username: string, email: string | null, excludeId: number): Promise<boolean> {
        const res = await connection.query(
            "SELECT COUNT(*) AS n FROM users WHERE id <> $3 AND (username IN ($1, $2) OR email IN ($1, $2))",
            [username, email, excludeId]);
        return parseInt(res.rows[0].n, 10) > 0;
    }

    public async NewUser(user: UserModel): Promise<UserSaveResult> {
        var ret: UserSaveResult = "error";
        try {
            // Empty email: not considered in the duplicate check
            const email = (typeof user.email === "string" && user.email.trim() !== "") ? user.email.trim() : null;
            const hash = await hashPassword(user.password);
            var connection = await this.getConnection();

            if (await this.UserExists(connection, user.username, email, 0)) {
                ret = "duplicate";
            }
            else {
                let sql: string = "INSERT INTO users ("
                sql += "username, "
                sql += "password, "
                sql += "password_hash, "
                sql += "email, "
                sql += "admin) "
                sql += "VALUES ($1, $2, $3, $4, $5);"
                // The plaintext column is NOT NULL: it holds the password only during the transition period
                await connection.query(sql, [user.username, this.plaintextSync ? user.password : "", hash, user.email, user.admin === true]);
                ret = "ok";
            }
        }
        catch (err) {
            console.error(err);
            ret = "error";
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    // Updates a user. The password is changed only when a new, non-empty one is given:
    // in that case all the user's sessions are closed, except keepToken (the caller's own session).
    public async EditUser(user: UserModel, keepToken: string = ""): Promise<UserSaveResult> {
        var ret: UserSaveResult = "error";
        try {
            // Empty email: not considered in the duplicate check
            const email = (typeof user.email === "string" && user.email.trim() !== "") ? user.email.trim() : null;
            const newPassword = (typeof user.password === "string" && user.password !== "") ? user.password : null;
            const hash = newPassword ? await hashPassword(newPassword) : null;
            var connection = await this.getConnection();

            if (await this.UserExists(connection, user.username, email, user.id)) {
                ret = "duplicate";
            }
            else {
                await connection.query("BEGIN");
                let sql: string = "UPDATE users SET "
                sql += "username = $1, "
                sql += "email = $2, "
                sql += "admin = $3 "
                sql += "WHERE id = $4;"
                await connection.query(sql, [user.username, user.email, user.admin === true, user.id]);

                if (hash) {
                    await connection.query(
                        "UPDATE users SET password_hash = $1, password = $2 WHERE id = $3;",
                        [hash, this.plaintextSync ? newPassword : "", user.id]);
                    await connection.query(
                        "DELETE FROM tokens WHERE userid = $1 AND token::text <> $2;",
                        [user.id, keepToken ?? ""]);
                }
                await connection.query("COMMIT");
                ret = "ok";
            }
        }
        catch (err) {
            console.error(err);
            try { await connection?.query("ROLLBACK"); } catch { }
            ret = "error";
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async ResetToken(id: number): Promise<boolean> {
        var ret = false;
        let sql: string = "";
        try {
            var connection = await this.getConnection();

            sql = "DELETE FROM tokens "
            sql += "WHERE userid = $1;"
            await connection.query(sql, [id]);

            ret = true;
        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    // Checks the password of one users row.
    // During the transition period (plaintextSync) the plaintext column, when not empty, is the
    // reference, because the old server version may have changed it: the hash is then refreshed.
    // Otherwise only the hash is used.
    private async CheckUserPassword(connection: PoolClient, row: any, password: string): Promise<boolean> {
        const hash: string | null = isPasswordHash(row.password_hash) ? row.password_hash : null;
        const plain: string = (typeof row.password === "string") ? row.password : "";

        if (this.plaintextSync && plain !== "") {
            if (!plaintextEquals(password, plain)) return false;
            if (!hash || !(await verifyPassword(password, hash))) {
                await connection.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(password), row.id]);
            }
            return true;
        }
        if (!hash) return false;
        return await verifyPassword(password, hash);
    }

    public async DoLogin(username: string, password: string): Promise<any> {
        var ret = {};
        try {
            var connection = await this.getConnection();
            // username and email are not unique in the table: check every match
            var res = await connection.query(
                "SELECT id, username, email, admin, password, password_hash FROM users WHERE username = $1 OR email = $1 ORDER BY id",
                [username]);

            let found: any = null;
            for (const row of res.rows) {
                if (await this.CheckUserPassword(connection, row, password)) {
                    found = row;
                    break;
                }
            }
            if (!found && (res.rows.length === 0 || this.plaintextSync)) {
                // Similar response time whether the user exists or not
                await verifyDummy(password);
            }

            if (found) {
                let sql: string = "SELECT dashboardid FROM user_dashboards WHERE userid = $1 ";
                sql += "ORDER BY defaultdb DESC NULLS LAST, dashboardid LIMIT 1;";
                const db = await connection.query(sql, [found.id]);
                var Token = await this.GetNewToken(found.id);
                ret = {
                    "data":
                    {
                        "Token": Token,
                        "User":
                        {
                            "ID": found.id,
                            "Username": found.username,
                            "Email": found.email,
                            "dashboardid": db.rows.length > 0 ? db.rows[0].dashboardid : null,
                            "admin": found.admin
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
            connection?.release();
        }
        return ret;
    }

    // --- Password migration (tools/hash-passwords.ts) ---

    // Computes password_hash for the users that have a plaintext password but no hash.
    // The plaintext column is not changed. Returns the number of users updated.
    public async HashMissingPasswords(): Promise<number> {
        let count = 0;
        var connection = await this.getConnection();
        try {
            const res = await connection.query(
                "SELECT id, password FROM users WHERE (password_hash IS NULL OR password_hash = '') AND password <> '' ORDER BY id");
            for (const row of res.rows) {
                const hash = await hashPassword(row.password);
                await connection.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, row.id]);
                count++;
            }
        }
        finally {
            connection.release();
        }
        return count;
    }

    // Empties the plaintext column of the users that have a hash. Returns the number of users updated.
    public async ClearPlaintextPasswords(): Promise<number> {
        var connection = await this.getConnection();
        try {
            const res = await connection.query(
                "UPDATE users SET password = '' WHERE password <> '' AND password_hash LIKE 'scrypt$%'");
            return res.rowCount ?? 0;
        }
        finally {
            connection.release();
        }
    }

    // Number of users that still cannot log in with a hash
    public async CountUsersWithoutHash(): Promise<number> {
        var connection = await this.getConnection();
        try {
            const res = await connection.query(
                "SELECT COUNT(*) AS n FROM users WHERE password_hash IS NULL OR password_hash NOT LIKE 'scrypt$%'");
            return parseInt(res.rows[0].n, 10);
        }
        finally {
            connection.release();
        }
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
            connection?.release();
        }
        return token;
    }

    // Returns the user that owns a valid token (and extends its expiry), or null
    public async GetUserByToken(token: string): Promise<AuthUser | null> {
        var ret: AuthUser | null = null;
        if (typeof token !== "string" || token === "") return null;
        try {
            var connection = await this.getConnection();
            var res = await connection.query(
                "SELECT t.userid, u.admin FROM Tokens t JOIN Users u ON u.id = t.userid WHERE t.token = $1 AND t.expire > NOW()",
                [token]);
            if (res.rows.length > 0) {
                ret = { id: res.rows[0].userid, admin: res.rows[0].admin === true };
                await connection.query("UPDATE Tokens SET Expire = DEFAULT WHERE Token = $1", [token]);
            }
        }
        catch (err) {
            console.error(err);
            ret = null;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    // True if the dashboard is assigned to the user
    public async UserHasDashboard(userid: number, dashboardid: number): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();
            var res = await connection.query(
                "SELECT 1 FROM user_dashboards WHERE userid = $1 AND dashboardid = $2 LIMIT 1",
                [userid, dashboardid]);
            ret = res.rows.length > 0;
        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
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
            ret = true;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async RemoveDashboardDevice(dashboard_id: number, dashboard_device_id: number): Promise<boolean> {
        let ret: boolean = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "WITH Deleted AS ( ";
            sql += "    DELETE FROM dashboard_devices ";
            sql += "    WHERE id = $2::integer ";
            sql += "    RETURNING Position ";
            sql += ") \n";
            sql += "UPDATE dashboard_devices ";
            sql += "SET Position = Position - 1 ";
            sql += "WHERE  ";
            sql += "	dashboardid = $1::integer ";
            sql += "	AND Position > (SELECT Position FROM Deleted); ";
            await connection.query(sql, [dashboard_id, dashboard_device_id]);
            ret = true;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
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
            connection?.release();
        }
        return ret;
    }

        public async GetStreams() {
        var rows: StreamModel[] = [];
        try {
            var connection = await this.getConnection();
            var res
            if (res = await connection.query("SELECT * FROM Streams ORDER BY stream_id")) {
                rows = res.rows;
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
        }
        return rows;
    }

    // True if the stream (stream_id) is in a dashboard assigned to the user
    public async UserCanViewStream(userid: number, streamId: string): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "SELECT 1 FROM streams s ";
            sql += "JOIN dashboard_streams ds ON ds.streamid = s.id ";
            sql += "JOIN user_dashboards ud ON ud.dashboardid = ds.dashboardid ";
            sql += "WHERE s.stream_id = $1 AND ud.userid = $2 LIMIT 1;";
            const res = await connection.query(sql, [streamId, userid]);
            ret = res.rows.length > 0;
        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    // Stream list for the video proxy: { stream_id: stream_url }
    public async GetStreamMap(): Promise<Record<string, string>> {
        const map: Record<string, string> = {};
        var connection = await this.getConnection();
        try {
            const res = await connection.query("SELECT stream_id, stream_url FROM streams WHERE stream_id <> '' AND stream_url <> '' ORDER BY id");
            for (const row of res.rows) {
                map[row.stream_id] = row.stream_url;
            }
        }
        finally {
            connection.release();
        }
        return map;
    }

    public async AddDashboardStream(dashboard_id: number, stream_id: number): Promise<boolean> {
        let ret: boolean = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "WITH LP AS ( ";
            sql += "    SELECT MAX(Position) as LastPosition FROM dashboard_streams ";
            sql += "    WHERE dashboardid = $1 ";
            sql += ") ";
            sql += "INSERT INTO dashboard_streams (dashboardid, streamid, position) VALUES ( ";
            sql += "$1, $2, COALESCE((SELECT LastPosition + 1 FROM LP), 1)); ";
            await connection.query(sql, [dashboard_id, stream_id]);
            ret = true;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async RemoveDashboardStream(dashboard_id: number, dashboard_stream_id: number): Promise<boolean> {
        let ret: boolean = false;
        try {
            var connection = await this.getConnection();
            let sql: string = "WITH Deleted AS ( ";
            sql += "    DELETE FROM dashboard_streams ";
            sql += "    WHERE id = $2::integer ";
            sql += "    RETURNING Position ";
            sql += ") \n";
            sql += "UPDATE dashboard_streams ";
            sql += "SET Position = Position - 1 ";
            sql += "WHERE  ";
            sql += "	dashboardid = $1::integer ";
            sql += "	AND Position > (SELECT Position FROM Deleted); ";
            await connection.query(sql, [dashboard_id, dashboard_stream_id]);
            ret = true;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async DeleteStream(id: number): Promise<boolean> {
        var ret = false;
        let sql: string = "";
        try {
            var connection = await this.getConnection();

            sql = "DELETE FROM streams "
            sql += "WHERE id = $1;"
            await connection.query(sql, [id]);

            ret = true;
        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async NewStream(stream: StreamModel): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();

            var res
            if (res = await connection.query("SELECT COUNT(*) as Exists FROM streams WHERE stream_id = $1", [stream.stream_id])) {
                if (res.rows[0].exists > 0) {
                    ret = true;
                }
            }

            if (!ret) {
                let sql: string = "INSERT INTO streams ("
                sql += "stream_id, "
                sql += "stream_url, "
                sql += "stream_description) "
                sql += "VALUES ($1, $2, $3);"
                await connection.query(sql, [stream.stream_id, stream.stream_url, stream.stream_description]);
                ret = true;
            }

        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

    public async EditStream(stream: StreamModel): Promise<boolean> {
        var ret = false;
        try {
            var connection = await this.getConnection();

            var res
            if (res = await connection.query("SELECT COUNT(*) as Exists FROM streams WHERE stream_id = $1 and id <> $2", [stream.stream_id, stream.id])) {
                if (res.rows[0].exists > 0) {
                    ret = true;
                }
            }

            if (!ret) {
                let sql: string = "UPDATE streams SET "
                sql += "stream_id = ($1), "
                sql += "stream_url = ($2), "
                sql += "stream_description = ($3) "
                sql += "WHERE id = ($4);"
                await connection.query(sql, [stream.stream_id, stream.stream_url, stream.stream_description, stream.id]);
                ret = true;
            }

        }
        catch (err) {
            console.error(err);
            ret = false;
        }
        finally {
            connection?.release();
        }
        return ret;
    }

}

export { Postgres };