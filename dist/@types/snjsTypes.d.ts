/**
 * Declaring types needed from snjs.
 * This file will be deleted after snjs becomes a monorepo and provides such types.
 */
/**
 * The available actions that a component can perform.
 */
export declare enum ComponentAction {
    SetSize = "set-size",
    StreamItems = "stream-items",
    StreamContextItem = "stream-context-item",
    SaveItems = "save-items",
    SelectItem = "select-item",
    AssociateItem = "associate-item",
    DeassociateItem = "deassociate-item",
    ClearSelection = "clear-selection",
    CreateItem = "create-item",
    CreateItems = "create-items",
    DeleteItems = "delete-items",
    SetComponentData = "set-component-data",
    InstallLocalComponent = "install-local-component",
    ToggleActivateComponent = "toggle-activate-component",
    RequestPermissions = "request-permissions",
    PresentConflictResolution = "present-conflict-resolution",
    DuplicateItem = "duplicate-item",
    ComponentRegistered = "component-registered",
    ActivateThemes = "themes",
    Reply = "reply",
    SaveSuccess = "save-success",
    SaveError = "save-error",
    ThemesActivated = "themes-activated"
}
export declare enum Environment {
    Web = 1,
    Desktop = 2,
    Mobile = 3
}
export declare enum ContentType {
    Any = "*",
    Item = "SF|Item",
    RootKey = "SN|RootKey|NoSync",
    ItemsKey = "SN|ItemsKey",
    EncryptedStorage = "SN|EncryptedStorage",
    Note = "Note",
    Tag = "Tag",
    SmartTag = "SN|SmartTag",
    Component = "SN|Component",
    Editor = "SN|Editor",
    ActionsExtension = "Extension",
    UserPrefs = "SN|UserPreferences",
    Privileges = "SN|Privileges",
    HistorySession = "SN|HistorySession",
    Theme = "SN|Theme",
    Mfa = "SF|MFA",
    ServerExtension = "SF|Extension",
    FilesafeCredentials = "SN|FileSafe|Credentials",
    FilesafeFileMetadata = "SN|FileSafe|FileMetadata",
    FilesafeIntegration = "SN|FileSafe|Integration",
    ExtensionRepo = "SN|ExtensionRepo"
}
export declare type UuidString = string;
declare type ContentReference = {
    uuid: string;
    content_type: string;
};
declare type PayloadContent = {
    [key: string]: any;
    references: ContentReference[];
};
export declare type RawPayload = {
    uuid: string;
    content_type: ContentType;
    content?: PayloadContent | string;
    deleted?: boolean;
    items_key_id?: string;
    enc_item_key?: string;
    created_at?: Date;
    updated_at?: Date;
    dirtiedDate?: Date;
    dirty?: boolean;
    errorDecrypting?: boolean;
    waitingForKey?: boolean;
    errorDecryptingValueChanged?: boolean;
    lastSyncBegan?: Date;
    lastSyncEnd?: Date;
    auth_hash?: string;
    auth_params?: any;
    duplicate_of?: string;
};
declare enum PayloadSource {
    RemoteRetrieved = 1,
    RemoteSaved = 2,
    LocalSaved = 3,
    LocalRetrieved = 4,
    LocalChanged = 5,
    /** Payloads retrieved from an external
     extension/component */
    ComponentRetrieved = 6,
    /** When a component is installed by the desktop
     and some of its values change */
    DesktopInstalled = 7,
    /** aciton-based Extensions like note history */
    RemoteActionRetrieved = 8,
    FileImport = 9,
    RemoteConflict = 10,
    ImportConflict = 11,
    /** Payloads that are saved or saving in the
     current sync request */
    SavedOrSaving = 12,
    /** Payloads that have been decrypted for the convenience
     of consumers who can only work with decrypted formats. The
     decrypted payloads exist in transient, ephemeral space, and
     are not used in anyway. */
    DecryptedTransient = 13,
    ConflictUuid = 14,
    ConflictData = 15,
    SessionHistory = 16,
    /** Payloads with a source of Constructor means that the payload was created
     * in isolated space by the caller, and does not yet have any app-related affiliation. */
    Constructor = 17,
    /** Payloads received from an external component with the intention of creating a new item */
    ComponentCreated = 18,
    /** When the payloads are about to sync, they are emitted by the sync service with updated
     * values of lastSyncBegan. Payloads emitted from this source indicate that these payloads
     * have been saved to disk, and are about to be synced */
    PreSyncSave = 19,
    RemoteHistory = 20
}
declare enum PayloadField {
    Uuid = "uuid",
    ContentType = "content_type",
    ItemsKeyId = "items_key_id",
    EncItemKey = "enc_item_key",
    Content = "content",
    CreatedAt = "created_at",
    UpdatedAt = "updated_at",
    Deleted = "deleted",
    Legacy003AuthHash = "auth_hash",
    Legacy003AuthParams = "auth_params",
    Dirty = "dirty",
    DirtiedDate = "dirtiedDate",
    WaitingForKey = "waitingForKey",
    ErrorDecrypting = "errorDecrypting",
    ErrorDecryptingChanged = "errorDecryptingValueChanged",
    LastSyncBegan = "lastSyncBegan",
    LastSyncEnd = "lastSyncEnd",
    DuplicateOf = "duplicate_of"
}
declare enum PayloadFormat {
    EncryptedString = 0,
    DecryptedBareObject = 1,
    DecryptedBase64String = 2,
    Deleted = 3
}
declare enum ProtocolVersion {
    V000Base64Decrypted = "000",
    V001 = "001",
    V002 = "002",
    V003 = "003",
    V004 = "004",
    VersionLength = 3
}
export declare enum AppDataField {
    Pinned = "pinned",
    Archived = "archived",
    Locked = "locked",
    UserModifiedDate = "client_updated_at",
    DefaultEditor = "defaultEditor",
    MobileRules = "mobileRules",
    NotAvailableOnMobile = "notAvailableOnMobile",
    MobileActive = "mobileActive",
    LastSize = "lastSize",
    PrefersPlainEditor = "prefersPlainEditor",
    ComponentInstallError = "installError"
}
/**
 * A payload is a vehicle in which item data is transported or persisted.
 * This class represents an abstract PurePayload which does not have any fields. Instead,
 * subclasses must override the `fields` static method to return which fields this particular
 * class of payload contains. For example, a ServerItemPayload is a transmission vehicle for
 * transporting an item to the server, and does not contain fields like PayloadFields.Dirty.
 * However, a StorageItemPayload is a persistence vehicle for saving payloads to disk, and does contain
 * PayloadsFields.Dirty.
 *
 * Payloads are completely immutable and may not be modified after creation. Payloads should
 * not be created directly using the constructor, but instead created using the generators avaiable
 * in generator.js.
 *
 * Payloads also have a content format. Formats can either be
 * DecryptedBase64String, EncryptedString, or DecryptedBareObject.
 */
