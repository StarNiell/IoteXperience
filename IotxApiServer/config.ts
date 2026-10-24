import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Loads settings from environment variables, optionally read from a .env file.
// Search order for the .env file (the first one found is used):
//   1. the path in IOTX_ENV_FILE
//   2. .env in the current working directory
//   3. .env next to this file (ts-node / nodemon)
//   4. .env in the parent folder (compiled build in dist/)
// Variables already set in the environment (e.g. by PM2) are never overwritten.

function loadEnvFile(): string | null {
    const candidates = [
        process.env.IOTX_ENV_FILE,
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '.env'),
        path.resolve(__dirname, '..', '.env'),
    ].filter((p): p is string => !!p);

    for (const file of candidates) {
        if (fs.existsSync(file)) {
            dotenv.config({ path: file });
            return file;
        }
    }
    return null;
}

function required(name: string): string {
    const value = process.env[name];
    if (value === undefined || value === '') {
        throw new Error(`Missing required setting ${name}: set it in the environment or in the .env file (see .env.example)`);
    }
    return value;
}

function optionalInt(name: string, defaultValue: number): number {
    const value = process.env[name];
    if (value === undefined || value === '') return defaultValue;
    const n = parseInt(value, 10);
    if (isNaN(n)) {
        throw new Error(`Setting ${name} must be a number, found "${value}"`);
    }
    return n;
}

function optionalString(name: string): string {
    return (process.env[name] ?? '').trim();
}

function optionalBool(name: string, defaultValue: boolean): boolean {
    const value = process.env[name];
    if (value === undefined || value === '') return defaultValue;
    const v = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'off'].includes(v)) return false;
    throw new Error(`Setting ${name} must be true or false, found "${value}"`);
}

const envFile = loadEnvFile();

export const AppConfig = {
    envFile,
    port: optionalInt('PORT', 3000),
    db: {
        host: required('DB_HOST'),
        port: optionalInt('DB_PORT', 5432),
        user: required('DB_USER'),
        password: required('DB_PASSWORD'),
        database: required('DB_NAME'),
    },
    // Transition period: also keep the legacy plaintext password column up to date,
    // because an older server version still reads it. Set to false once every server is updated.
    passwordPlaintextSync: optionalBool('PASSWORD_PLAINTEXT_SYNC', true),
    // Video streams (IotxVideoProxyServer). Empty values disable the related routes.
    streams: {
        // Secret shared with the video proxy to sign stream tokens
        tokenSecret: optionalString('STREAM_TOKEN_SECRET'),
        // Validity of a stream token (needed only to open a stream)
        tokenTtlHours: optionalInt('STREAM_TOKEN_TTL_HOURS', 24),
        // Key the video proxy uses to read the stream list (header X-Iotx-Service-Key)
        proxyServiceKey: optionalString('PROXY_SERVICE_KEY'),
    },
    // MQTT account used by IotxApp, given to the app only after login (never in the app bundle)
    mqtt: {
        appUsername: optionalString('MQTT_APP_USERNAME'),
        appPassword: optionalString('MQTT_APP_PASSWORD'),
    },
};
