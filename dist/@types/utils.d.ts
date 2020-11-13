declare global {
    interface Window {
        msCrypto: unknown;
    }
}
export default class Utils {
    static generateUuid(): string;
    static isValidJsonString(str: any): boolean;
}
