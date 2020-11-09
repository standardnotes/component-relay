import { ComponentAction, SNItem } from 'snjs';
declare class ComponentManager {
    private initialPermissions;
    private onReadyCallback?;
    private component?;
    private sentMessages?;
    private messageQueue?;
    private lastStreamedItem?;
    private pendingSaveItems?;
    private pendingSaveTimeout?;
    private pendingSaveParams?;
    private coallesedSaving;
    private coallesedSavingDelay;
    constructor(initialPermissions: ComponentAction[], onReady?: () => void);
    private registerMessageHandler;
    private handleMessage;
    private onReady;
    private getSelfComponentUUID;
    isRunningInDesktopApplication(): boolean;
    setComponentDataValueForKey(key: string, value: any): void;
    clearComponentData(): void;
    componentDataValueForKey(key: string): any;
    private postMessage;
    private requestPermissions;
    private activateThemes;
    private themeElementForUrl;
    private deactivateTheme;
    generateUUID(): string;
    /** Components actions */
    setSize(type: string, width: number, height: number): void;
    streamItems(contentTypes: string[], callback: (data: any) => void): void;
    streamContextItem(callback: (data: any) => void): void;
    selectItem(item: SNItem): void;
    createItem(item: SNItem, callback: (data: any) => void): void;
    createItems(items: SNItem[], callback: (data: any) => void): void;
    associateItem(item: SNItem): void;
    deassociateItem(item: SNItem): void;
    clearSelection(): void;
    deleteItem(item: SNItem, callback: (data: any) => void): void;
    deleteItems(items: SNItem[], callback: (data: any) => void): void;
    sendCustomEvent(action: ComponentAction, data: any, callback: (data: any) => void): void;
    saveItem(item: SNItem, callback: (data: any) => void, skipDebouncer?: boolean): void;
    /**
     * Presave allows clients to perform any actions last second before the save actually occurs (like setting previews).
     * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
     * hook into the debounce cycle so that clients don't have to implement their own debouncing.
     *
     * @param item
     * @param presave
     * @param callback
     */
    saveItemWithPresave(item: SNItem, presave: any, callback: (data: any) => void): void;
    saveItemsWithPresave(items: SNItem[], presave: any, callback: (data: any) => void): void;
    private _performSavingOfItems;
    /**
     * @param items
     * @param callback
     * @param skipDebouncer Allows saves to go through right away rather than waiting for timeout.
     * This should be used when saving items via other means besides keystrokes.
     * @param presave
     */
    saveItems(items: SNItem[], callback: (...data: any) => void, skipDebouncer?: boolean, presave?: any): void;
    private jsonObjectForItem;
    getItemAppDataValue(item: SNItem, key: string): any;
}
export default ComponentManager;
