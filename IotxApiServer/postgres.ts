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
            await connection.query("DELETE FROM Tokens WHERE userid = ($1)", [userID]);
            var res = await connection.query("INSERT INTO Tokens (userid) VALUES ($1) RETURNING token", [userID]);
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
}

export { Postgres };