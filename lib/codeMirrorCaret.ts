import type { CaretHandler } from './CaretTracker'

type Position = { line: number; ch: number }

export type CodeMirrorEditor = {
  focus: () => void
  getCursor: (start?: string) => Position
  setCursor: (position: Position) => void
  indexFromPos: (position: Position) => number
  posFromIndex: (index: number) => Position
}

export function createCodeMirrorCaretHandler(editor: CodeMirrorEditor): CaretHandler {
  return {
    getOffset: () => editor.indexFromPos(editor.getCursor('head')),
    restore: (offset) => {
      editor.focus()

      if (offset === undefined) {
        return true
      }

      // CodeMirror keeps the position inside the document if the offset is past its end
      editor.setCursor(editor.posFromIndex(offset))
      return true
    },
  }
}
