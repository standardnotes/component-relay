(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
class ComponentManager {

  constructor(permissions, onReady) {
    this.sentMessages = [];
    this.messageQueue = [];
    this.permissions = permissions;
    this.loggingEnabled = false;
    this.onReadyCallback = onReady;

    window.addEventListener("message", function (event) {
      if (this.loggingEnabled) {
        console.log("Components API Message received:", event.data);
      }
      this.handleMessage(event.data);
    }.bind(this), false);
  }

  handleMessage(payload) {
    if (payload.action === "component-registered") {
      this.sessionKey = payload.sessionKey;
      this.componentData = payload.componentData;
      this.onReady();

      if (this.loggingEnabled) {
        console.log("Component successfully registered with payload:", payload);
      }
    } else if (payload.action === "themes") {
      this.activateThemes(payload.data.themes);
    } else if (payload.original) {
      // get callback from queue
      var originalMessage = this.sentMessages.filter(function (message) {
        return message.messageId === payload.original.messageId;
      })[0];

      if (originalMessage.callback) {
        originalMessage.callback(payload.data);
      }
    }
  }

  onReady() {
    for (var message of this.messageQueue) {
      this.postMessage(message.action, message.data, message.callback);
    }
    this.messageQueue = [];

    if (this.onReadyCallback) {
      this.onReadyCallback();
    }
  }

  setComponentDataValueForKey(key, value) {
    this.componentData[key] = value;
    this.postMessage("set-component-data", { componentData: this.componentData }, function (data) {});
  }

  clearComponentData() {
    this.componentData = {};
    this.postMessage("set-component-data", { componentData: this.componentData }, function (data) {});
  }

  componentDataValueForKey(key) {
    return this.componentData[key];
  }

  postMessage(action, data, callback) {
    if (!this.sessionKey) {
      this.messageQueue.push({
        action: action,
        data: data,
        callback: callback
      });
      return;
    }

    var message = {
      action: action,
      data: data,
      messageId: this.generateUUID(),
      sessionKey: this.sessionKey,
      permissions: this.permissions,
      api: "component"
    };

    var sentMessage = JSON.parse(JSON.stringify(message));
    sentMessage.callback = callback;
    this.sentMessages.push(sentMessage);

    if (this.loggingEnabled) {
      console.log("Posting message:", message);
    }

    window.parent.postMessage(message, '*');
  }

  setSize(type, width, height) {
    this.postMessage("set-size", { type: type, width: width, height: height }, function (data) {});
  }

  streamItems(callback) {
    this.postMessage("stream-items", { content_types: ["Tag"] }, function (data) {
      var tags = data.items;
      callback(tags);
    }.bind(this));
  }

  streamContextItem(callback) {
    this.postMessage("stream-context-item", null, function (data) {
      var item = data.item;
      callback(item);
    }.bind(this));
  }

  selectItem(item) {
    this.postMessage("select-item", { item: this.jsonObjectForItem(item) });
  }

  createItem(item) {
    this.postMessage("create-item", { item: this.jsonObjectForItem(item) }, function (data) {
      var item = data.item;
      this.associateItem(item);
    }.bind(this));
  }

  associateItem(item) {
    this.postMessage("associate-item", { item: this.jsonObjectForItem(item) });
  }

  deassociateItem(item) {
    this.postMessage("deassociate-item", { item: this.jsonObjectForItem(item) });
  }

  clearSelection() {
    this.postMessage("clear-selection", { content_type: "Tag" });
  }

  deleteItem(item) {
    this.deleteItems([item]);
  }

  deleteItems(items) {
    var params = {
      items: items.map(function (item) {
        return this.jsonObjectForItem(item);
      }.bind(this))
    };
    this.postMessage("delete-items", params);
  }

  saveItem(item) {
    this.saveItems[item];
  }

  saveItems(items) {
    items = items.map(function (item) {
      return this.jsonObjectForItem(item);
    }.bind(this));

    this.postMessage("save-items", { items: items }, function (data) {});
  }

  jsonObjectForItem(item) {
    var copy = Object.assign({}, item);
    copy.children = null;
    copy.parent = null;
    return copy;
  }

  /* Themes */

  activateThemes(urls) {
    this.deactivateAllCustomThemes();

    if (this.loggingEnabled) {
      console.log("Activating themes:", urls);
    }

    if (!urls) {
      return;
    }

    for (var url of urls) {
      if (!url) {
        continue;
      }

      var link = document.createElement("link");
      link.href = url;
      link.type = "text/css";
      link.rel = "stylesheet";
      link.media = "screen,print";
      link.className = "custom-theme";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
  }

  deactivateAllCustomThemes() {
    var elements = document.getElementsByClassName("custom-theme");

    [].forEach.call(elements, function (element) {
      if (element) {
        element.disabled = true;
        element.parentNode.removeChild(element);
      }
    });
  }

  /* Utilities */

  generateUUID() {
    var crypto = window.crypto || window.msCrypto;
    if (crypto) {
      var buf = new Uint32Array(4);
      crypto.getRandomValues(buf);
      var idx = -1;
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        idx++;
        var r = buf[idx >> 3] >> idx % 8 * 4 & 15;
        var v = c == 'x' ? r : r & 0x3 | 0x8;
        return v.toString(16);
      });
    } else {
      var d = new Date().getTime();
      if (window.performance && typeof window.performance.now === "function") {
        d += performance.now(); //use high-precision timer if available
      }
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
      });
      return uuid;
    }
  }
}

window.ComponentManager = ComponentManager;


},{}]},{},[1]);
