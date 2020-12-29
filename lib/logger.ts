const noop = () => undefined

export default class Logger {
  static enabled = false;

  private static get isSupported() {
    return (window.console || console) ? true : false
  }

  static get info () {
    if (!Logger.isSupported || !this.enabled) {
      return noop
    }
    return console.log.bind(console)
  }

  static get error () {
    return console.error.bind(console)
  }
}
