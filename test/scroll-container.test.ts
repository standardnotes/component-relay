import ComponentRelay from '../lib/ComponentRelay'
import { ScrollContainer } from '../lib/ScrollContainer'
import { ComponentAction } from '../lib/Types/ComponentAction'

beforeEach(() => {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }))
  window.matchMedia = jest.fn().mockReturnValue({ matches: false })
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 16)
})

function setBottomInset(element: HTMLElement, inset: number) {
  element.getBoundingClientRect = () => ({ bottom: window.innerHeight - inset }) as DOMRect
}

function createScrollableElement(doc: Document, scrollTop: number): HTMLElement {
  const element = doc.createElement('div')
  Object.defineProperty(element, 'scrollHeight', { value: 1000, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: 200, configurable: true })
  element.scrollTop = scrollTop
  element.scrollTo = jest.fn()
  setBottomInset(element, 0)
  return element
}

describe('ScrollContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('reports the initial state and only reports changes afterwards', () => {
    const element = createScrollableElement(document, 0)
    const onStateChange = jest.fn()

    new ScrollContainer(element, {}, onStateChange)
    expect(onStateChange).toHaveBeenCalledWith({ canScroll: true, isAtBottom: false, bottomInset: 0 })

    element.scrollTop = 100
    element.dispatchEvent(new Event('scroll'))
    expect(onStateChange).toHaveBeenCalledTimes(1)

    element.scrollTop = 800
    element.dispatchEvent(new Event('scroll'))
    expect(onStateChange).toHaveBeenLastCalledWith({ canScroll: true, isAtBottom: true, bottomInset: 0 })
    expect(onStateChange).toHaveBeenCalledTimes(2)
  })

  it('reports the space left below the container, such as a toolbar', () => {
    const element = createScrollableElement(document, 0)
    setBottomInset(element, 32)
    const onStateChange = jest.fn()
    const container = new ScrollContainer(element, {}, onStateChange)
    expect(onStateChange).toHaveBeenLastCalledWith({ canScroll: true, isAtBottom: false, bottomInset: 32 })

    setBottomInset(element, 48)
    container.refresh()
    expect(onStateChange).toHaveBeenLastCalledWith({ canScroll: true, isAtBottom: false, bottomInset: 48 })
  })

  it('measures the space below the part of the container a clipping parent leaves visible', () => {
    const parent = document.createElement('div')
    parent.style.overflowY = 'hidden'
    const element = createScrollableElement(document, 0)
    parent.appendChild(element)
    document.body.appendChild(parent)
    parent.getBoundingClientRect = () => ({ bottom: window.innerHeight - 27 }) as DOMRect
    setBottomInset(element, -23)
    const onStateChange = jest.fn()

    new ScrollContainer(element, {}, onStateChange)

    expect(onStateChange).toHaveBeenLastCalledWith({ canScroll: true, isAtBottom: false, bottomInset: 27 })
    parent.remove()
  })

  it('ignores a collapsed body that only clips to the viewport', () => {
    document.body.style.overflowY = 'hidden'
    document.body.getBoundingClientRect = () => ({ bottom: 0 }) as DOMRect
    const element = createScrollableElement(document, 0)
    document.body.appendChild(element)
    const onStateChange = jest.fn()

    new ScrollContainer(element, {}, onStateChange)

    expect(onStateChange).toHaveBeenLastCalledWith({ canScroll: true, isAtBottom: false, bottomInset: 0 })
    element.remove()
    document.body.style.overflowY = ''
    delete (document.body as Partial<HTMLElement>).getBoundingClientRect
  })

  it('reports again on a forced refresh even when unchanged', () => {
    const element = createScrollableElement(document, 0)
    const onStateChange = jest.fn()
    const container = new ScrollContainer(element, {}, onStateChange)

    container.refresh(true)

    expect(onStateChange).toHaveBeenCalledTimes(2)
  })

  it('smooth scrolls, then snaps to the bottom on scrollend and moves the caret once on the next frame', () => {
    const element = createScrollableElement(document, 0)
    const moveCaretToEnd = jest.fn()
    const container = new ScrollContainer(element, { moveCaretToEnd }, jest.fn())

    container.scrollToEnd(true)
    expect(element.scrollTo).toHaveBeenCalledWith({ top: 800, behavior: 'smooth' })

    element.dispatchEvent(new Event('scrollend'))
    expect(element.scrollTop).toBe(800)
    expect(moveCaretToEnd).not.toHaveBeenCalled()

    jest.runAllTimers()
    expect(moveCaretToEnd).toHaveBeenCalledTimes(1)
  })

  it('finishes after the fallback delay when scrollend never fires', () => {
    const element = createScrollableElement(document, 0)
    const moveCaretToEnd = jest.fn()
    const container = new ScrollContainer(element, { moveCaretToEnd }, jest.fn())

    container.scrollToEnd(true)
    jest.runAllTimers()

    expect(element.scrollTop).toBe(800)
    expect(moveCaretToEnd).toHaveBeenCalledTimes(1)
  })

  it('does not move the caret if the container was disposed while scrolling', () => {
    const element = createScrollableElement(document, 0)
    const moveCaretToEnd = jest.fn()
    const afterScrollToEnd = jest.fn()
    const container = new ScrollContainer(element, { moveCaretToEnd, afterScrollToEnd }, jest.fn())

    container.scrollToEnd(true)
    container.dispose()
    jest.runAllTimers()

    expect(moveCaretToEnd).not.toHaveBeenCalled()
    expect(afterScrollToEnd).toHaveBeenCalledTimes(1)
  })

  it('calls beforeScrollToEnd before scrolling and afterScrollToEnd at the bottom, even when not moving the caret', () => {
    const element = createScrollableElement(document, 0)
    const beforeScrollToEnd = jest.fn(() => expect(element.scrollTo).not.toHaveBeenCalled())
    const afterScrollToEnd = jest.fn(() => expect(element.scrollTop).toBe(800))
    const container = new ScrollContainer(element, { beforeScrollToEnd, afterScrollToEnd }, jest.fn())

    container.scrollToEnd(false)
    expect(beforeScrollToEnd).toHaveBeenCalledTimes(1)
    expect(afterScrollToEnd).not.toHaveBeenCalled()

    jest.runAllTimers()
    expect(afterScrollToEnd).toHaveBeenCalledTimes(1)
  })

  it('does not move the caret when not asked to', () => {
    const element = createScrollableElement(document, 800)
    const moveCaretToEnd = jest.fn()
    const container = new ScrollContainer(element, { moveCaretToEnd }, jest.fn())

    container.scrollToEnd(false)

    expect(moveCaretToEnd).not.toHaveBeenCalled()
  })

  it('listens for scroll events on the window when the element is the document scroller', () => {
    const element = createScrollableElement(document, 0)
    Object.defineProperty(document, 'scrollingElement', { value: element, configurable: true })
    const onStateChange = jest.fn()
    new ScrollContainer(element, {}, onStateChange)

    element.scrollTop = 800
    window.dispatchEvent(new Event('scroll'))

    expect(onStateChange).toHaveBeenLastCalledWith({ canScroll: true, isAtBottom: true, bottomInset: 0 })
    delete (document as { scrollingElement?: Element }).scrollingElement
  })

  it('stops reporting after dispose', () => {
    const element = createScrollableElement(document, 0)
    const onStateChange = jest.fn()
    const container = new ScrollContainer(element, {}, onStateChange)

    container.dispose()
    element.scrollTop = 800
    element.dispatchEvent(new Event('scroll'))

    expect(onStateChange).toHaveBeenCalledTimes(1)
  })
})

