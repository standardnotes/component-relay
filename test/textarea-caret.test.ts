import { createTextareaCaretHandler } from '../lib/textareaCaret'

describe('createTextareaCaretHandler', () => {
  let textarea: HTMLTextAreaElement

  beforeEach(() => {
    textarea = document.createElement('textarea')
    textarea.value = 'hello world'
    document.body.appendChild(textarea)
  })

  afterEach(() => {
    textarea.remove()
  })

  it('reads the end of the selection as the caret, or its start for a backward selection', () => {
    const handler = createTextareaCaretHandler(textarea)

    textarea.setSelectionRange(2, 5, 'forward')
    expect(handler.getOffset()).toBe(5)

    textarea.setSelectionRange(2, 5, 'backward')
    expect(handler.getOffset()).toBe(2)
  })

  it('focuses the textarea and places the caret at the offset', () => {
    createTextareaCaretHandler(textarea).restore(6)

    expect(document.activeElement).toBe(textarea)
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([6, 6])
  })

  it('clamps an offset outside the text', () => {
    const handler = createTextareaCaretHandler(textarea)

    handler.restore(500)
    expect(textarea.selectionEnd).toBe(11)

    handler.restore(-3)
    expect(textarea.selectionEnd).toBe(0)
  })

  it('only focuses when there is no offset', () => {
    textarea.setSelectionRange(3, 3)

    createTextareaCaretHandler(textarea).restore(undefined)

    expect(document.activeElement).toBe(textarea)
    expect(textarea.selectionEnd).toBe(3)
  })

  it('focuses after setting the selection so the browser scrolls the caret into view', () => {
    const calls: string[] = []
    jest.spyOn(textarea, 'setSelectionRange').mockImplementation(() => void calls.push('select'))
    jest.spyOn(textarea, 'focus').mockImplementation(() => void calls.push('focus'))

    createTextareaCaretHandler(textarea).restore(6)

    expect(calls).toEqual(['select', 'focus'])
  })

  it('does not scroll when there is no offset to reveal', () => {
    const focus = jest.spyOn(textarea, 'focus')

    createTextareaCaretHandler(textarea).restore(undefined)

    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })
})
