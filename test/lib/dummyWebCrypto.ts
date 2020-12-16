import {
  Base64String,
  HexString,
  SNPureCrypto,
  timingSafeEqual,
  Utf8String,
} from '@standardnotes/sncrypto-common';
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
    return null;
  }

  public async generateRandomKey(bits: number): Promise<string> {
    return null;
  }

  aes256CbcEncrypt(
    plaintext: Utf8String,
    iv: HexString,
    key: HexString
  ): Promise<Base64String> {
    return new Promise(() => null);
  }

  async aes256CbcDecrypt(
    ciphertext: Base64String,
    iv: HexString,
    key: HexString
  ): Promise<Utf8String | null> {
    return null;
  }

  async hmac256(
    message: Utf8String,
    key: HexString
  ): Promise<HexString | null> {
    return null;
  }

  public async sha256(text: string): Promise<string> {
    return null;
  }

  public unsafeSha1(text: string): Promise<string> {
    return new Promise(() => null);
  }

  public async argon2(
    password: Utf8String,
    salt: HexString,
    iterations: number,
    bytes: number,
    length: number
  ): Promise<HexString> {
    return new Promise(() => null);
  }

  xchacha20Encrypt(
    plaintext: Utf8String,
    nonce: HexString,
    key: HexString,
    assocData: Utf8String
  ): Promise<Base64String> {
    return new Promise(() => null);
  }

  public async xchacha20Decrypt(
    ciphertext: Base64String,
    nonce: HexString,
    key: HexString,
    assocData: Utf8String
  ): Promise<string | null> {
    return new Promise(() => null);
  }

  public generateUUIDSync() {
    return generateUuid();
  }

  public async generateUUID() {
    return generateUuid();
  }

  public async base64Encode(text: Utf8String): Promise<string> {
    return btoa(text);
  }

  public async base64Decode(base64String: Base64String): Promise<string> {
    return atob(base64String);
  }
}