declare class PurePayload {
    /** When constructed, the payload takes in an array of fields that the input raw payload
     * contains. These fields allow consumers to determine whether a given payload has an actual
     * undefined value for payload.content, for example, or whether the payload was constructed
     * to omit that field altogether (as in the case of server saved payloads) */
    readonly fields: PayloadField[];
    readonly source: PayloadSource;
    readonly uuid: string;
    readonly content_type: ContentType;
    readonly content?: PayloadContent | string;
    readonly deleted?: boolean;
    readonly items_key_id?: string;
    readonly enc_item_key?: string;
    readonly created_at?: Date;
    readonly updated_at?: Date;
    readonly dirtiedDate?: Date;
    readonly dirty?: boolean;
    readonly errorDecrypting?: boolean;
    readonly waitingForKey?: boolean;
    readonly errorDecryptingValueChanged?: boolean;
    readonly lastSyncBegan?: Date;
    readonly lastSyncEnd?: Date;
    /** @deprecated */
    readonly auth_hash?: string;
    /** @deprecated */
    readonly auth_params?: any;
    readonly format: PayloadFormat;
    readonly version?: ProtocolVersion;
    readonly duplicate_of?: string;
    constructor(rawPayload: RawPayload, fields: PayloadField[], source: PayloadSource);
    /**
     * Returns a generic object with all payload fields except any that are meta-data
     * related (such as `fields`, `dirtiedDate`, etc). "Ejected" means a payload for
     * generic, non-contextual consumption, such as saving to a backup file or syncing
     * with a server.
     */
    ejected(): RawPayload;
    get safeContent(): PayloadContent;
    /** Defined to allow singular API with Payloadable type (PurePayload | SNItem) */
    get references(): ContentReference[];
    get safeReferences(): ContentReference[];
    get contentObject(): PayloadContent;
    get contentString(): string;
    /**
     * Whether a payload can be discarded and removed from storage.
     * This value is true if a payload is marked as deleted and not dirty.
     */
    get discardable(): boolean | undefined;
}
declare type PredicateType = string[] | SNPredicate;
declare type PredicateArray = Array<string[]> | SNPredicate[];
declare type PredicateValue = string | Date | boolean | PredicateType | PredicateArray;
/**
 * A local-only construct that defines a built query that can be used to
 * dynamically search items.
 */
