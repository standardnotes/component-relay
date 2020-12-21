import { Environment } from "@standardnotes/snjs";

declare global {
  interface Window { msCrypto: unknown; }
}

export const generateUuid = () => {
  const crypto = window.crypto || window.msCrypto;

  if (crypto) {
    const buffer = new Uint32Array(4);
    crypto.getRandomValues(buffer);
    let index = -1;
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      index++;
      const r = (buffer[index>>3] >> ((index%8)*4))&15;
      const v = character === "x" ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  let date = new Date().getTime();

  if (window.performance && typeof window.performance.now === "function") {
    date += performance.now(); // Use high-precision timer if available.
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const r = (date + Math.random() * 16) % 16 | 0;
    date = Math.floor(date / 16);
    return (character === "x" ? r : (r&0x3|0x8)).toString(16);
  });
};

export const isValidJsonString = (str: any) => {
  if (typeof str !== "string") {
    return false;
  }
  try {
    const result = JSON.parse(str);
    const type = Object.prototype.toString.call(result);
    return type === "[object Object]" || type === "[object Array]";
  } catch (e) {
    return false;
  }
};

export const environmentToString = (environment: Environment) => {
  const map = {
    [Environment.Web]: "web",
    [Environment.Desktop]: "desktop",
    [Environment.Mobile]: "mobile",
  };
  return map[environment];
};
