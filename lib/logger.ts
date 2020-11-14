/* eslint-disable @typescript-eslint/no-explicit-any */
export default class Logger {
  public static enabled = false;

  static info(...message: any) {
    if (!this.enabled) {
      return;
    }
    console.log(...message);
  }

  static error(...message: any) {
    console.error(...message);
  }
}
