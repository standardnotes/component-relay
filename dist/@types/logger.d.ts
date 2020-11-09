export default class Logger {
    static enabled: boolean;
    static info(...message: any): void;
    static error(...message: any): void;
}
