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
};
