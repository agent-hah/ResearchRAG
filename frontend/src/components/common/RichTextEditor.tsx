import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote 
} from 'lucide-react'
import { useEffect } from 'react'

interface RichTextEditorProps {
  initialContent: string
  onChange: (content: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: string
  maxHeight?: string
}



const preventFocusLoss = (e: React.MouseEvent) => {
  e.preventDefault()
}

const MenuBar = ({ editor, disabled }: { editor: any, disabled?: boolean }) => {
  if (!editor) {
    return null
  }

  const buttonClass = (isActive: boolean) => 
    `p-1.5 rounded transition-colors ${isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 bg-gray-50 rounded-t-lg">
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={disabled}
        className={buttonClass(editor.isActive('bold'))}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={disabled}
        className={buttonClass(editor.isActive('italic'))}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={disabled}
        className={buttonClass(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        disabled={disabled}
        className={buttonClass(editor.isActive('heading', { level: 1 }))}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        disabled={disabled}
        className={buttonClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={disabled}
        className={buttonClass(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={disabled}
        className={buttonClass(editor.isActive('orderedList'))}
        title="Ordered List"
      >
        <ListOrdered size={16} />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={disabled}
        className={buttonClass(editor.isActive('blockquote'))}
        title="Blockquote"
      >
        <Quote size={16} />
      </button>
    </div>
  )
}

export function RichTextEditor({
  initialContent,
  onChange,
  placeholder = 'Write here...',
  disabled = false,
  minHeight = '150px',
  maxHeight = '400px'
}: RichTextEditorProps) {
  // The original unused ref was removed

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: initialContent,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // get the markdown content and pass it back
      const markdown = (editor.storage as any).markdown.getMarkdown()
      onChange(markdown)
    },
    editorProps: {
      attributes: {
        'aria-label': placeholder,
        role: 'textbox',
        'aria-multiline': 'true',
        class: `focus:outline-none p-4 overflow-y-auto [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-lg [&_h3]:font-medium [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:border-gray-300 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_p]:mb-2 [&_p:last-child]:mb-0`,
        style: `min-height: ${minHeight}; max-height: ${maxHeight};`
      },
    },
  })

  // Update editor if disabled state changes
  useEffect(() => {
    if (editor) {
      const timer = setTimeout(() => {
        editor.setEditable(!disabled)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [editor, disabled])

  return (
    <div className={`flex flex-col border border-gray-300 rounded-lg bg-white overflow-hidden ${disabled ? 'opacity-70 bg-gray-50' : 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent'}`}>
      <MenuBar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} className="flex-1 cursor-text" onClick={() => editor?.commands.focus()} />
    </div>
  )
}
