import type { CaretHandler } from './CaretTracker'

export function createTextareaCaretHandler(textarea: HTMLTextAreaElement): CaretHandler {
  return {
    getOffset: () => (textarea.selectionDirection === 'backward' ? textarea.selectionStart : textarea.selectionEnd),
    restore: (offset) => {
      if (offset === undefined) {
        textarea.focus({ preventScroll: true })
        return
      }

      const boundedOffset = Math.min(Math.max(offset, 0), textarea.value.length)
      textarea.setSelectionRange(boundedOffset, boundedOffset)
      // The browser only scrolls the caret into view if focus comes after the selection
      textarea.focus()
    },
  }
}
