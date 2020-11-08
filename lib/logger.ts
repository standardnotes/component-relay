export default class Logger {
  public static enabled: boolean  = false;

  static info(...message: any) {
    if (!this.enabled) {
      return;
    }
    console.log(message);
  }

  static error(...message: any) {
    console.error(message);
  }
}
