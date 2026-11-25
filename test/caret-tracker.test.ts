import ComponentRelay from '../lib/ComponentRelay'
import { CaretHandler, CaretTracker } from '../lib/CaretTracker'

describe('CaretTracker', () => {
  let offset: number | undefined
  let handler: CaretHandler
  let onOffsetChange: jest.Mock
  let tracker: CaretTracker

  const createTracker = (
    restoration?: { type: 'focus' } | { type: 'offset'; offset: number },
    trackingEnabled = true,
  ) => {
    tracker = new CaretTracker(window, handler, onOffsetChange, restoration, trackingEnabled)
  }

  const moveCaret = (to: number | undefined) => {
    offset = to
    document.dispatchEvent(new Event('selectionchange'))
  }

  beforeEach(() => {
    jest.useFakeTimers()
    offset = 0
    handler = { getOffset: jest.fn(() => offset), restore: jest.fn().mockReturnValue(true) }
    onOffsetChange = jest.fn()
  })

  afterEach(() => {
    tracker.dispose()
    jest.useRealTimers()
  })

  describe('reporting the caret', () => {
    it('reports the offset once the caret has settled', () => {
      createTracker()

      moveCaret(3)
      moveCaret(5)
      expect(onOffsetChange).not.toHaveBeenCalled()

      jest.runAllTimers()

      expect(onOffsetChange).toHaveBeenCalledTimes(1)
      expect(onOffsetChange).toHaveBeenCalledWith(5)
    })

    it.each(['keyup', 'pointerup'])('also reads the caret after %s', (type) => {
      createTracker()
      offset = 4

      window.dispatchEvent(new Event(type))
      jest.runAllTimers()

      expect(onOffsetChange).toHaveBeenCalledWith(4)
    })

    it('does not report an unchanged offset again', () => {
      createTracker()

      moveCaret(3)
      jest.runAllTimers()
      moveCaret(3)
      jest.runAllTimers()

      expect(onOffsetChange).toHaveBeenCalledTimes(1)
    })

    it('does not report when the editor has no caret', () => {
      createTracker()

      moveCaret(undefined)
      jest.runAllTimers()

      expect(onOffsetChange).not.toHaveBeenCalled()
    })

    it.each(['blur', 'pagehide'])('reports right away on %s so a pending change is not lost', (type) => {
      createTracker()
      moveCaret(8)

      window.dispatchEvent(new Event(type))

      expect(onOffsetChange).toHaveBeenCalledWith(8)
    })

    it('stops reporting after being disposed', () => {
      createTracker()

      tracker.dispose()
      moveCaret(3)
      jest.runAllTimers()

      expect(onOffsetChange).not.toHaveBeenCalled()
    })

    it('flushes a pending caret read when disposed', () => {
      createTracker()
      moveCaret(8)

      tracker.dispose()

      expect(onOffsetChange).toHaveBeenCalledWith(8)
    })

    it('does not read or report the caret while tracking is disabled', () => {
      createTracker(undefined, false)

      moveCaret(8)
      window.dispatchEvent(new Event('keyup'))
      jest.runAllTimers()

      expect(handler.getOffset).not.toHaveBeenCalled()
      expect(onOffsetChange).not.toHaveBeenCalled()
    })
  })

  describe('restoring the caret', () => {
    it('restores the offset once the text is loaded', () => {
      createTracker({ type: 'offset', offset: 12 })

      expect(handler.restore).not.toHaveBeenCalled()
      tracker.notifyTextLoaded()

      expect(handler.restore).toHaveBeenCalledWith(12)
    })

    it('only focuses when the host has no offset to restore', () => {
      createTracker({ type: 'focus' })

      tracker.notifyTextLoaded()

      expect(handler.restore).toHaveBeenCalledWith(undefined)
    })

    it('does nothing when the host did not ask to restore', () => {
      createTracker()

      tracker.notifyTextLoaded()

      expect(handler.restore).not.toHaveBeenCalled()
    })

    it('restores when the host asks after the text was already loaded', () => {
      createTracker()
      tracker.notifyTextLoaded()

      tracker.setRestoration({ type: 'offset', offset: 7 })

      expect(handler.restore).toHaveBeenCalledWith(7)
    })

    it('restores only once', () => {
      createTracker({ type: 'offset', offset: 12 })

      tracker.notifyTextLoaded()
      tracker.notifyTextLoaded()

      expect(handler.restore).toHaveBeenCalledTimes(1)
    })

    it('keeps the restoration pending until the handler succeeds', () => {
      createTracker({ type: 'offset', offset: 12 })
      const restore = handler.restore as jest.Mock
      restore.mockReturnValueOnce(false)

      tracker.notifyTextLoaded()
      tracker.notifyTextLoaded()

      expect(handler.restore).toHaveBeenCalledTimes(2)
      expect(handler.restore).toHaveBeenLastCalledWith(12)
    })

    it('does not report the editor’s starting caret before the restore has happened', () => {
      createTracker({ type: 'offset', offset: 12 })

      moveCaret(0)
      jest.runAllTimers()

      expect(onOffsetChange).not.toHaveBeenCalled()
    })

    it('reports the restored caret afterwards', () => {
      createTracker({ type: 'offset', offset: 12 })
      tracker.notifyTextLoaded()

      moveCaret(12)
      jest.runAllTimers()

      expect(onOffsetChange).toHaveBeenCalledWith(12)
    })
  })
})

