import { isValidJsonString } from './../lib/utils';

describe("Utils", () => {
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
