/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
export default class Logger {
  public static enabled  = false;

  static info(...message: any): void {
    if (!this.enabled) {
      return;
    }
    console.log(message);
  }

  static error(...message: any): void {
    console.error(message);
  }
}