describe('ComponentRelay caret handler', () => {
  const createRelay = () => {
    const relay = new ComponentRelay({ targetWindow: window, onReady: jest.fn() })
    const handler: CaretHandler = {
      getOffset: jest.fn().mockReturnValue(9),
      restore: jest.fn().mockReturnValue(true),
    }
    const ready = (data: Record<string, unknown>) =>
      (relay as unknown as { onReady: (data: Record<string, unknown>) => void }).onReady(data)

    return { relay, handler, ready }
  }

  beforeAll(() => {
    Object.defineProperty(window, 'parent', { value: { postMessage: jest.fn() }, configurable: true })
  })

  it('restores the offset the host sent on registration once the text is loaded', () => {
    const { relay, handler, ready } = createRelay()
    const registration = relay.registerCaretHandler(handler)

    ready({ restoreCaret: true, caretOffset: 5 })
    expect(handler.restore).not.toHaveBeenCalled()
    registration.notifyTextLoaded()

    expect(handler.restore).toHaveBeenCalledWith(5)
    relay.deinit()
  })

  it('restores when the handler is registered after the host registered the component', () => {
    const { relay, handler, ready } = createRelay()
    ready({ restoreCaret: true, caretOffset: 5 })

    relay.registerCaretHandler(handler).notifyTextLoaded()

    expect(handler.restore).toHaveBeenCalledWith(5)
    relay.deinit()
  })

  it('does not restore when the host did not ask to', () => {
    jest.useFakeTimers()
    const { relay, handler, ready } = createRelay()
    const registration = relay.registerCaretHandler(handler)

    ready({})
    registration.notifyTextLoaded()
    document.dispatchEvent(new Event('selectionchange'))
    jest.runAllTimers()

    expect(handler.restore).not.toHaveBeenCalled()
    expect(handler.getOffset).not.toHaveBeenCalled()
    relay.deinit()
    jest.useRealTimers()
  })

  it('does not restore the original offset when the handler is replaced', () => {
    const { relay, handler, ready } = createRelay()
    ready({ restoreCaret: true, caretOffset: 5 })

    relay.registerCaretHandler(handler).notifyTextLoaded()
    relay.registerCaretHandler(handler).notifyTextLoaded()

    expect(handler.restore).toHaveBeenCalledTimes(1)
    relay.deinit()
  })
})
