import ComponentRelay from './componentRelay'

declare global {
  interface Window { ComponentRelay: unknown }
}

if (typeof module != 'undefined' && typeof module.exports != 'undefined') {
  module.exports = ComponentRelay
}

if (window) {
  window.ComponentRelay = ComponentRelay
}
