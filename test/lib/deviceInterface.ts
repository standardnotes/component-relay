import { DeviceInterface as SNDeviceInterface } from '@standardnotes/snjs';
import LocalStorage from './localStorage';

const KEYCHAIN_STORAGE_KEY = 'keychain';

let storage = {};
const localStorage = new LocalStorage(storage);

/**
 * The DeviceInterface implemation to handle storage and keychain operations.
 */
export default class DeviceInterface extends SNDeviceInterface {
  async getRawStorageValue(key) {
    return localStorage.getItem(key);
  }

  async getAllRawStorageKeyValues() {
    const results = [];
    for (const key of Object.keys(storage)) {
      results.push({
        key: key,
        value: storage[key]
      });
    }
    return results;
  }

  async setRawStorageValue(key, value) {
    localStorage.setItem(key, value);
  }

  async removeRawStorageValue(key) {
    localStorage.removeItem(key);
  }

  async removeAllRawStorageValues() {
    localStorage.clear();
  }

  async openDatabase(_identifier) {
    return {};
  }

  _getDatabaseKeyPrefix(identifier) {
    if (identifier) {
      return `${identifier}-item-`;
    } else {
      return 'item-';
    }
  }

  _keyForPayloadId(id, identifier) {
    return `${this._getDatabaseKeyPrefix(identifier)}${id}`;
  }

  async getAllRawDatabasePayloads(identifier) {
    const models = [];
    for (const key in storage) {
      if (key.startsWith(this._getDatabaseKeyPrefix(identifier))) {
        models.push(JSON.parse(storage[key]));
      }
    }
    return models;
  }

  async saveRawDatabasePayload(payload, identifier) {
    localStorage.setItem(
      this._keyForPayloadId(payload.uuid, identifier),
      JSON.stringify(payload)
    );
  }

  async saveRawDatabasePayloads(payloads, identifier) {
    for (const payload of payloads) {
      await this.saveRawDatabasePayload(payload, identifier);
    }
  }

  async removeRawDatabasePayloadWithId(id, identifier) {
    localStorage.removeItem(this._keyForPayloadId(id, identifier));
  }

  async removeAllRawDatabasePayloads(identifier) {
    for (const key in storage) {
      if (key.startsWith(this._getDatabaseKeyPrefix(identifier))) {
        delete storage[key];
      }
    }
  }

  async getNamespacedKeychainValue(identifier) {
    const keychain = await this.getRawKeychainValue();
    if (!keychain) {
      return;
    }
    return keychain[identifier];
  }

  async setNamespacedKeychainValue(value, identifier) {
    let keychain = await this.getRawKeychainValue();
    if (!keychain) {
      keychain = {};
    }
    localStorage.setItem(KEYCHAIN_STORAGE_KEY, JSON.stringify({
      ...keychain,
      [identifier]: value,
    }));
  }

  async clearNamespacedKeychainValue(identifier) {
    const keychain = await this.getRawKeychainValue();
    if (!keychain) {
      return;
    }
    delete keychain[identifier];
    localStorage.setItem(KEYCHAIN_STORAGE_KEY, JSON.stringify(keychain));
  }

  /** Allows unit tests to set legacy keychain structure as it was <= 003 */
  async legacy_setRawKeychainValue(value) {
    localStorage.setItem(KEYCHAIN_STORAGE_KEY, JSON.stringify(value));
  }

  async getRawKeychainValue() {
    const keychain = localStorage.getItem(KEYCHAIN_STORAGE_KEY);
    return JSON.parse(keychain);
  }

  async clearRawKeychainValue() {
    localStorage.removeItem(KEYCHAIN_STORAGE_KEY);
  }

  async openUrl(url) {
    console.log('Opening URL:', url);
  }
}
