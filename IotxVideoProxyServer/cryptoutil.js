const config = require('./config');
const CryptoJS = require("crypto-js");

class CryptoUtil {
  static encrypt(text, password) {
    return CryptoJS.AES.encrypt(text, password).toString();
  }

  static decrypt(encrypted, password) {
    const bytes = CryptoJS.AES.decrypt(encrypted, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static getTokenValid() {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    return CryptoJS.SHA256(today + config.hashingSecret).toString();
  }

  static isTokenValid(token) {
    const today = new Date().toISOString().slice(0, 10);
    const validToken = CryptoJS.SHA256(today + config.hashingSecret).toString();
    return token === validToken;
  }
}

module.exports = CryptoUtil;