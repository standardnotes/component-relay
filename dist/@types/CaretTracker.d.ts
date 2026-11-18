export declare type CaretHandler = {
    /** The caret as an offset into the note's text, or undefined if the editor has no caret */
    getOffset: () => number | undefined;
    /** Focuses the editor and places the caret at the offset, or only focuses it if there is no offset */
    restore: (offset: number | undefined) => void;
};
export declare type CaretRegistration = {
    /** Call once the editor has rendered the note's text, which is when the caret can be restored */
    notifyTextLoaded: () => void;
};
export declare type CaretRestoration = {
    offset?: number;
};
export declare class CaretTracker {
    private targetWindow;
    private handler;
    private onOffsetChange;
    private lastOffset?;
    private changeTimeout?;
    private restoration?;
    private textLoaded;
    private onCaretMayHaveChanged;
    private onLeave;
    constructor(targetWindow: Window, handler: CaretHandler, onOffsetChange: (offset: number) => void, restoration?: CaretRestoration);
    setRestoration(restoration: CaretRestoration | undefined): void;
    notifyTextLoaded(): void;
    private restoreIfReady;
    private scheduleCaretRead;
    private readCaret;
    dispose(): void;
}
