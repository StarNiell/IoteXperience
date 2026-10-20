// Password migration tool.
//
//   npm run hash-passwords
//       computes password_hash for every user that has none (the plaintext column is not changed)
//
//   npm run hash-passwords -- --clear-plaintext
//       as above, then empties the plaintext column "password".
//       Only when every server uses hashes: requires PASSWORD_PLAINTEXT_SYNC=false.
//
// Uses the same settings (.env) as the server. Can be run more than once.

import { AppConfig } from '../config';
import { Postgres } from '../postgres';

async function main() {
    const clear = process.argv.includes('--clear-plaintext');
    const db = new Postgres(AppConfig.db.host, AppConfig.db.port, AppConfig.db.user,
        AppConfig.db.password, AppConfig.db.database, AppConfig.passwordPlaintextSync);
    console.log(`Database: ${AppConfig.db.user}@${AppConfig.db.host}:${AppConfig.db.port}/${AppConfig.db.database}`);
    try {
        if (clear && AppConfig.passwordPlaintextSync) {
            console.error('--clear-plaintext requires PASSWORD_PLAINTEXT_SYNC=false (every server must be updated first).');
            process.exitCode = 1;
            return;
        }

        const hashed = await db.HashMissingPasswords();
        console.log(`Passwords hashed: ${hashed}`);

        const missing = await db.CountUsersWithoutHash();
        if (missing > 0) {
            console.warn(`Users without a password hash (empty password, cannot log in): ${missing}`);
        }

        if (clear) {
            const cleared = await db.ClearPlaintextPasswords();
            console.log(`Plaintext passwords cleared: ${cleared}`);
        }
    }
    catch (err) {
        console.error(`Error: ${err?.message ?? err}`);
        process.exitCode = 1;
    }
    finally {
        await db.close();
    }
}

main();
