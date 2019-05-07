class ComponentManager {

  constructor(permissions, onReady) {
    this.sentMessages = [];
    this.messageQueue = [];
    this.loggingEnabled = false;
    this.acceptsThemes = true;
    this.activeThemes = [];

    this.initialPermissions = permissions;
    this.onReadyCallback = onReady;

    this.coallesedSaving = true;
    this.coallesedSavingDelay = 250;

    this.registerMessageHandler();
  }

  registerMessageHandler() {
    let messageHandler = (event) => {
      if (this.loggingEnabled) { console.log("Components API Message received:", event.data)}

      // The first message will be the most reliable one, so we won't change it after any subsequent events,
      // in case you receive an event from another window.
      if(!this.origin) {
        this.origin = event.origin;
      }

      // Mobile environment sends data as JSON string
      let data = event.data;
      let parsedData = typeof data === "string" ? JSON.parse(data) : data;
      this.handleMessage(parsedData);
    }

    /*
      Mobile (React Native) uses `document`, web/desktop uses `window`.addEventListener
      for postMessage API to work properly.

      Update May 2019:
      As part of transitioning React Native webview into the community package,
      we'll now only need to use window.addEventListener.

      However, we want to maintain backward compatibility for Mobile < v3.0.5, so we'll keep document.addEventListener

      Also, even with the new version of react-native-webview, Android may still require document.addEventListener (while iOS still only requires window.addEventListener)
      https://github.com/react-native-community/react-native-webview/issues/323#issuecomment-467767933
     */

    document.addEventListener("message", function (event) {
      messageHandler(event);
    }, false);

    window.addEventListener("message", function (event) {
      messageHandler(event);
    }, false);
  }

  handleMessage(payload) {
    if(payload.action === "component-registered") {
      this.sessionKey = payload.sessionKey;
      this.componentData = payload.componentData;

      this.onReady(payload.data);

      if(this.loggingEnabled) {
        console.log("Component successfully registered with payload:", payload);
      }

    } else if(payload.action === "themes") {
      if(this.acceptsThemes) {
        this.activateThemes(payload.data.themes);
      }
    }

    else if(payload.original) {
      // get callback from queue
      var originalMessage = this.sentMessages.filter(function(message){
        return message.messageId === payload.original.messageId;
      })[0];

      if(!originalMessage) {
        // Connection must have been reset. Alert the user.
        alert("This extension is attempting to communicate with Standard Notes, but an error is preventing it from doing so. Please restart this extension and try again.")
      }

      if(originalMessage.callback) {
        originalMessage.callback(payload.data);
      }
    }
  }

  onReady(data) {
    this.environment = data.environment;
    this.platform = data.platform;
    this.uuid = data.uuid;
    this.isMobile = this.environment == "mobile";

    if(this.initialPermissions && this.initialPermissions.length > 0) {
      this.requestPermissions(this.initialPermissions);
    }

    for(var message of this.messageQueue) {
      this.postMessage(message.action, message.data, message.callback);
    }

    this.messageQueue = [];

    if(this.loggingEnabled) { console.log("onReadyData", data); }

    this.activateThemes(data.activeThemeUrls || []);

    if(this.onReadyCallback) {
      this.onReadyCallback();
    }
  }

  getSelfComponentUUID() {
    return this.uuid;
  }

  isRunningInDesktopApplication() {
    return this.environment === "desktop";
  }

  setComponentDataValueForKey(key, value) {
    this.componentData[key] = value;
    this.postMessage("set-component-data", {componentData: this.componentData}, function(data){});
  }

  clearComponentData() {
    this.componentData = {};
    this.postMessage("set-component-data", {componentData: this.componentData}, function(data){});
  }

  componentDataValueForKey(key) {
    return this.componentData[key];
  }

  postMessage(action, data, callback) {
    if(!this.sessionKey) {
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
      api: "component"
    }

    var sentMessage = JSON.parse(JSON.stringify(message));
    sentMessage.callback = callback;
    this.sentMessages.push(sentMessage);

    // Mobile (React Native) requires a string for the postMessage API.
    if(this.isMobile) {
      message = JSON.stringify(message);
    }

    if(this.loggingEnabled) {
      console.log("Posting message:", message);
    }

    window.parent.postMessage(message, this.origin);
  }

  setSize(type, width, height) {
    this.postMessage("set-size", {type: type, width: width, height: height}, function(data){

    })
  }

  requestPermissions(permissions, callback) {
    this.postMessage("request-permissions", {permissions: permissions}, function(data){
      callback && callback();
    }.bind(this));
  }

  streamItems(contentTypes, callback) {
    if(!Array.isArray(contentTypes)) {
      contentTypes = [contentTypes];
    }
    this.postMessage("stream-items", {content_types: contentTypes}, function(data){
      callback(data.items);
    }.bind(this));
  }

  streamContextItem(callback) {
    this.postMessage("stream-context-item", null, (data) => {
      var item = data.item;
      /*
        When an item is saved via saveItem, its updated_at value is set client side to the current date.
        If we make a change locally, then for whatever reason receive an item via streamItems/streamContextItem,
        we want to ignore that change if it was made prior to the latest change we've made.

        Update 1/22/18: However, if a user is restoring a note from version history, this change
        will not pass through this filter and will thus be ignored. Because the client now handles
        this case with isMetadataUpdate, we no longer need the below.
      */
      // if(this.streamedContextItem && this.streamedContextItem.uuid == item.uuid
      //   && this.streamedContextItem.updated_at > item.updated_at) {
      //   return;
      // }
      // this.streamedContextItem = item;
      callback(item);
    });
  }

  selectItem(item) {
    this.postMessage("select-item", {item: this.jsonObjectForItem(item)});
  }

  createItem(item, callback) {
    this.postMessage("create-item", {item: this.jsonObjectForItem(item)}, function(data){
      var item = data.item;

      // A previous version of the SN app had an issue where the item in the reply to create-item
      // would be nested inside "items" and not "item". So handle both cases here.
      if(!item && data.items && data.items.length > 0) {
        item = data.items[0];
      }

      this.associateItem(item);
      callback && callback(item);
    }.bind(this));
  }

  createItems(items, callback) {
    let mapped = items.map((item) => {return this.jsonObjectForItem(item)});
    this.postMessage("create-items", {items: mapped}, function(data){
      callback && callback(data.items);
    }.bind(this));
  }

  associateItem(item) {
    this.postMessage("associate-item", {item: this.jsonObjectForItem(item)});
  }

  deassociateItem(item) {
    this.postMessage("deassociate-item", {item: this.jsonObjectForItem(item)});
  }

  clearSelection() {
    this.postMessage("clear-selection", {content_type: "Tag"});
  }

  deleteItem(item, callback) {
    this.deleteItems([item], callback);
  }

  deleteItems(items, callback) {
    var params = {
      items: items.map(function(item){
        return this.jsonObjectForItem(item);
      }.bind(this))
    };

    this.postMessage("delete-items", params, (data) => {
      callback && callback(data);
    });
  }

  sendCustomEvent(action, data, callback) {
    this.postMessage(action, data, function(data){
      callback && callback(data);
    }.bind(this));
  }

  saveItem(item, callback, skipDebouncer = false) {
    this.saveItems([item], callback, skipDebouncer);
  }

  /* Presave allows clients to perform any actions last second before the save actually occurs (like setting previews).
     Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
     hook into the debounce cycle so that clients don't have to implement their own debouncing.
   */

  saveItemWithPresave(item, presave, callback) {
    this.saveItemsWithPresave([item], presave, callback);
  }

  saveItemsWithPresave(items, presave, callback) {
    this.saveItems(items, callback, false, presave);
  }

  /*
  skipDebouncer allows saves to go through right away rather than waiting for timeout.
  This should be used when saving items via other means besides keystrokes.
   */
  saveItems(items, callback, skipDebouncer = false, presave) {
    let saveBlock = (itemsToSave) => {
      // presave block allows client to gain the benefit of performing something in the debounce cycle.
      presave && presave();

      let mappedUuids = [];
      let mappedItems = [];
      for(let item of itemsToSave) {
        // To prevent duplicates
        if(mappedUuids.includes(item.uuid)) {
          continue;
        }

        mappedUuids.push(item.uuid);
        item.updated_at = new Date();
        mappedItems.push(this.jsonObjectForItem(item));
      }

      this.postMessage("save-items", {items: mappedItems}, (data) => {
        callback && callback();
      });
    }

    /*
      Coallesed saving prevents saves from being made after every keystroke, and instead
      waits coallesedSavingDelay before performing action. For example, if a user types a keystroke, and the clienet calls saveItem,
      a 250ms delay will begin. If they type another keystroke within 250ms, the previously pending
      save will be cancelled, and another 250ms delay occurs. If ater 250ms the pending delay is not cleared by a future call,
      the save will finally trigger.

      Note: it's important to modify saving items updated_at immediately and not after delay. If you modify after delay,
      a delayed sync could just be wrapping up, and will send back old data and replace what the user has typed.

    */

    // We also need to make sure that when we clear a pending save timeout, we carry over those pending items into the new save.
    if(!this.pendingSaveItems) { this.pendingSaveItems = [];}

    if(this.coallesedSaving == true && !skipDebouncer) {
      if(this.pendingSave) {
        clearTimeout(this.pendingSave);
      }

      this.pendingSaveItems = this.pendingSaveItems.concat(items);
      this.pendingSave = setTimeout(() => {
        saveBlock(this.pendingSaveItems);
        // Clear pending save items
        this.pendingSaveItems = [];
      }, this.coallesedSavingDelay);
    } else {
      saveBlock(items);
    }
  }

  jsonObjectForItem(item) {
    var copy = Object.assign({}, item);
    copy.children = null;
    copy.parent = null;
    return copy;
  }

  getItemAppDataValue(item, key) {
    let AppDomain = "org.standardnotes.sn";
    var data = item.content.appData && item.content.appData[AppDomain];
    if(data) {
      return data[key];
    } else {
      return null;
    }
  }

  /* Themes */

  activateThemes(incomingUrls) {
    if(this.loggingEnabled) { console.log("Incoming themes", incomingUrls); }
    if(this.activeThemes.sort().toString() == incomingUrls.sort().toString()) {
      // incoming are same as active, do nothing
      return;
    }

    let themesToActivate = incomingUrls || [];
    let themesToDeactivate = [];

    for(var activeUrl of this.activeThemes) {
      if(!incomingUrls.includes(activeUrl)) {
        // active not present in incoming, deactivate it
        themesToDeactivate.push(activeUrl);
      } else {
        // already present in active themes, remove it from themesToActivate
        themesToActivate = themesToActivate.filter((candidate) => {
          return candidate != activeUrl;
        })
      }
    }

    if(this.loggingEnabled) {
      console.log("Deactivating themes:", themesToDeactivate);
      console.log("Activating themes:", themesToActivate);
    }

    for(var theme of themesToDeactivate) {
      this.deactivateTheme(theme);
    }

    this.activeThemes = incomingUrls;

    for(var url of themesToActivate) {
      if(!url) {
        continue;
      }

      var link = document.createElement("link");
      link.id = btoa(url);
      link.href = url;
      link.type = "text/css";
      link.rel = "stylesheet";
      link.media = "screen,print";
      link.className = "custom-theme";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
  }

  themeElementForUrl(url) {
    var elements = Array.from(document.getElementsByClassName("custom-theme")).slice();
    return elements.find((element) => {
      // We used to search here by `href`, but on desktop, with local file:// urls, that didn't work for some reason.
      return element.id == btoa(url);
    })
  }

  deactivateTheme(url) {
    let element = this.themeElementForUrl(url);
    if(element) {
      element.disabled = true;
      element.parentNode.removeChild(element);
    }
  }

  /* Theme caching is currently disabled. Might be enabled in the future if neccessary. */
  /*
  activateCachedThemes() {
    let themes = this.getCachedThemeUrls();
    let writeToCache = false;
    if(this.loggingEnabled) { console.log("Activating cached themes", themes); }
    this.activateThemes(themes, writeToCache);
  }

  cacheThemeUrls(urls) {
    if(this.loggingEnabled) { console.log("Caching theme urls", urls); }
    localStorage.setItem("cachedThemeUrls", JSON.stringify(urls));
  }

  decacheThemeUrls() {
    localStorage.removeItem("cachedThemeUrls");
  }

  getCachedThemeUrls() {
    let urls = localStorage.getItem("cachedThemeUrls");
    if(urls) {
      return JSON.parse(urls);
    } else {
      return [];
    }
  }
  */


  /* Utilities */


  generateUUID() {
    var crypto = window.crypto || window.msCrypto;
    if(crypto) {
      var buf = new Uint32Array(4);
      crypto.getRandomValues(buf);
      var idx = -1;
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          idx++;
          var r = (buf[idx>>3] >> ((idx%8)*4))&15;
          var v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });
    } else {
      var d = new Date().getTime();
      if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
      }
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
      });
      return uuid;
    }
  }
}


if(typeof module != "undefined" && typeof module.exports != "undefined") {
  module.exports = ComponentManager;
}

if(window) {
  window.ComponentManager = ComponentManager;
}
