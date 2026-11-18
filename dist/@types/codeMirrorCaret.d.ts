import type { CaretHandler } from './CaretTracker';
declare type Position = {
    line: number;
    ch: number;
};
export declare type CodeMirrorEditor = {
    focus: () => void;
    getCursor: (start?: string) => Position;
    setCursor: (position: Position) => void;
    indexFromPos: (position: Position) => number;
    posFromIndex: (index: number) => Position;
};
export declare function createCodeMirrorCaretHandler(editor: CodeMirrorEditor): CaretHandler;
export {};
