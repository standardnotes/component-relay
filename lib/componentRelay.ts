import {
  AppDataField,
  ComponentAction,
  ContentType,
  Environment,
} from './snjsTypes'
import type {
  ComponentPermission,
  ItemMessagePayload,
  MessageData,
  SNItem,
  UuidString
} from '@standardnotes/snjs'
import {
  environmentToString,
  generateUuid,
  isValidJsonString
} from './utils'
import Logger from './logger'

const DEFAULT_COALLESED_SAVING_DELAY = 250

enum MessagePayloadApi {
  Component = 'component',
}

type Component = {
  uuid?: string;
  origin?: string;
  data?: ComponentData;
  sessionKey?: string;
  environment?: string;
  platform?: string;
  isMobile?: boolean;
  acceptsThemes: boolean;
  activeThemes: string[];
}

type ComponentData = {
  [key: string]: any
}

type MessagePayload = {
  action: ComponentAction;
  data: MessageData;
  componentData?: ComponentData;
  messageId?: UuidString;
  sessionKey?: UuidString;
  api: MessagePayloadApi;
  original?: MessagePayload;
  callback?: (...params: any) => void;
}

type ComponentRelayOptions = {
  coallesedSaving?: boolean,
  coallesedSavingDelay?: number,
  /**
   * Outputs debugging information to console.
   */
  debug?: boolean,
  /**
   * Indicates whether or not the component accepts themes.
   */
  acceptsThemes?: boolean
}

type ComponentRelayParams = {
  /**
   * Represents the window object that the component is running in.
   */
  targetWindow: Window
  /**
   * A collection of permissions that the component can request
   * access once it's ready.
   */
  initialPermissions?: ComponentPermission[]
  /**
   * The options to initialize
   */
  options?: ComponentRelayOptions,
  /**
   * A callback that is executed after the component has been registered.
   */
  onReady?: () => void
}

type ItemPayload = {
  content_type?: ContentType,
  content?: any,
  [key: string]: any
}

enum KeyboardModifier {
  Shift = 'Shift',
  Ctrl = 'Control',
  Meta = 'Meta'
}

export default class ComponentRelay {
  private contentWindow: Window;
  private initialPermissions?: ComponentPermission[];
  private onReadyCallback?: () => void;
  private component: Component = { activeThemes: [], acceptsThemes: true };
  private sentMessages: MessagePayload[] = [];
  private messageQueue: MessagePayload[] = [];
  private lastStreamedItem?: SNItem;
  private pendingSaveItems?: SNItem[];
  private pendingSaveTimeout?: NodeJS.Timeout;
  private pendingSaveParams?: any;
  private coallesedSaving = false;
  private coallesedSavingDelay = DEFAULT_COALLESED_SAVING_DELAY;
  private messageHandler?: (event: any) => void;
  private keyDownEventListener?: (event: any) => void;

  constructor(params: ComponentRelayParams) {
    if (!params || !params.targetWindow) {
      throw new Error('contentWindow must be a valid Window object.')
    }
    this.contentWindow = params.targetWindow
    this.processParameters(params)
    this.registerMessageHandler()
    this.registerKeyDownEventListener()
  }

  private processParameters(params: ComponentRelayParams) {
    const { initialPermissions, options, onReady } = params

    if (initialPermissions && initialPermissions.length > 0) {
      this.initialPermissions = initialPermissions
    }
    if (options?.coallesedSaving) {
      this.coallesedSaving = options.coallesedSaving
    }
    if (options?.coallesedSavingDelay) {
      this.coallesedSavingDelay = options.coallesedSavingDelay
    }
    if (options?.acceptsThemes) {
      this.component.acceptsThemes = options?.acceptsThemes ?? true
    }
    if (onReady) {
      this.onReadyCallback = onReady
    }
    Logger.enabled = options?.debug ?? false
  }

  public deinit() : void {
    this.onReadyCallback = undefined
    this.component = {
      acceptsThemes: true,
      activeThemes: []
    }
    this.messageQueue = []
    this.sentMessages = []
    this.lastStreamedItem = undefined
    this.pendingSaveItems = undefined
    this.pendingSaveTimeout = undefined
    this.pendingSaveParams = undefined

    if (this.messageHandler) {
      this.contentWindow.document.removeEventListener('message', this.messageHandler)
      this.contentWindow.removeEventListener('message', this.messageHandler)
    }

    if (this.keyDownEventListener) {
      this.contentWindow.document.removeEventListener('keydown', this.keyDownEventListener)
      this.contentWindow.removeEventListener('keydown', this.keyDownEventListener)
    }
  }

