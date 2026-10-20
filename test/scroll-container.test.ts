import ComponentRelay from '../lib/ComponentRelay'
import { ScrollContainer } from '../lib/ScrollContainer'
import { ComponentAction } from '../lib/Types/ComponentAction'

beforeEach(() => {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }))
  window.matchMedia = jest.fn().mockReturnValue({ matches: false })
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 16)
})

function createScrollableElement(doc: Document, scrollTop: number): HTMLElement {
  const element = doc.createElement('div')
  Object.defineProperty(element, 'scrollHeight', { value: 1000, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: 200, configurable: true })
  element.scrollTop = scrollTop
  element.scrollTo = jest.fn()
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
    expect(onStateChange).toHaveBeenCalledWith({ canScroll: true, isAtBottom: false })

    element.scrollTop = 100
    element.dispatchEvent(new Event('scroll'))
    expect(onStateChange).toHaveBeenCalledTimes(1)

    element.scrollTop = 800
    element.dispatchEvent(new Event('scroll'))
    expect(onStateChange).toHaveBeenLastCalledWith({ canScroll: true, isAtBottom: true })
    expect(onStateChange).toHaveBeenCalledTimes(2)
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

    expect(onStateChange).toHaveBeenLastCalledWith({ canScroll: true, isAtBottom: true })
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

  const register = () => {
    sendFromHost({
      action: ComponentAction.ComponentRegistered,
      sessionKey: 'session-key',
      data: { uuid: 'component-uuid', environment: 'web', platform: 'linux-web', activeThemeUrls: [] },
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

    expect(postedScrollStates()).toContainEqual({ canScroll: true, isAtBottom: false })
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
})
