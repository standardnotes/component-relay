import { CodeMirrorEditor, createCodeMirrorCaretHandler } from '../lib/codeMirrorCaret'

describe('createCodeMirrorCaretHandler', () => {
  const createEditor = (): jest.Mocked<CodeMirrorEditor> => ({
    focus: jest.fn(),
    getCursor: jest.fn().mockReturnValue({ line: 1, ch: 2 }),
    setCursor: jest.fn(),
    indexFromPos: jest.fn().mockReturnValue(9),
    posFromIndex: jest.fn().mockReturnValue({ line: 3, ch: 1 }),
  })

  it('reads the offset of the cursor head', () => {
    const editor = createEditor()

    expect(createCodeMirrorCaretHandler(editor).getOffset()).toBe(9)
    expect(editor.getCursor).toHaveBeenCalledWith('head')
    expect(editor.indexFromPos).toHaveBeenCalledWith({ line: 1, ch: 2 })
  })

  it('focuses the editor, moves the cursor to the offset', () => {
    const editor = createEditor()

    createCodeMirrorCaretHandler(editor).restore(25)

    expect(editor.focus).toHaveBeenCalled()
    expect(editor.posFromIndex).toHaveBeenCalledWith(25)
    expect(editor.setCursor).toHaveBeenCalledWith({ line: 3, ch: 1 })
  })

  it('only focuses when there is no offset', () => {
    const editor = createEditor()

    createCodeMirrorCaretHandler(editor).restore(undefined)

    expect(editor.focus).toHaveBeenCalled()
    expect(editor.setCursor).not.toHaveBeenCalled()
  })
})
