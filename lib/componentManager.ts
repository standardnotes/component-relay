import { generateUuid, isValidJsonString } from "./utils";
import Logger from "./logger";
import { ComponentAction, ContentType, Environment, Platform, SNItem } from "@standardnotes/snjs";

const DEFAULT_COALLESED_SAVING_DELAY = 250;

enum MessagePayloadApi {
  Component = "component",
}

type Component = {
  uuid?: string;
  origin?: string;
  data?: Record<string, any>;
  sessionKey?: string;
  environment?: Environment;
  platform?: Platform;
  isMobile?: boolean;
  acceptsThemes?: boolean;
  activeThemes?: string[];
  activeThemeUrls?: string[];
}

type MessagePayload = {
  action: ComponentAction;
  data: Record<string, any>;
  componentData?: Record<string, any>;
  messageId?: string;
  sessionKey?: string;
  api: MessagePayloadApi;
  original?: MessagePayload;
  callback?: (...params: any) => void;
}

type ComponentManagerOptions = {
  coallesedSaving?: boolean,
  coallesedSavingDelay?: number,
  debug?: boolean,
  acceptsThemes?: boolean
}

type PermissionObject = {
  name: ComponentAction
}

type ComponentManagerParams = {
  initialPermissions?: PermissionObject[]
  options?: ComponentManagerOptions,
  onReady?: () => void
}

export default class ComponentManager {
  private initialPermissions?: PermissionObject[];
  private onReadyCallback?: () => void;
  private component: Component = { activeThemes: [], acceptsThemes: true };
  private sentMessages?: MessagePayload[] = [];
  private messageQueue?: MessagePayload[] = [];
  private lastStreamedItem?: SNItem;
  private pendingSaveItems?: SNItem[];
  private pendingSaveTimeout?: NodeJS.Timeout;
  private pendingSaveParams?: any;
  private coallesedSaving = false;
  private coallesedSavingDelay = DEFAULT_COALLESED_SAVING_DELAY;

  constructor(private contentWindow: Window, params?: ComponentManagerParams) {
    if (!contentWindow) {
      throw new Error("contentWindow must be a valid Window object.");
    }
    if (params) {
      this.processParameters(params);
    }
    this.registerMessageHandler();
  }

  private processParameters(params: ComponentManagerParams) {
    const { initialPermissions, options, onReady } = params;

    if (initialPermissions && initialPermissions.length > 0) {
      this.initialPermissions = initialPermissions;
    }
    if (options?.coallesedSaving) {
      this.coallesedSaving = options.coallesedSaving;
    }
    if (options?.coallesedSavingDelay) {
      this.coallesedSavingDelay = options.coallesedSavingDelay;
    }
    if (options?.acceptsThemes) {
      this.component.acceptsThemes = options?.acceptsThemes ?? true;
    }
    if (onReady) {
      this.onReadyCallback = onReady;
    }
    Logger.enabled = options?.debug ?? false;
  }

  private registerMessageHandler() {
    const messageHandler = (event: MessageEvent) => {
      Logger.info("Components API Message received:", event.data);

      /**
       * We don't have access to window.parent.origin due to cross-domain restrictions.
       * Check referrer if available, otherwise defer to checking for first-run value.
       * Craft URL objects so that example.com === example.com/
       */
      if (document.referrer) {
        const referrer = new URL(document.referrer).origin;
        const eventOrigin = new URL(event.origin).origin;

        if (referrer !== eventOrigin) {
          return;
        }
      }

      /**
       * The first message will be the most reliable one, so we won't change it after any subsequent events,
       * in case you receive an event from another window.
       */
      if (!this.component.origin) {
        this.component.origin = event.origin;
      } else if (event.origin !== this.component.origin) {
        // If event origin doesn't match first-run value, return.
        return;
      }

      // Mobile environment sends data as JSON string.
      const { data } = event;
      const parsedData = isValidJsonString(data) ? JSON.parse(data) : data;

      if (!parsedData) {
        Logger.error("Invalid data received. Skipping...");
        return;
      }

      this.handleMessage(parsedData);
    }

    /**
     * Mobile (React Native) uses `document`, web/desktop uses `window`.addEventListener
     * for postMessage API to work properly.
     * Update May 2019:
     * As part of transitioning React Native webview into the community package,
     * we'll now only need to use window.addEventListener.
     * However, we want to maintain backward compatibility for Mobile < v3.0.5, so we'll keep document.addEventListener
     * Also, even with the new version of react-native-webview, Android may still require document.addEventListener (while iOS still only requires window.addEventListener)
     * https://github.com/react-native-community/react-native-webview/issues/323#issuecomment-467767933
     */
    this.contentWindow.document.addEventListener("message", function (event) {
      messageHandler(event as MessageEvent);
    }, false);

    this.contentWindow.addEventListener("message", function (event) {
      messageHandler(event);
    }, false);

    Logger.info("Waiting for messages...");
  }

