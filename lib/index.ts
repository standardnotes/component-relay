import ComponentManager from './componentManager';

declare global {
  interface Window { ComponentManager: unknown }
}

if (typeof module != "undefined" && typeof module.exports != "undefined") {
  module.exports = ComponentManager;
}

if (window) {
  window.ComponentManager = ComponentManager;
}
