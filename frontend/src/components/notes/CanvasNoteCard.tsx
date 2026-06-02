import { GripVertical, Edit2, Trash2, Tag } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Note } from '../../services/notesService'

interface CanvasNoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (noteId: number) => void
}

export function CanvasNoteCard({ note, onEdit, onDelete }: CanvasNoteCardProps) {
  // Generate a color based on note ID for visual variety
  const colors = [
    'bg-yellow-100 border-yellow-300',
    'bg-blue-100 border-blue-300',
    'bg-green-100 border-green-300',
    'bg-pink-100 border-pink-300',
    'bg-purple-100 border-purple-300',
    'bg-orange-100 border-orange-300',
  ]
  const colorClass = colors[note.id % colors.length]

  // Truncate content for display
  const displayContent = note.content.length > 150
    ? note.content.substring(0, 150) + '...'
    : note.content

  return (
    <div
      className={`w-80 rounded-lg border-2 shadow-lg hover:shadow-xl transition-shadow ${colorClass}`}
      style={{ cursor: 'move' }}
    >
      {/* Drag Handle */}
      <div className="drag-handle flex items-center justify-between p-3 border-b border-gray-300 bg-white bg-opacity-50">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">
            {new Date(note.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(note)
            }}
            className="p-1 hover:bg-white hover:bg-opacity-70 rounded transition-colors"
            title="Edit note"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(note.id)
            }}
            className="p-1 hover:bg-white hover:bg-opacity-70 rounded transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-em:text-gray-700">
          <ReactMarkdown
            components={{
              // Customize rendering to fit sticky note style
              h1: ({ node, ...props }) => <h1 className="text-base font-bold mb-2" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-1" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-sm font-semibold mb-1" {...props} />,
              p: ({ node, ...props }) => <p className="text-sm leading-relaxed mb-2 last:mb-0" {...props} />,
              ul: ({ node, ...props }) => <ul className="text-sm list-disc list-inside mb-2" {...props} />,
              ol: ({ node, ...props }) => <ol className="text-sm list-decimal list-inside mb-2" {...props} />,
              li: ({ node, ...props }) => <li className="mb-1" {...props} />,
              code: ({ node, inline, ...props }: any) => 
                inline 
                  ? <code className="bg-white bg-opacity-50 px-1 rounded text-xs" {...props} />
                  : <code className="block bg-white bg-opacity-50 p-2 rounded text-xs overflow-x-auto" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-gray-400 pl-2 italic text-sm" {...props} />,
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-300">
            <Tag className="w-3 h-3 text-gray-500 mt-1" />
            {note.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-white bg-opacity-70 text-gray-700 rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