  private handleMessage(payload: MessagePayload) {
    switch (payload.action) {
      case ComponentAction.ComponentRegistered:
        this.component.sessionKey = payload.sessionKey;
        this.component.data = payload.componentData;
        this.onReady(payload.data);
        Logger.info("Component successfully registered with payload:", payload);
        break;

      case ComponentAction.ActivateThemes:
        this.activateThemes(payload.data.themes);
        break;

      default:
        if (!payload.original) {
          return;
        }

        // Get the callback from queue.
        const originalMessage = this.sentMessages!.filter((message: MessagePayload) => {
          return message.messageId === payload.original!.messageId;
        })[0];
  
        if (!originalMessage) {
          // Connection must have been reset. We should alert the user.
          Logger.error("This extension is attempting to communicate with Standard Notes, but an error is preventing it from doing so. Please restart this extension and try again.");
        }
  
        if (originalMessage.callback) {
          originalMessage.callback(payload.data);
        }
        break;
    }
  }

  private onReady(data: Component) {
    this.component.environment = data.environment;
    this.component.platform = data.platform;
    this.component.uuid = data.uuid;

    if (this.initialPermissions && this.initialPermissions.length > 0) {
      this.requestPermissions(this.initialPermissions);
    }

    for (const message of this.messageQueue!) {
      this.postMessage(message.action, message.data, message.callback);
    }

    this.messageQueue = [];

    Logger.info("Data passed to onReady:", data);

    this.activateThemes(data.activeThemeUrls || []);

    if (this.onReadyCallback) {
      this.onReadyCallback();
    }
  }

  public getSelfComponentUUID() {
    return this.component.uuid;
  }

  public isRunningInDesktopApplication() {
    return this.component.environment === Environment.Desktop;
  }

  public isRunningInMobileApplication() {
    return this.component.environment === Environment.Mobile;
  }

  public getComponentDataValueForKey(key: string) {
    if (!this.component.data) {
      return;
    }
    return this.component.data![key];
  }

  public setComponentDataValueForKey(key: string, value: any) {
    if (!this.component.data) {
      throw new Error("The component has not been initialized.");
    }
    if (!key || (key && key.length === 0)) {
      throw new Error("The key for the data value should be a valid string.");
    }
    this.component.data![key] = value;
    this.postMessage(ComponentAction.SetComponentData, { componentData: this.component.data });
  }

  public clearComponentData() {
    this.component.data = {};
    this.postMessage(ComponentAction.SetComponentData, { componentData: this.component.data });
  }

  private postMessage(action: ComponentAction, data: Record<string, any>, callback?: (...params: any) => void) {
    if (!this.component.sessionKey) {
      this.messageQueue!.push({
        action: action,
        data: data,
        api: MessagePayloadApi.Component,
        callback: callback
      });
      return;
    }

    const message = {
      action: action,
      data: data,
      messageId: this.generateUUID(),
      sessionKey: this.component.sessionKey,
      api: MessagePayloadApi.Component
    };

    const sentMessage = JSON.parse(JSON.stringify(message));
    sentMessage.callback = callback;
    this.sentMessages!.push(sentMessage);

    let postMessagePayload;

    // Mobile (React Native) requires a string for the postMessage API.
    if (this.isRunningInMobileApplication()) {
      postMessagePayload = JSON.stringify(message);
    } else {
      postMessagePayload = message;
    }

    Logger.info("Posting message:", postMessagePayload);
    this.contentWindow.parent.postMessage(postMessagePayload, this.component.origin!);
  }

  private requestPermissions(permissions: PermissionObject[], callback?: (...params: any) => void) {
    this.postMessage(ComponentAction.RequestPermissions, permissions, () => {
      callback && callback();
    });
  }

