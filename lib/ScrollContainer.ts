export type ScrollState = {
  canScroll: boolean
  isAtBottom: boolean
  /** Space below the container that the host's button has to clear, e.g. a toolbar */
  bottomInset: number
}

export type ScrollContainerOptions = {
  /** Called after scrolling, only when the host asks to move the caret */
  moveCaretToEnd?: () => void
  /** Called before every scroll to the end, e.g. to make other panes follow the scroll container */
  beforeScrollToEnd?: () => void
  /** Called after every scroll to the end, once the container is at the bottom and the caret has moved */
  afterScrollToEnd?: () => void
}

export type ScrollContainerRegistration = {
  // Call after changing content programmatically (e.g. setting a textarea's value), which fires no DOM events
  notifyContentChange: () => void
}

const SCROLL_BOTTOM_THRESHOLD = 8
const CLIPPING_OVERFLOWS = ['hidden', 'clip', 'auto', 'scroll']
const SMOOTH_SCROLL_FALLBACK_MS = 500

export class ScrollContainer {
  private lastState?: ScrollState
  private disposed = false
  private onChange = () => this.refresh()
  private resizeObserver = new ResizeObserver(this.onChange)
  private mutationObserver = new MutationObserver(this.onChange)
  // Scroll events for the document's scroller fire on the window, not on the element
  private scrollEventTarget: HTMLElement | Window

  constructor(
    private element: HTMLElement,
    private options: ScrollContainerOptions,
    private onStateChange: (state: ScrollState) => void,
  ) {
    this.scrollEventTarget = element === document.scrollingElement ? window : element
    this.scrollEventTarget.addEventListener('scroll', this.onChange, { passive: true })
    element.addEventListener('input', this.onChange)
    this.resizeObserver.observe(element)
    this.mutationObserver.observe(element, { childList: true, subtree: true, characterData: true })
    this.refresh()
  }

  /** @param force Reports even if unchanged, e.g. after the host re-registers the component */
  public refresh(force = false): void {
    const { scrollTop, scrollHeight, clientHeight } = this.element
    const state: ScrollState = {
      canScroll: scrollHeight > clientHeight,
      isAtBottom: scrollTop + clientHeight >= scrollHeight - SCROLL_BOTTOM_THRESHOLD,
      bottomInset: Math.max(0, Math.round(window.innerHeight - this.getVisibleBottom())),
    }

    if (
      !force &&
      this.lastState?.canScroll === state.canScroll &&
      this.lastState.isAtBottom === state.isAtBottom &&
      this.lastState.bottomInset === state.bottomInset
    ) {
      return
    }

    this.lastState = state
    this.onStateChange(state)
  }

  /** Editors like CodeMirror extend their scroller past a clipping parent, so its own edge isn't what the user sees */
  private getVisibleBottom(): number {
    let bottom = this.element.getBoundingClientRect().bottom
    // The root elements are skipped as they only clip to the viewport (already covered by innerHeight), and
    // collapse to zero height when the editor is positioned out of flow
    for (let parent = this.element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      if (CLIPPING_OVERFLOWS.includes(getComputedStyle(parent).overflowY)) {
        bottom = Math.min(bottom, parent.getBoundingClientRect().bottom)
      }
    }
    return bottom
  }

  public scrollToEnd(moveCaret: boolean): void {
    this.options.beforeScrollToEnd?.()

    const element = this.element
    const top = element.scrollHeight - element.clientHeight

    let didFinish = false
    const finish = () => {
      if (didFinish) {
        return
      }
      didFinish = true
      // The fallback can fire mid-animation, and later scrollTop writes would otherwise freeze the scroll there
      element.scrollTop = element.scrollHeight - element.clientHeight
      // Editors that track their scroll position, like CodeMirror, would otherwise restore it before handling the scroll event
      requestAnimationFrame(() => {
        if (moveCaret && !this.disposed) {
          this.options.moveCaretToEnd?.()
        }
        this.options.afterScrollToEnd?.()
      })
    }

    if (element.scrollTop >= top - 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }

    // `scrollend` is not supported everywhere and does not fire if the scroll is interrupted
    this.scrollEventTarget.addEventListener('scrollend', finish, { once: true })
    setTimeout(finish, SMOOTH_SCROLL_FALLBACK_MS)
    element.scrollTo({ top, behavior: 'smooth' })
  }

  public dispose(): void {
    this.disposed = true
    this.scrollEventTarget.removeEventListener('scroll', this.onChange)
    this.element.removeEventListener('input', this.onChange)
    this.resizeObserver.disconnect()
    this.mutationObserver.disconnect()
  }
}
