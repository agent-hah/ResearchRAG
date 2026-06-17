import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RichTextEditor } from '@/components/common/RichTextEditor'

// Since tiptap uses contenteditable which can be tricky to test with JSDOM,
// we verify the toolbar and basic rendering
describe('RichTextEditor', () => {
  it('renders toolbar buttons', () => {
    render(
      <RichTextEditor
        initialContent="Hello"
        onChange={vi.fn()}
      />
    )
    expect(screen.getByTitle('Bold')).toBeInTheDocument()
    expect(screen.getByTitle('Italic')).toBeInTheDocument()
    expect(screen.getByTitle('Strikethrough')).toBeInTheDocument()
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument()
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument()
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument()
    expect(screen.getByTitle('Ordered List')).toBeInTheDocument()
    expect(screen.getByTitle('Blockquote')).toBeInTheDocument()
  })

  it('renders the editor content', () => {
    const { container } = render(
      <RichTextEditor
        initialContent="Test content"
        onChange={vi.fn()}
      />
    )
    expect(container.querySelector('.ProseMirror')).toBeInTheDocument()
    expect(container.textContent).toContain('Test content')
  })

  it('disables buttons when disabled prop is true', () => {
    render(
      <RichTextEditor
        initialContent="Hello"
        onChange={vi.fn()}
        disabled={true}
      />
    )
    const boldButton = screen.getByTitle('Bold')
    expect(boldButton).toBeDisabled()
  })

  it('calls onChange when content is modified', async () => {
    const onChangeMock = vi.fn()
    const { container } = render(
      <RichTextEditor
        initialContent="Initial"
        onChange={onChangeMock}
      />
    )
    
    // Simulate user editing the contenteditable area
    const editorNode = container.querySelector('.ProseMirror')
    if (editorNode) {
      fireEvent.focus(editorNode)
      // JSDOM has limited support for contenteditable, but we can try to fire input
      fireEvent.input(editorNode, { target: { textContent: 'New Content' } })
      
      // Since it's tiptap, we can also test the menu buttons calling commands
      const boldButton = screen.getByTitle('Bold')
      fireEvent.mouseDown(boldButton)
      
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalled()
      })
    }
  })
})
