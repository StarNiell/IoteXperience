import config from "../config/config";
import CryptoJS from "crypto-js";

export class CryptoUtil {

  static encrypt(text: string, password: string): string {
    return CryptoJS.AES.encrypt(text, password).toString();
  }

  static decrypt(encrypted: string, password: string): string {
    const bytes = CryptoJS.AES.decrypt(encrypted, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static getTokenValid(): string {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    return CryptoJS.SHA256(today + config.hashingSecret).toString();
  }

  static isTokenValid(token: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    const validToken = CryptoJS.SHA256(today + config.hashingSecret).toString();
    return token === validToken;
  }
}