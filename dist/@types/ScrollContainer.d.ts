export declare type ScrollState = {
    canScroll: boolean;
    isAtBottom: boolean;
    /** Space below the container that the host's button has to clear, e.g. a toolbar */
    bottomInset: number;
};
export declare type ScrollContainerOptions = {
    /** Called after scrolling, only when the host asks to move the caret */
    moveCaretToEnd?: () => void;
    /** Called before every scroll to the end, e.g. to make other panes follow the scroll container */
    beforeScrollToEnd?: () => void;
    /** Called after every scroll to the end, once the container is at the bottom and the caret has moved */
    afterScrollToEnd?: () => void;
};
export declare type ScrollContainerRegistration = {
    notifyContentChange: () => void;
};
export declare class ScrollContainer {
    private element;
    private options;
    private onStateChange;
    private lastState?;
    private disposed;
    private onChange;
    private resizeObserver;
    private mutationObserver;
    private scrollEventTarget;
    constructor(element: HTMLElement, options: ScrollContainerOptions, onStateChange: (state: ScrollState) => void);
    /** @param force Reports even if unchanged, e.g. after the host re-registers the component */
    refresh(force?: boolean): void;
    /** Editors like CodeMirror extend their scroller past a clipping parent, so its own edge isn't what the user sees */
    private getVisibleBottom;
    scrollToEnd(moveCaret: boolean): void;
    dispose(): void;
}
