export declare type CaretHandler = {
    /** The caret as an offset into the note's text, or undefined if the editor has no caret */
    getOffset: () => number | undefined;
    /** Applies the restoration and returns whether it succeeded. Returning false keeps it pending for another attempt. */
    restore: (offset: number | undefined) => boolean;
};
export declare type CaretRegistration = {
    /** Call once the editor has rendered the note's text, which is when the caret can be restored */
    notifyTextLoaded: () => void;
};
export declare type CaretRestoration = {
    type: 'focus';
} | {
    type: 'offset';
    offset: number;
};
export declare class CaretTracker {
    private targetWindow;
    private handler;
    private onOffsetChange;
    private lastOffset?;
    private changeTimeout?;
    private restoration?;
    private textLoaded;
    private trackingEnabled;
    private onCaretMayHaveChanged;
    private onLeave;
    constructor(targetWindow: Window, handler: CaretHandler, onOffsetChange: (offset: number) => void, restoration?: CaretRestoration, trackingEnabled?: boolean);
    setTrackingEnabled(enabled: boolean): void;
    setRestoration(restoration: CaretRestoration | undefined): boolean;
    notifyTextLoaded(): boolean;
    private restoreIfReady;
    private scheduleCaretRead;
    private readCaret;
    dispose(): void;
}