declare class SNPredicate {
    private keypath;
    private operator;
    private value;
    constructor(keypath: string, operator: string, value: PredicateValue);
    static FromJson(values: any): SNPredicate;
    static FromArray(array: string[]): SNPredicate;
    isRecursive(): boolean;
    arrayRepresentation(): PredicateValue[];
    valueAsArray(): PredicateArray;
    keypathIncludesVerb(verb: string): boolean;
    static CompoundPredicate(predicates: PredicateArray): SNPredicate;
    static ObjectSatisfiesPredicate(object: any, predicate: PredicateType): boolean;
    /**
     * @param itemValueArray Because we are resolving the `includes` operator, the given
     * value should be an array.
     * @param containsValue  The value we are checking to see if exists in itemValueArray
     */
    static resolveIncludesPredicate(itemValueArray: Array<any>, containsValue: any): boolean;
    static ItemSatisfiesPredicate(item: SNItem, predicate: SNPredicate): boolean;
    static ItemSatisfiesPredicates(item: SNItem, predicates: SNPredicate[]): boolean;
    /**
     * Predicate date strings are of form "x.days.ago" or "x.hours.ago"
     */
    static DateFromString(string: string): Date;
}
declare enum ConflictStrategy {
    KeepLeft = 1,
    KeepRight = 2,
    KeepLeftDuplicateRight = 3,
    DuplicateLeftKeepRight = 4,
    KeepLeftMergeRefs = 5
}
declare enum PrefKey {
    TagsPanelWidth = "tagsPanelWidth",
    NotesPanelWidth = "notesPanelWidth",
    EditorWidth = "editorWidth",
    EditorLeft = "editorLeft",
    EditorMonospaceEnabled = "monospaceFont",
    EditorSpellcheck = "spellcheck",
    EditorResizersEnabled = "marginResizersEnabled",
    SortNotesBy = "sortBy",
    SortNotesReverse = "sortReverse",
    NotesShowArchived = "showArchived",
    NotesHidePinned = "hidePinned",
    NotesHideNotePreview = "hideNotePreview",
    NotesHideDate = "hideDate",
    NotesHideTags = "hideTags"
}
declare enum SingletonStrategy {
    KeepEarliest = 1
}
/**
 * The most abstract item that any syncable item needs to extend from.
 */
