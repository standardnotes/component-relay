class ComponentManager {

  constructor(loggingEnabled) {
    this.sentMessages = [];
    this.messageQueue = [];

    window.addEventListener("message", function(event){
      if(loggingEnabled) {
        console.log("Components API Message received:", event.data);
      }
      this.handleMessage(event.data);
    }.bind(this), false);
  }

  handleMessage(payload) {
    if(payload.action === "component-registered") {
      this.sessionKey = payload.sessionKey;
      this.onReady();
    }

    else if(payload.original) {
      // get callback from queue
      var originalMessage = this.sentMessages.filter(function(message){
        return message.messageId === payload.original.messageId;
      })[0];

      if(originalMessage.callback) {
        originalMessage.callback(payload.data);
      }
    }
  }

  onReady() {
    for(var message of this.messageQueue) {
      this.postMessage(message.action, message.data, message.callback);
    }
    this.messageQueue = [];
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

    window.parent.postMessage(message, '*');
  }

  setSize(type, width, height) {
    this.postMessage("set-size", {type: type, width: width, height: height}, function(data){

    })
  }

  streamItems(callback) {
    this.postMessage("stream-items", {content_types: ["Tag"]}, function(data){
      var tags = data.items;
      callback(tags);
    }.bind(this));
  }

  streamReferences(callback) {
    this.postMessage("stream-references", {}, function(data){
      var references = data.references;
      var tagRefs = references.filter(function(ref){
        return ref.content_type === "Tag";
      })
      callback(tagRefs);
    }.bind(this));
  }

  selectItem(item) {
    this.postMessage("select-item", {item: this.jsonObjectForItem(item)});
  }

  createItem(item) {
    this.postMessage("create-item", {item: this.jsonObjectForItem(item)}, function(data){
      var item = data.item;
      this.associateItem(item);
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

  deleteItem(item) {
    this.postMessage("delete-item", {item: this.jsonObjectForItem(item)});
  }


  saveItem(item) {
    this.saveItems[item];
  }

  saveItems(items) {
    items = items.map(function(item) {
      return this.jsonObjectForItem(item);
    }.bind(this));

    this.postMessage("save-items", {items: items}, function(data){

    });
  }

  jsonObjectForItem(item) {
    var copy = Object.assign({}, item);
    copy.children = null;
    copy.parent = null;
    return copy;
  }

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

window.ComponentManager = ComponentManager;