  private activateThemes(incomingUrls: string[] = []) {
    if (!this.component.acceptsThemes) {
      return;
    }

    Logger.info("Incoming themes:", incomingUrls);

    if (this.component.activeThemes!.sort().toString() == incomingUrls.sort().toString()) {
      // Incoming theme URLs are same as active, do nothing.
      return;
    }

    let themesToActivate = incomingUrls;
    const themesToDeactivate = [];

    for (const activeUrl of this.component.activeThemes!) {
      if (!incomingUrls.includes(activeUrl)) {
        // Active not present in incoming, deactivate it.
        themesToDeactivate.push(activeUrl);
      } else {
        // Already present in active themes, remove it from themesToActivate.
        themesToActivate = themesToActivate.filter((candidate) => {
          return candidate !== activeUrl;
        });
      }
    }

    Logger.info("Deactivating themes:", themesToDeactivate);
    Logger.info("Activating themes:", themesToActivate);

    for (const themeUrl of themesToDeactivate) {
      this.deactivateTheme(themeUrl);
    }

    this.component.activeThemes = incomingUrls;

    for (const themeUrl of themesToActivate) {
      if (!themeUrl) {
        continue;
      }

      const link = this.contentWindow.document.createElement("link");
      link.id = btoa(themeUrl);
      link.href = themeUrl;
      link.type = "text/css";
      link.rel = "stylesheet";
      link.media = "screen,print";
      link.className = "custom-theme";
      this.contentWindow.document.getElementsByTagName("head")[0].appendChild(link);
    }
  }

  private themeElementForUrl(themeUrl: string) {
    const elements = Array.from(this.contentWindow.document.getElementsByClassName("custom-theme")).slice();
    return elements.find((element) => {
      // We used to search here by `href`, but on desktop, with local file:// urls, that didn't work for some reason.
      return element.id == btoa(themeUrl);
    });
  }

  private deactivateTheme(themeUrl: string) {
    const element = this.themeElementForUrl(themeUrl);
    if (element) {
      element!.setAttribute("disabled", "true");
      element!.parentNode!.removeChild(element!);
    }
  }

  private generateUUID() {
    return generateUuid();
  }

  /** Components actions */

  public streamItems(contentTypes: ContentType[], callback: (data: any) => void) {
    this.postMessage(ComponentAction.StreamItems, { content_types: contentTypes }, (data: any) => {
      callback(data.items);
    });
  }

  public streamContextItem(callback: (data: any) => void) {
    this.postMessage(ComponentAction.StreamContextItem, {}, (data) => {
      const { item } = data;
      /**
       * If this is a new context item than the context item the component was currently entertaining,
       * we want to immediately commit any pending saves, because if you send the new context item to the
       * component before it has commited its presave, it will end up first replacing the UI with new context item,
       * and when the debouncer executes to read the component UI, it will be reading the new UI for the previous item.
       */
      const isNewItem = !this.lastStreamedItem || this.lastStreamedItem.uuid !== item.uuid;

      if (isNewItem && this.pendingSaveTimeout) {
        clearTimeout(this.pendingSaveTimeout);
        this._performSavingOfItems(this.pendingSaveParams);
        this.pendingSaveTimeout = undefined;
        this.pendingSaveParams = undefined;
      }

      this.lastStreamedItem = item;
      callback(this.lastStreamedItem);
    });
  }

  /**
   * Selects an item which content_type must be "Tag".
   * @param item the item to select.
   */
  public selectItem(item: SNItem) {
    if (item.content_type !== ContentType.Tag) {
      return;
    }
    this.postMessage(ComponentAction.SelectItem, { item: this.jsonObjectForItem(item) });
  }

  /**
   * Clears current selected tags.
   */
  public clearSelection() {
    this.postMessage(ComponentAction.ClearSelection, { content_type: ContentType.Tag });
  }

  public createItem(item: SNItem, callback: (data: any) => void) {
    this.postMessage(ComponentAction.CreateItem, { item: this.jsonObjectForItem(item) }, (data: any) => {
      let { item } = data;
      /**
       * A previous version of the SN app had an issue where the item in the reply to create-item
       * would be nested inside "items" and not "item". So handle both cases here.
       */
      if (!item && data.items && data.items.length > 0) {
        item = data.items[0];
      }
      this.associateItem(item);
      callback && callback(item);
    });
  }

  public createItems(items: SNItem[], callback: (data: any) => void) {
    const mapped = items.map((item) => this.jsonObjectForItem(item));
    this.postMessage(ComponentAction.CreateItems, { items: mapped }, (data: any) => {
      callback && callback(data.items);
    });
  }

  public associateItem(item: SNItem) {
    this.postMessage(ComponentAction.AssociateItem, { item: this.jsonObjectForItem(item) });
  }

