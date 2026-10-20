import crypto from 'crypto';

// Password hashing with scrypt (built into Node.js, no extra dependencies).
//
// Stored format: scrypt$<log2 N>$<r>$<p>$<salt base64>$<hash base64>
// The parameters are stored with each hash, so they can be raised in the future
// without invalidating the passwords already saved.

const LOG2_N = 15;      // N = 32768
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PREFIX = 'scrypt';

function scrypt(password: string, salt: Buffer, log2n: number, r: number, p: number, keylen: number): Promise<Buffer> {
    const N = 2 ** log2n;
    return new Promise((resolve, reject) => {
        // maxmem must exceed 128 * N * r bytes
        crypto.scrypt(password, salt, keylen, { N, r, p, maxmem: 256 * N * r }, (err, key) => {
            if (err) reject(err);
            else resolve(key);
        });
    });
}

export function isPasswordHash(value: any): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX + '$') && value.split('$').length === 6;
}

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = await scrypt(password, salt, LOG2_N, R, P, KEY_LENGTH);
    return [PREFIX, LOG2_N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    if (!isPasswordHash(stored)) return false;
    const [, log2n, r, p, saltB64, keyB64] = stored.split('$');
    const expected = Buffer.from(keyB64, 'base64');
    const key = await scrypt(password, Buffer.from(saltB64, 'base64'),
        parseInt(log2n, 10), parseInt(r, 10), parseInt(p, 10), expected.length);
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// Constant-time comparison of two plain strings (legacy plaintext column)
export function plaintextEquals(a: string, b: string): boolean {
    const ha = crypto.createHash('sha256').update(a, 'utf8').digest();
    const hb = crypto.createHash('sha256').update(b, 'utf8').digest();
    return crypto.timingSafeEqual(ha, hb);
}

// A fixed hash used when the user does not exist, so that the response time
// does not reveal whether a username is registered.
let dummyHash: string | null = null;
export async function verifyDummy(password: string): Promise<void> {
    if (!dummyHash) dummyHash = await hashPassword('dummy-password-for-timing');
    await verifyPassword(password, dummyHash);
}
