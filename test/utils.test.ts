// @ts-nocheck
import { isValidJsonString } from './../lib/utils';
import crypto from 'crypto';

const uuidFormat = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

describe("Utils", () => {
  describe('generateUuid', () => {
    // Use the real implementation of generateUuid instead of the mocked one.
    const { generateUuid } = jest.requireActual('./../lib/utils');

    test("length should be 36 characters", () => {
      const uuid = generateUuid();
      expect(uuid.length).toEqual(36);
    });

    it("should have a valid format", () => {
      const uuid = generateUuid();
      expect(uuid).toEqual(expect.stringMatching(uuidFormat));
    });

    test("uuid generated using window.crypto should have the correct format and length", () => {
      global.crypto = {
        getRandomValues: (array) => crypto.randomBytes(array.length)
      };
      const uuid = generateUuid();
      expect(uuid.length).toEqual(36);
      expect(uuid).toEqual(expect.stringMatching(uuidFormat));
    });
  });

  describe('isValidJsonString', () => {
    test("anything other than string should return false", () => {
      let result = isValidJsonString(1);
      expect(result).toBe(false);
  
      result = isValidJsonString(false);
      expect(result).toBe(false);
  
      result = isValidJsonString(1000000000000);
      expect(result).toBe(false);

      result = isValidJsonString({});
      expect(result).toBe(false);

      result = isValidJsonString([]);
      expect(result).toBe(false);

      result = isValidJsonString(() => true);
      expect(result).toBe(false);

      result = isValidJsonString(undefined);
      expect(result).toBe(false);

      result = isValidJsonString(null);
      expect(result).toBe(false);
    });
  
    test("an invalid JSON string should return false", () => {
      let result = isValidJsonString("{???}");
      expect(result).toBe(false);

      result = isValidJsonString("");
      expect(result).toBe(false);

      result = isValidJsonString("{");
      expect(result).toBe(false);
    });

    test("stringified objects should return true", () => {
      let objToStr = JSON.stringify({})
      let result = isValidJsonString(objToStr);
      expect(result).toBe(true);

      objToStr = JSON.stringify({ test: 1234, foo: "bar", testing: true })
      result = isValidJsonString(objToStr);
      expect(result).toBe(true);
    });

    test("stringified arrays should return true", () => {
      let arrToStr = JSON.stringify([])
      let result = isValidJsonString(arrToStr);
      expect(result).toBe(true);

      arrToStr = JSON.stringify([{ test: 1234, foo: "bar", testing: true }])
      result = isValidJsonString(arrToStr);
      expect(result).toBe(true);
    });
  });
});