export declare class SNItem {
    readonly payload: PurePayload;
    readonly conflictOf?: UuidString;
    readonly duplicateOf?: UuidString;
    readonly createdAtString?: string;
    readonly updatedAtString?: string;
    readonly protected = false;
    readonly trashed = false;
    readonly pinned = false;
    readonly archived = false;
    readonly locked = false;
    readonly userModifiedDate: Date;
    private static sharedDateFormatter;
    constructor(payload: PurePayload);
    static DefaultAppDomain(): string;
    get uuid(): string;
    get content(): string | PayloadContent | undefined;
    /**
     * This value only exists on payloads that are encrypted, as version pertains to the
     * encrypted string protocol version.
     */
    get version(): ProtocolVersion;
    get safeContent(): PayloadContent;
    get references(): ContentReference[];
    get deleted(): boolean | undefined;
    get content_type(): ContentType;
    get created_at(): Date;
    get updated_at(): Date;
    get dirtiedDate(): Date | undefined;
    get dirty(): boolean | undefined;
    get errorDecrypting(): boolean | undefined;
    get waitingForKey(): boolean | undefined;
    get errorDecryptingValueChanged(): boolean | undefined;
    get lastSyncBegan(): Date | undefined;
    get lastSyncEnd(): Date | undefined;
    /** @deprecated */
    get auth_hash(): string | undefined;
    /** @deprecated */
    get auth_params(): any;
    get duplicate_of(): string | undefined;
    payloadRepresentation(override?: PurePayload): PurePayload;
    hasRelationshipWithItem(item: SNItem): boolean;
    /**
     * Inside of content is a record called `appData` (which should have been called `domainData`).
     * It was named `appData` as a way to indicate that it can house data for multiple apps.
     * Each key of appData is a domain string, which was originally designed
     * to allow for multiple 3rd party apps who share access to the same data to store data
     * in an isolated location. This design premise is antiquited and no longer pursued,
     * however we continue to use it as not to uncesesarily create a large data migration
     * that would require users to sync all their data.
     *
     * domainData[DomainKey] will give you another Record<string, any>.
     *
     * Currently appData['org.standardnotes.sn'] returns an object of type AppData.
     * And appData['org.standardnotes.sn.components] returns an object of type ComponentData
     */
    getDomainData(domain: string): undefined | Record<string, any>;
    getAppDomainValue(key: AppDataField | PrefKey): any;
    /**
     * During sync conflicts, when determing whether to create a duplicate for an item,
     * we can omit keys that have no meaningful weight and can be ignored. For example,
     * if one component has active = true and another component has active = false,
     * it would be needless to duplicate them, so instead we ignore that value.
     */
    contentKeysToIgnoreWhenCheckingEquality(): string[];
    /** Same as `contentKeysToIgnoreWhenCheckingEquality`, but keys inside appData[Item.AppDomain] */
    appDataContentKeysToIgnoreWhenCheckingEquality(): AppDataField[];
    getContentCopy(): any;
    /** Whether the item has never been synced to a server */
    get neverSynced(): boolean;
    /**
     * Subclasses can override this getter to return true if they want only
     * one of this item to exist, depending on custom criteria.
     */
    get isSingleton(): boolean;
    /** The predicate by which singleton items should be unique */
    get singletonPredicate(): SNPredicate;
    get singletonStrategy(): SingletonStrategy;
    /**
     * Subclasses can override this method and provide their own opinion on whether
     * they want to be duplicated. For example, if this.content.x = 12 and
     * item.content.x = 13, this function can be overriden to always return
     * ConflictStrategy.KeepLeft to say 'don't create a duplicate at all, the
     * change is not important.'
     *
     * In the default implementation, we create a duplicate if content differs.
     * However, if they only differ by references, we KEEP_LEFT_MERGE_REFS.
     */
    strategyWhenConflictingWithItem(item: SNItem): ConflictStrategy;
    isItemContentEqualWith(otherItem: SNItem): boolean;
    satisfiesPredicate(predicate: SNPredicate): boolean;
    updatedAtTimestamp(): number;
    private dateToLocalizedString;
}
export declare type ComponentPermission = {
    name: ComponentAction;
    content_types?: ContentType[];
};
export {};