describe('ComponentRelay scroll container', () => {
  let childWindow: Window
  let relay: ComponentRelay
  let postMessage: jest.SpyInstance

  const sendFromHost = (data: Record<string, unknown>) => {
    const ChildMessageEvent = (childWindow as Window & { MessageEvent: typeof MessageEvent }).MessageEvent
    childWindow.dispatchEvent(new ChildMessageEvent('message', { data, origin: 'http://localhost' }))
  }

  const register = (data: Record<string, unknown> = {}) => {
    sendFromHost({
      action: ComponentAction.ComponentRegistered,
      sessionKey: 'session-key',
      data: { uuid: 'component-uuid', environment: 'web', platform: 'linux-web', activeThemeUrls: [], ...data },
    })
  }

  const postedScrollStates = () =>
    postMessage.mock.calls
      .map(([message]) => message)
      .filter((message) => message.action === ComponentAction.ScrollState)
      .map((message) => message.data)

  beforeEach(() => {
    window.document.body.innerHTML = '<iframe></iframe>'
    childWindow = (window.document.querySelector('iframe') as HTMLIFrameElement).contentWindow as Window
    postMessage = jest.spyOn(window, 'postMessage').mockImplementation(() => undefined)
    relay = new ComponentRelay({ targetWindow: childWindow, handleRequestForContentHeight: () => undefined })
  })

  afterEach(() => {
    relay.deinit()
  })

  it('sends the scroll state once the component is registered', () => {
    relay.registerScrollContainer(createScrollableElement(childWindow.document, 0))
    expect(postedScrollStates()).toEqual([])

    register()

    expect(postedScrollStates()).toContainEqual({ canScroll: true, isAtBottom: false, bottomInset: 0 })
  })

  it('scrolls to the end and moves the caret when the host asks', () => {
    const moveCaretToEnd = jest.fn()
    relay.registerScrollContainer(createScrollableElement(childWindow.document, 800), { moveCaretToEnd })
    register()

    jest.useFakeTimers()
    sendFromHost({ action: ComponentAction.ScrollToEnd, sessionKey: 'session-key', data: { moveCaret: true } })
    jest.runAllTimers()
    jest.useRealTimers()

    expect(moveCaretToEnd).toHaveBeenCalledTimes(1)
  })

  describe('scroll to end shortcut', () => {
    const pressKey = (init: KeyboardEventInit) => {
      const ChildKeyboardEvent = (childWindow as Window & { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent
      const event = new ChildKeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true, ...init })
      childWindow.document.body.dispatchEvent(event)
      return event
    }

    const forwardedKeys = () =>
      postMessage.mock.calls
        .map(([message]) => message)
        .filter((message) => message.action === ComponentAction.KeyDown)
        .map((message) => message.data)

    it('cancels the native jump and still forwards the shortcut to the host', () => {
      relay.registerScrollContainer(createScrollableElement(childWindow.document, 0))
      register({ handlesScrollToEndShortcut: true })

      expect(pressKey({ ctrlKey: true }).defaultPrevented).toBe(true)
      expect(forwardedKeys()).toContainEqual(expect.objectContaining({ key: 'End', ctrlKey: true }))
    })

    it('leaves other End combinations alone', () => {
      relay.registerScrollContainer(createScrollableElement(childWindow.document, 0))
      register({ handlesScrollToEndShortcut: true })

      expect(pressKey({ ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false)
      expect(pressKey({ metaKey: true }).defaultPrevented).toBe(false)
    })

    it('uses Cmd+Down on Mac', () => {
      relay.registerScrollContainer(createScrollableElement(childWindow.document, 0))
      register({ platform: 'mac-web', handlesScrollToEndShortcut: true })

      expect(pressKey({ key: 'ArrowDown', metaKey: true }).defaultPrevented).toBe(true)
      expect(pressKey({ metaKey: true }).defaultPrevented).toBe(false)
      expect(pressKey({ key: 'ArrowDown', metaKey: true, shiftKey: true }).defaultPrevented).toBe(false)
    })

    it('leaves the shortcut alone when the host does not handle it', () => {
      relay.registerScrollContainer(createScrollableElement(childWindow.document, 0))
      register()

      expect(pressKey({ ctrlKey: true }).defaultPrevented).toBe(false)
    })

    it('leaves the shortcut alone when no scroll container is registered', () => {
      register({ handlesScrollToEndShortcut: true })

      expect(pressKey({ ctrlKey: true }).defaultPrevented).toBe(false)
    })
  })
})