  public deassociateItem(item: SNItem) {
    this.postMessage(ComponentAction.DeassociateItem, {item: this.jsonObjectForItem(item)} );
  }

  public deleteItem(item: SNItem, callback: (data: any) => void) {
    this.deleteItems([item], callback);
  }

  public deleteItems(items: SNItem[], callback: (data: any) => void) {
    const params = {
      items: items.map((item: SNItem) => {
        return this.jsonObjectForItem(item);
      }),
    };
    this.postMessage(ComponentAction.DeleteItems, params, (data) => {
      callback && callback(data);
    });
  }

  public sendCustomEvent(action: ComponentAction, data: any, callback: (data: any) => void) {
    this.postMessage(action, data, (data: any) => {
      callback && callback(data);
    });
  }

  public saveItem(item: SNItem, callback: (data: any) => void, skipDebouncer = false) {
    this.saveItems([item], callback, skipDebouncer);
  }

  /**
   * @param item The item to be saved.
   * @param presave Allows clients to perform any actions last second before the save actually occurs (like setting previews).
   * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
   * hook into the debounce cycle so that clients don't have to implement their own debouncing.
   * @param callback
   */
  public saveItemWithPresave(item: SNItem, presave: any, callback: (data: any) => void) {
    this.saveItemsWithPresave([item], presave, callback);
  }

  /**
   * @param items The items to be saved.
   * @param presave Allows clients to perform any actions last second before the save actually occurs (like setting previews).
   * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
   * hook into the debounce cycle so that clients don't have to implement their own debouncing.
   * @param callback
   */
  public saveItemsWithPresave(items: SNItem[], presave: any, callback: (data: any) => void) {
    this.saveItems(items, callback, false, presave);
  }

  private _performSavingOfItems({ items, presave, callback }: { items: SNItem[], presave: () => void, callback: () => void }) {
    /**
     * Presave block allows client to gain the benefit of performing something in the debounce cycle.
     */
    presave && presave();

    const mappedItems = [];
    for (const item of items) {
      mappedItems.push(this.jsonObjectForItem(item));
    }

    this.postMessage(ComponentAction.SaveItems, { items: mappedItems }, () => {
      callback && callback();
    });
  }

  /**
   * @param items The items to be saved.
   * @param callback
   * @param skipDebouncer Allows saves to go through right away rather than waiting for timeout.
   * This should be used when saving items via other means besides keystrokes.
   * @param presave
   */
  public saveItems(items: SNItem[], callback: (...data: any) => void, skipDebouncer = false, presave?: any) {
    /**
     * We need to make sure that when we clear a pending save timeout,
     * we carry over those pending items into the new save.
     */
    if (!this.pendingSaveItems) {
      this.pendingSaveItems = [];
    }

    if (this.coallesedSaving === true && !skipDebouncer) {
      if (this.pendingSaveTimeout) {
        clearTimeout(this.pendingSaveTimeout);
      }

      const incomingIds = items.map((item: SNItem) => item.uuid);
      /**
       * Replace any existing save items with incoming values.
       * Only keep items here who are not in incomingIds.
       */
      const preexistingItems = this.pendingSaveItems.filter((item) => {
        return !incomingIds.includes(item.uuid);
      });

      // Add new items, now that we've made sure it's cleared of incoming items.
      this.pendingSaveItems = preexistingItems.concat(items);

      // We'll potentially need to commit early if stream-context-item message comes in.
      this.pendingSaveParams = {
        items: this.pendingSaveItems,
        presave: presave,
        callback: callback
      };

      this.pendingSaveTimeout = setTimeout(() => {
        this._performSavingOfItems(this.pendingSaveParams);
        this.pendingSaveItems = [];
        this.pendingSaveTimeout = undefined;
        this.pendingSaveParams = null;
      }, this.coallesedSavingDelay);
    } else {
      this._performSavingOfItems({ items, presave, callback });
    }
  }

  public setSize(type: string, width: string | number, height: string | number) {
    this.postMessage(ComponentAction.SetSize, { type, width, height });
  }

  private jsonObjectForItem(item: any) {
    const copy = Object.assign({}, item);
    copy.children = null;
    copy.parent = null;
    return copy;
  }

  public getItemAppDataValue(item: SNItem, key: string) {
    const appDomain = "org.standardnotes.sn";
    const { safeContent } = item.payload;
    const data = safeContent.appData && safeContent.appData[appDomain];
    return (data) ? data[key] : null;
  }
}
