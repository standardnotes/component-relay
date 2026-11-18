export type CaretHandler = {
  /** The caret as an offset into the note's text, or undefined if the editor has no caret */
  getOffset: () => number | undefined
  /** Focuses the editor and places the caret at the offset, or only focuses it if there is no offset */
  restore: (offset: number | undefined) => void
}

export type CaretRegistration = {
  /** Call once the editor has rendered the note's text, which is when the caret can be restored */
  notifyTextLoaded: () => void
}

export type CaretRestoration = {
  offset?: number
}

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

  public setRestoration(restoration: CaretRestoration | undefined): void {
    this.restoration = restoration
    this.restoreIfReady()
  }

  public notifyTextLoaded(): void {
    this.textLoaded = true
    this.restoreIfReady()
  }

  private restoreIfReady(): void {
    if (!this.textLoaded || !this.restoration) {
      return
    }

    const { offset } = this.restoration
    this.restoration = undefined
    this.handler.restore(offset)
  }

  private scheduleCaretRead(): void {
    clearTimeout(this.changeTimeout)
    this.changeTimeout = setTimeout(() => this.readCaret(), CARET_CHANGE_DEBOUNCE_MS)
  }

  private readCaret(): void {
    clearTimeout(this.changeTimeout)

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
    clearTimeout(this.changeTimeout)

    const { document } = this.targetWindow
    document.removeEventListener('selectionchange', this.onCaretMayHaveChanged)
    this.targetWindow.removeEventListener('keyup', this.onCaretMayHaveChanged)
    this.targetWindow.removeEventListener('pointerup', this.onCaretMayHaveChanged)
    this.targetWindow.removeEventListener('blur', this.onLeave)
    this.targetWindow.removeEventListener('pagehide', this.onLeave)
  }
}
