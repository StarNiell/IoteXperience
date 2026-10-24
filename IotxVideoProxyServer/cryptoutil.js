const crypto = require('crypto');

class CryptoUtil {

  // Checks a stream token issued by IotxApiServer (GET /getstreamtoken).
  // Format: <userId>.<expires>.<signature>
  //   signature = HMAC-SHA256(secret, "<streamId>|<userId>|<expires>"), base64url
  // Same algorithm as IotxApiServer/streamtoken.ts: keep the two in sync.
  // Returns the user id if the token is valid for the stream, otherwise null.
  static verifyStreamToken(secret, streamId, token) {
    if (!secret || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
    const userId = parseInt(parts[0], 10);
    const expires = parseInt(parts[1], 10);
    if (expires < Math.floor(Date.now() / 1000)) return null;
    const expected = Buffer.from(crypto.createHmac('sha256', secret)
      .update(`${streamId}|${userId}|${expires}`, 'utf8')
      .digest('base64url'));
    const given = Buffer.from(parts[2]);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    return userId;
  }

  // Constant-time comparison of a key; false if the expected key is not configured
  static keyEquals(given, expected) {
    if (typeof given !== 'string' || !expected) return false;
    const a = crypto.createHash('sha256').update(given, 'utf8').digest();
    const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
    return crypto.timingSafeEqual(a, b);
  }

  static generateRandomString(length) {
    return crypto.randomBytes(length).toString('base64url').slice(0, length);
  }
}

module.exports = CryptoUtil;
