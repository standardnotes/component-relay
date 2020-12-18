import {
  Base64String,
  HexString,
  SNPureCrypto,
  timingSafeEqual,
  Utf8String,
} from '@standardnotes/sncrypto-common';
import CryptoJS from 'crypto-js';
import { SodiumPlus, CryptographyKey } from 'sodium-plus';
import { generateUuid } from '../../lib/utils';

/**
 * A dummy implementation of SNPureCrypto. Required to create a new SNApplication instance.
 */
export default class DummyWebCrypto implements SNPureCrypto {
  deinit(): void {}

  public timingSafeEqual(a: string, b: string) {
    return timingSafeEqual(a, b);
  }

  pbkdf2(
    password: Utf8String,
    salt: Utf8String,
    iterations: number,
    length: number
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const key = CryptoJS.PBKDF2(password, salt, {
        iterations,
        keySize: length
      });
      const result = key.toString();
      resolve(result);
    });
  }

  public async generateRandomKey(bits: number): Promise<string> {
    const bytes = bits / 8;
    const sodium = await SodiumPlus.auto();
    const result = await sodium.randombytes_buf(bytes);
    return result.toString();
  }

  aes256CbcEncrypt(
    plaintext: Utf8String,
    iv: HexString,
    key: HexString
  ): Promise<Base64String> {
    return new Promise((resolve) => {
      const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: CryptoJS.enc.Hex.parse(iv)
      });
      const result = encrypted.ciphertext.toString();
      resolve(result);
    });
  }

  async aes256CbcDecrypt(
    ciphertext: Base64String,
    iv: HexString,
    key: HexString
  ): Promise<Utf8String | null> {
    try {
      const decrypted = CryptoJS.AES.encrypt(ciphertext, key, {
        iv: CryptoJS.enc.Hex.parse(iv)
      });
      return decrypted.ciphertext.toString();
    } catch (e) {
      return null;
    }
  }

  async hmac256(
    message: Utf8String,
    key: HexString
  ): Promise<HexString | null> {
    try {
      const encrypted = CryptoJS.HmacSHA256(message, key);
      return encrypted.toString();
    } catch (e) {
      return null;
    }
  }

  public async sha256(text: string): Promise<string> {
    const result = CryptoJS.SHA256(text).toString();
    return result;
  }

  public unsafeSha1(text: string): Promise<string> {
    return new Promise((resolve) => {
      const result = CryptoJS.SHA1(text).toString();
      resolve(result);
    });
  }

  public async argon2(
    password: Utf8String,
    salt: HexString,
    iterations: number,
    bytes: number,
    length: number
  ): Promise<HexString> {
    const sodium = await SodiumPlus.auto();
    return sodium.crypto_pwhash(
      length,
      password,
      await sodium.sodium_hex2bin(salt),
      iterations,
      bytes,
      sodium.CRYPTO_PWHASH_ALG_DEFAULT
    ).then(buffer => buffer.toString());
  }

  // TODO: generate a proper CryptographyKey from key.
  xchacha20Encrypt(
    plaintext: Utf8String,
    nonce: HexString,
    key: HexString,
    assocData: Utf8String
  ): Promise<Base64String> {
    return new Promise(async (resolve) => {
      try {
        const sodium = await SodiumPlus.auto();
        const cryptoKey = await sodium.sodium_hex2bin(key).then((result) => {
          return new CryptographyKey(result);
        });
        const result = await sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
          plaintext,
          nonce,
          cryptoKey,
          assocData
        ).then(buffer => buffer.toString());
        resolve(result);
      } catch (e) {
        resolve(plaintext);
      }
    });
  }

  // TODO: generate a proper CryptographyKey from key.
  public async xchacha20Decrypt(
    ciphertext: Base64String,
    nonce: HexString,
    key: HexString,
    assocData: Utf8String
  ): Promise<string | null> {
    try {
      const sodium = await SodiumPlus.auto();
      const cryptoKey = await sodium.sodium_hex2bin(key).then((result) => {
        return new CryptographyKey(result);
      });
      const result = await sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        ciphertext,
        nonce,
        cryptoKey,
        assocData
      );
      return result.toString();
    } catch (e) {
      return ciphertext;
    }
  }

  public generateUUIDSync() {
    return generateUuid();
  }

  public async generateUUID() {
    return generateUuid();
  }

  public async base64Encode(text: Utf8String): Promise<string> {
    return CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Hex.parse(text)
    );
  }

  public async base64Decode(base64String: Base64String): Promise<string> {
    const result = CryptoJS.enc.Base64.parse(base64String);
    return result.toString();
  }
}
