export type CaretHandler = {
  /** The caret as an offset into the note's text, or undefined if the editor has no caret */
  getOffset: () => number | undefined
  /** Applies the restoration and returns whether it succeeded. Returning false keeps it pending for another attempt. */
  restore: (offset: number | undefined) => boolean
}

export type CaretRegistration = {
  /** Call once the editor has rendered the note's text, which is when the caret can be restored */
  notifyTextLoaded: () => void
}

export type CaretRestoration = { type: 'focus' } | { type: 'offset'; offset: number }

const CARET_CHANGE_DEBOUNCE_MS = 150

export class CaretTracker {
  private lastOffset?: number
  private changeTimeout?: ReturnType<typeof setTimeout>
  private restoration?: CaretRestoration
  private textLoaded = false
  private onCaretMayHaveChanged = () => this.scheduleCaretRead()
  private onLeave = () => this.readCaret()

  constructor(
    private targetWindow: Window,
    private handler: CaretHandler,
    private onOffsetChange: (offset: number) => void,
    restoration?: CaretRestoration,
  ) {
    this.restoration = restoration

    const { document } = targetWindow
    document.addEventListener('selectionchange', this.onCaretMayHaveChanged)
    targetWindow.addEventListener('keyup', this.onCaretMayHaveChanged)
    targetWindow.addEventListener('pointerup', this.onCaretMayHaveChanged)
    targetWindow.addEventListener('blur', this.onLeave)
    targetWindow.addEventListener('pagehide', this.onLeave)
  }

  public setRestoration(restoration: CaretRestoration | undefined): boolean {
    this.restoration = restoration
    return this.restoreIfReady()
  }

  public notifyTextLoaded(): boolean {
    this.textLoaded = true
    return this.restoreIfReady()
  }

  private restoreIfReady(): boolean {
    if (!this.textLoaded || !this.restoration) {
      return false
    }

    const offset = this.restoration.type === 'offset' ? this.restoration.offset : undefined
    if (!this.handler.restore(offset)) {
      return false
    }

    this.restoration = undefined
    return true
  }

  private scheduleCaretRead(): void {
    clearTimeout(this.changeTimeout)
    this.changeTimeout = setTimeout(() => this.readCaret(), CARET_CHANGE_DEBOUNCE_MS)
  }

  private readCaret(): void {
    clearTimeout(this.changeTimeout)
    this.changeTimeout = undefined

    if (this.restoration) {
      return
    }

    const offset = this.handler.getOffset()

    if (offset === undefined || offset === this.lastOffset) {
      return
    }

    this.lastOffset = offset
    this.onOffsetChange(offset)
  }

  public dispose(): void {
    if (this.changeTimeout !== undefined) {
      this.readCaret()
    }

    const { document } = this.targetWindow
    document.removeEventListener('selectionchange', this.onCaretMayHaveChanged)
    this.targetWindow.removeEventListener('keyup', this.onCaretMayHaveChanged)
    this.targetWindow.removeEventListener('pointerup', this.onCaretMayHaveChanged)
    this.targetWindow.removeEventListener('blur', this.onLeave)
    this.targetWindow.removeEventListener('pagehide', this.onLeave)
  }
}
