import crypto from 'crypto';

// Signed tokens to open a video stream through IotxVideoProxyServer.
//
// Format:   <userId>.<expires>.<signature>
//   userId     id of the user the token was issued to
//   expires    expiry time, Unix seconds
//   signature  HMAC-SHA256(secret, "<streamId>|<userId>|<expires>"), base64url
//
// The stream id is not in the token: it is the one in the proxy URL (/stream/<id>),
// so a token opens only the stream it was issued for.
// The proxy checks the token with the same secret (STREAM_TOKEN_SECRET), only when a
// connection is opened: a stream already playing is not interrupted when the token expires.
// The same algorithm is implemented in IotxVideoProxyServer: keep the two in sync.

function signature(secret: string, streamId: string, userId: number, expires: number): string {
    return crypto.createHmac('sha256', secret)
        .update(`${streamId}|${userId}|${expires}`, 'utf8')
        .digest('base64url');
}

export function createStreamToken(secret: string, streamId: string, userId: number, ttlSeconds: number): { token: string, expires: Date } {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    return {
        token: `${userId}.${expires}.${signature(secret, streamId, userId, expires)}`,
        expires: new Date(expires * 1000),
    };
}

// Returns the user id if the token is valid for the stream, otherwise null
export function verifyStreamToken(secret: string, streamId: string, token: string): number | null {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
    const userId = parseInt(parts[0], 10);
    const expires = parseInt(parts[1], 10);
    if (expires < Math.floor(Date.now() / 1000)) return null;
    const expected = Buffer.from(signature(secret, streamId, userId, expires));
    const given = Buffer.from(parts[2]);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    return userId;
}

// Constant-time comparison of a service key
export function keyEquals(given: any, expected: string): boolean {
    if (typeof given !== 'string' || expected === '') return false;
    const a = crypto.createHash('sha256').update(given, 'utf8').digest();
    const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
    return crypto.timingSafeEqual(a, b);
}