  private registerMessageHandler() {
    this.messageHandler = (event: MessageEvent) => {
      Logger.info('Components API Message received:', event.data)

      /**
       * We don't have access to window.parent.origin due to cross-domain restrictions.
       * Check referrer if available, otherwise defer to checking for first-run value.
       * Craft URL objects so that example.com === example.com/
       */
      if (document.referrer) {
        const referrer = new URL(document.referrer).origin
        const eventOrigin = new URL(event.origin).origin

        if (referrer !== eventOrigin) {
          return
        }
      }

      /**
       * The first message will be the most reliable one, so we won't change it after any subsequent events,
       * in case you receive an event from another window.
       */
      if (!this.component.origin) {
        this.component.origin = event.origin
      } else if (event.origin !== this.component.origin) {
        // If event origin doesn't match first-run value, return.
        return
      }

      // Mobile environment sends data as JSON string.
      const { data } = event
      const parsedData = isValidJsonString(data) ? JSON.parse(data) : data

      if (!parsedData) {
        Logger.error('Invalid data received. Skipping...')
        return
      }

      this.handleMessage(parsedData)
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
    this.contentWindow.document.addEventListener('message', this.messageHandler, false)
    this.contentWindow.addEventListener('message', this.messageHandler, false)

    Logger.info('Waiting for messages...')
  }

  private registerKeyDownEventListener() {
    this.keyDownEventListener = (event: KeyboardEvent) => {
      Logger.info(`A key has been pressed: ${event.key}`)

      if (event.ctrlKey) {
        this.keyPressed(KeyboardModifier.Ctrl)
      } else if (event.shiftKey) {
        this.keyPressed(KeyboardModifier.Shift)
      } else if (event.metaKey || event.key === 'Meta') {
        this.keyPressed(KeyboardModifier.Meta)
      }
    }

    this.contentWindow.addEventListener('keydown', this.keyDownEventListener, false)
  }

  private handleMessage(payload: MessagePayload) {
    switch (payload.action) {
      case ComponentAction.ComponentRegistered:
        this.component.sessionKey = payload.sessionKey
        if (payload.componentData) {
          this.component.data = payload.componentData
        }
        this.onReady(payload.data)
        Logger.info('Component successfully registered with payload:', payload)
        break

      case ComponentAction.ActivateThemes:
        this.activateThemes(payload.data.themes)
        break

      default: {
        if (!payload.original) {
          return
        }

        // Get the callback from queue.
        const originalMessage = this.sentMessages?.filter((message: MessagePayload) => {
          return message.messageId === payload.original?.messageId
        })[0]

        if (!originalMessage) {
          // Connection must have been reset. We should alert the user unless it's a reply,
          // in which case we may have been deallocated and reinitialized and lost the
          // original message
          const extensionName = this.contentWindow.document.title
          const alertMessage = (`The extension '${extensionName}' is attempting to communicate with Standard Notes, ` +
            'but an error is preventing it from doing so. Please restart this extension and try again.').replace('  ', ' ')

          Logger.info(alertMessage)
          return
        }

        originalMessage?.callback?.(payload.data)
        break
      }
    }
  }

  private onReady(data: MessageData) {
    this.component.environment = data.environment
    this.component.platform = data.platform
    this.component.uuid = data.uuid

    if (this.initialPermissions && this.initialPermissions.length > 0) {
      this.requestPermissions(this.initialPermissions)
    }

    for (const message of this.messageQueue) {
      this.postMessage(message.action, message.data, message.callback)
    }

    this.messageQueue = []

    Logger.info('Data passed to onReady:', data)

    this.activateThemes(data.activeThemeUrls || [])

    // After activateThemes is done, we want to send a message with the ThemesActivated action.
    this.postMessage(ComponentAction.ThemesActivated, {})

    if (this.onReadyCallback) {
      this.onReadyCallback()
    }
  }

  /**
   * Gets the component UUID.
   */
  public getSelfComponentUUID() : string | undefined {
    return this.component.uuid
  }

  /**
   * Checks if the component is running in a Desktop application.
   */
  public isRunningInDesktopApplication() : boolean {
    return this.component.environment === environmentToString(Environment.Desktop)
  }

  /**
   * Checks if the component is running in a Mobile application.
   */
  public isRunningInMobileApplication() : boolean {
    return this.component.environment === environmentToString(Environment.Mobile)
  }

  /**
   * Gets the component's data value for the specified key.
   * @param key The key for the data object.
   * @returns `undefined` if the value for the key does not exist. Returns the stored value otherwise.
   */
  public getComponentDataValueForKey(key: string) : any {
    if (!this.component.data) {
      return
    }
    return this.component.data[key]
  }

  /**
   * Sets the component's data value for the specified key.
   * @param key The key for the data object.
   * @param value The value to store under the specified key.
   */
  public setComponentDataValueForKey(key: string, value: any) : void {
    if (!this.component.data) {
      throw new Error('The component has not been initialized.')
    }
    if (!key || (key && key.length === 0)) {
      throw new Error('The key for the data value should be a valid string.')
    }
    this.component.data = {
      ...this.component.data,
      [key]: value,
    }
    this.postMessage(ComponentAction.SetComponentData, { componentData: this.component.data })
  }

  /**
   * Clears the component's data object.
   */
  public clearComponentData() : void {
    this.component.data = {}
    this.postMessage(ComponentAction.SetComponentData, { componentData: this.component.data })
  }

  private postMessage(action: ComponentAction, data: MessageData, callback?: (...params: any) => void) {
    /**
     * If the sessionKey is not set, we push the message to queue
     * that will be processed later on.
     */
    if (!this.component.sessionKey) {
      this.messageQueue.push({
        action,
        data,
        api: MessagePayloadApi.Component,
        callback: callback
      })
      return
    }

    const message = {
      action,
      data,
      messageId: this.generateUUID(),
      sessionKey: this.component.sessionKey,
      api: MessagePayloadApi.Component
    }

    const sentMessage = JSON.parse(JSON.stringify(message))
    sentMessage.callback = callback
    this.sentMessages.push(sentMessage)

    let postMessagePayload

    // Mobile (React Native) requires a string for the postMessage API.
    if (this.isRunningInMobileApplication()) {
      postMessagePayload = JSON.stringify(message)
    } else {
      postMessagePayload = message
    }

    Logger.info('Posting message:', postMessagePayload)
    this.contentWindow.parent.postMessage(postMessagePayload, this.component.origin!)
  }

  private requestPermissions(permissions: ComponentPermission[], callback?: (...params: any) => void) {
    this.postMessage(ComponentAction.RequestPermissions, { permissions }, () => {
      callback && callback()
    })
  }

  private activateThemes(incomingUrls: string[] = []) {
    if (!this.component.acceptsThemes) {
      return
    }

    Logger.info('Incoming themes:', incomingUrls)

    const { activeThemes } = this.component

    if (activeThemes && activeThemes.sort().toString() == incomingUrls.sort().toString()) {
      // Incoming theme URLs are same as active, do nothing.
      return
    }

    let themesToActivate = incomingUrls
    const themesToDeactivate = []

    for (const activeUrl of activeThemes) {
      if (!incomingUrls.includes(activeUrl)) {
        // Active not present in incoming, deactivate it.
        themesToDeactivate.push(activeUrl)
      } else {
        // Already present in active themes, remove it from themesToActivate.
        themesToActivate = themesToActivate.filter((candidate) => {
          return candidate !== activeUrl
        })
      }
    }

    Logger.info('Deactivating themes:', themesToDeactivate)
    Logger.info('Activating themes:', themesToActivate)

    for (const themeUrl of themesToDeactivate) {
      this.deactivateTheme(themeUrl)
    }

    this.component.activeThemes = incomingUrls

    for (const themeUrl of themesToActivate) {
      if (!themeUrl) {
        continue
      }

      const link = this.contentWindow.document.createElement('link')
      link.id = btoa(themeUrl)
      link.href = themeUrl
      link.type = 'text/css'
      link.rel = 'stylesheet'
      link.media = 'screen,print'
      link.className = 'custom-theme'
      this.contentWindow.document.getElementsByTagName('head')[0].appendChild(link)
    }
  }

  private themeElementForUrl(themeUrl: string) {
    const elements = Array.from(this.contentWindow.document.getElementsByClassName('custom-theme')).slice()
    return elements.find((element) => {
      // We used to search here by `href`, but on desktop, with local file:// urls, that didn't work for some reason.
      return element.id == btoa(themeUrl)
    })
  }

  private deactivateTheme(themeUrl: string) {
    const element = this.themeElementForUrl(themeUrl)
    if (element && element.parentNode) {
      element.setAttribute('disabled', 'true')
      element.parentNode.removeChild(element)
    }
  }

  private generateUUID() {
    return generateUuid()
  }

  /**
   * Gets the current platform where the component is running.
   */
  public get platform() : string | undefined {
    return this.component.platform
  }

  /**
   * Gets the current environment where the component is running.
   */
  public get environment() : string | undefined {
    return this.component.environment
  }

  /**
   * Streams a collection of Items, filtered by content type.
   * New items are passed to the callback as they come.
   * @param contentTypes A collection of Content Types.
   * @param callback A callback to process the streamed items.
   */
  public streamItems(contentTypes: ContentType[], callback: (data: any) => void) : void {
    this.postMessage(ComponentAction.StreamItems, { content_types: contentTypes }, (data: any) => {
      callback(data.items)
    })
  }

  /**
   * Streams the current Item in context.
   * @param callback A callback to process the streamed item.
   */
  public streamContextItem(callback: (data: any) => void) : void {
    this.postMessage(ComponentAction.StreamContextItem, {}, (data) => {
      const { item } = data
      /**
       * If this is a new context item than the context item the component was currently entertaining,
       * we want to immediately commit any pending saves, because if you send the new context item to the
       * component before it has commited its presave, it will end up first replacing the UI with new context item,
       * and when the debouncer executes to read the component UI, it will be reading the new UI for the previous item.
       */
      const isNewItem = !this.lastStreamedItem || this.lastStreamedItem.uuid !== item.uuid

      if (isNewItem && this.pendingSaveTimeout) {
        clearTimeout(this.pendingSaveTimeout)
        this._performSavingOfItems(this.pendingSaveParams)
        this.pendingSaveTimeout = undefined
        this.pendingSaveParams = undefined
      }

      this.lastStreamedItem = item
      callback(this.lastStreamedItem)
    })
  }

  /**
   * Selects a `Tag` item.
   * @param item The Item (`Tag` or `SmartTag`) to select.
   */
  public selectItem(item: ItemPayload) : void {
    this.postMessage(ComponentAction.SelectItem, { item: this.jsonObjectForItem(item) })
  }

  /**
   * Clears current selected `Tag` (if any).
   */
  public clearSelection() : void {
    this.postMessage(ComponentAction.ClearSelection, { content_type: ContentType.Tag })
  }

  /**
   * Creates and stores an Item in the item store.
   * @param item The Item's payload content.
   * @param callback The callback to process the created Item.
   */
  public createItem(item: ItemPayload, callback: (data: any) => void) : void {
    this.postMessage(ComponentAction.CreateItem, { item: this.jsonObjectForItem(item) }, (data: any) => {
      let { item } = data
      /**
       * A previous version of the SN app had an issue where the item in the reply to ComponentActions.CreateItems
       * would be nested inside "items" and not "item". So handle both cases here.
       */
      if (!item && data.items && data.items.length > 0) {
        item = data.items[0]
      }
      this.associateItem(item)
      callback && callback(item)
    })
  }

  /**
   * Creates and stores a collection of Items in the item store.
   * @param items The Item(s) payload collection.
   * @param callback The callback to process the created Item(s).
   */
  public createItems(items: ItemPayload[], callback: (data: any) => void) : void {
    const mapped = items.map((item) => this.jsonObjectForItem(item))
    this.postMessage(ComponentAction.CreateItems, { items: mapped }, (data: any) => {
      callback && callback(data.items)
    })
  }

  /**
   * Associates a `Tag` with the current Note.
   * @param item The `Tag` item to associate.
   */
  public associateItem(item: ItemPayload) : void {
    this.postMessage(ComponentAction.AssociateItem, { item: this.jsonObjectForItem(item) })
  }

  /**
   * Deassociates a `Tag` with the current Note.
   * @param item The `Tag` item to deassociate.
   */
  public deassociateItem(item: ItemPayload) : void {
    this.postMessage(ComponentAction.DeassociateItem, { item: this.jsonObjectForItem(item) } )
  }

  /**
   * Deletes an Item from the item store.
   * @param item The Item to delete.
   * @param callback The callback with the result of the operation.
   */
  public deleteItem(item: SNItem, callback: (data: any) => void) : void {
    this.deleteItems([item], callback)
  }

  /**
   * Deletes a collection of Items from the item store.
   * @param items The Item(s) to delete.
   * @param callback The callback with the result of the operation.
   */
  public deleteItems(items: SNItem[], callback: (data: any) => void) : void {
    const params = {
      items: items.map((item: SNItem) => {
        return this.jsonObjectForItem(item)
      }),
    }
    this.postMessage(ComponentAction.DeleteItems, params, (data) => {
      callback && callback(data)
    })
  }

  /**
   * Performs a custom action to the component manager.
   * @param action
   * @param data
   * @param callback The callback with the result of the operation.
   */
  public sendCustomEvent(action: ComponentAction, data: any, callback?: (data: any) => void) : void {
    this.postMessage(action, data, (data: any) => {
      callback && callback(data)
    })
  }

  /**
   * Saves an existing Item in the item store.
   * @param item An existing Item to be saved.
   * @param callback
   * @param skipDebouncer
   */
  public saveItem(item: SNItem, callback?: () => void, skipDebouncer = false) : void {
    this.saveItems([item], callback, skipDebouncer)
  }

  /**
   * Runs a callback before saving an Item.
   * @param item An existing Item to be saved.
   * @param presave Allows clients to perform any actions last second before the save actually occurs (like setting previews).
   * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
   * hook into the debounce cycle so that clients don't have to implement their own debouncing.
   * @param callback
   */
  public saveItemWithPresave(item: SNItem, presave: any, callback?: () => void) : void {
    this.saveItemsWithPresave([item], presave, callback)
  }

  /**
   * Runs a callback before saving a collection of Items.
   * @param items A collection of existing Items to be saved.
   * @param presave Allows clients to perform any actions last second before the save actually occurs (like setting previews).
   * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
   * hook into the debounce cycle so that clients don't have to implement their own debouncing.
   * @param callback
   */
  public saveItemsWithPresave(items: SNItem[], presave: any, callback?: () => void) : void {
    this.saveItems(items, callback, false, presave)
  }

  private _performSavingOfItems({ items, presave, callback }: { items: SNItem[], presave: () => void, callback?: () => void }) {
    /**
     * Presave block allows client to gain the benefit of performing something in the debounce cycle.
     */
    presave && presave()

    const mappedItems = []
    for (const item of items) {
      mappedItems.push(this.jsonObjectForItem(item))
    }

    this.postMessage(ComponentAction.SaveItems, { items: mappedItems }, () => {
      callback && callback()
    })
  }

  /**
   * Saves a collection of existing Items.
   * @param items The items to be saved.
   * @param callback
   * @param skipDebouncer Allows saves to go through right away rather than waiting for timeout.
   * This should be used when saving items via other means besides keystrokes.
   * @param presave
   */
  public saveItems(items: SNItem[], callback?: () => void, skipDebouncer = false, presave?: any) : void {
    /**
     * We need to make sure that when we clear a pending save timeout,
     * we carry over those pending items into the new save.
     */
    if (!this.pendingSaveItems) {
      this.pendingSaveItems = []
    }

    if (this.coallesedSaving && !skipDebouncer) {
      if (this.pendingSaveTimeout) {
        clearTimeout(this.pendingSaveTimeout)
      }

      const incomingIds = items.map((item: SNItem) => item.uuid)
      /**
       * Replace any existing save items with incoming values.
       * Only keep items here who are not in incomingIds.
       */
      const preexistingItems = this.pendingSaveItems.filter((item) => {
        return !incomingIds.includes(item.uuid)
      })

      // Add new items, now that we've made sure it's cleared of incoming items.
      this.pendingSaveItems = preexistingItems.concat(items)

      // We'll potentially need to commit early if stream-context-item message comes in.
      this.pendingSaveParams = {
        items: this.pendingSaveItems,
        presave,
        callback
      }

      this.pendingSaveTimeout = setTimeout(() => {
        this._performSavingOfItems(this.pendingSaveParams)
        this.pendingSaveItems = []
        this.pendingSaveTimeout = undefined
        this.pendingSaveParams = null
      }, this.coallesedSavingDelay)
    } else {
      this._performSavingOfItems({ items, presave, callback })
    }
  }

  /**
   * Sets a new container size for the current component.
   * @param width The new width.
   * @param height The new height.
   */
  public setSize(width: string | number, height: string | number) : void {
    this.postMessage(ComponentAction.SetSize, { type: 'container', width, height })
  }

  /**
   * Sends keyboard events to SN parent application.
   * @param keyboardModifier The keyboard modifier that was pressed.
   */
  private keyPressed(keyboardModifier: KeyboardModifier) : void {
    this.postMessage(ComponentAction.KeyPressed, { keyboardModifier })
  }

  private jsonObjectForItem(item: SNItem | ItemPayload) {
    const copy = Object.assign({}, item) as any
    copy.children = null
    copy.parent = null
    return copy
  }

  /**
   * Gets the Item's appData value for the specified key.
   * Uses the default domain (org.standardnotes.sn).
   * This function is used with Items returned from streamContextItem() and streamItems()
   * @param item The Item to get the appData value from.
   * @param key The key to get the value from.
   */
  public getItemAppDataValue(item: ItemMessagePayload, key: AppDataField | string) : any {
    const defaultDomain = 'org.standardnotes.sn'
    return item.content.appData[defaultDomain][key]
  }
}
