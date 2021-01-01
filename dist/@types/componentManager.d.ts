import { ComponentAction, ComponentPermission, ContentType, SNItem, AppDataField } from './snjsTypes';
declare type ComponentManagerOptions = {
    coallesedSaving?: boolean;
    coallesedSavingDelay?: number;
    debug?: boolean;
    acceptsThemes?: boolean;
};
declare type ComponentManagerParams = {
    initialPermissions?: ComponentPermission[];
    options?: ComponentManagerOptions;
    onReady?: () => void;
};
declare type ItemPayload = {
    content_type?: ContentType;
    content?: any;
    [key: string]: any;
};
export default class ComponentManager {
    private contentWindow;
    private initialPermissions?;
    private onReadyCallback?;
    private component;
    private sentMessages;
    private messageQueue;
    private lastStreamedItem?;
    private pendingSaveItems?;
    private pendingSaveTimeout?;
    private pendingSaveParams?;
    private coallesedSaving;
    private coallesedSavingDelay;
    private messageHandler?;
    constructor(contentWindow: Window, params?: ComponentManagerParams);
    private processParameters;
    deinit(): void;
    private registerMessageHandler;
    private handleMessage;
    private onReady;
    getSelfComponentUUID(): string | undefined;
    isRunningInDesktopApplication(): boolean;
    isRunningInMobileApplication(): boolean;
    getComponentDataValueForKey(key: string): any;
    setComponentDataValueForKey(key: string, value: any): void;
    clearComponentData(): void;
    private postMessage;
    private requestPermissions;
    private activateThemes;
    private themeElementForUrl;
    private deactivateTheme;
    private generateUUID;
    get platform(): string | undefined;
    get environment(): string | undefined;
    /** Components actions */
    streamItems(contentTypes: ContentType[], callback: (data: any) => void): void;
    streamContextItem(callback: (data: any) => void): void;
    /**
     * Selects an item which typically needs to be a tag.
     * @param item the item to select.
     */
    selectItem(item: SNItem): void;
    /**
     * Clears current selected tags.
     */
    clearSelection(): void;
    createItem(item: ItemPayload, callback: (data: any) => void): void;
    createItems(items: ItemPayload[], callback: (data: any) => void): void;
    associateItem(item: ItemPayload): void;
    deassociateItem(item: ItemPayload): void;
    deleteItem(item: SNItem, callback: (data: any) => void): void;
    deleteItems(items: SNItem[], callback: (data: any) => void): void;
    sendCustomEvent(action: ComponentAction, data: any, callback?: (data: any) => void): void;
    saveItem(item: SNItem, callback?: () => void, skipDebouncer?: boolean): void;
    /**
     * @param item The item to be saved.
     * @param presave Allows clients to perform any actions last second before the save actually occurs (like setting previews).
     * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
     * hook into the debounce cycle so that clients don't have to implement their own debouncing.
     * @param callback
     */
    saveItemWithPresave(item: SNItem, presave: any, callback: () => void): void;
    /**
     * @param items The items to be saved.
     * @param presave Allows clients to perform any actions last second before the save actually occurs (like setting previews).
     * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
     * hook into the debounce cycle so that clients don't have to implement their own debouncing.
     * @param callback
     */
    saveItemsWithPresave(items: SNItem[], presave: any, callback: () => void): void;
    private _performSavingOfItems;
    /**
     * @param items The items to be saved.
     * @param callback
     * @param skipDebouncer Allows saves to go through right away rather than waiting for timeout.
     * This should be used when saving items via other means besides keystrokes.
     * @param presave
     */
    saveItems(items: SNItem[], callback?: () => void, skipDebouncer?: boolean, presave?: any): void;
    setSize(type: string, width: string | number, height: string | number): void;
    private jsonObjectForItem;
    getItemAppDataValue(item: SNItem, key: AppDataField): any;
}
export {};
