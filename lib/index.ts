import ComponentManager from './componentManager';

declare global {
  interface Window { ComponentManager: any }
}

if (typeof module != "undefined" && typeof module.exports != "undefined") {
  module.exports = ComponentManager;
}

if (window) {
  window.ComponentManager = ComponentManager;
}