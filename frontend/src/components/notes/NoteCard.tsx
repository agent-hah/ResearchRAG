import { useState } from 'react'
import { Edit2, Trash2, Tag, Calendar, Link as LinkIcon } from 'lucide-react'
import type { Note } from '../../services/notesService'
import ReactMarkdown from 'react-markdown'
import { ConfirmDialog } from '../common/ConfirmDialog'

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (noteId: number) => void
  onViewRelationships?: (noteId: number) => void
}

export function NoteCard({ note, onEdit, onDelete, onViewRelationships }: NoteCardProps) {
  const [showFullContent, setShowFullContent] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const contentPreview = note.content.length > 200 
    ? note.content.substring(0, 200) + '...'
    : note.content

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    onDelete(note.id)
    setIsDeleteDialogOpen(false)
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-content">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {note.title || 'Untitled Note'}
        </h3>

        {/* Content */}
        <div className="prose prose-sm max-w-none mb-4">
          <ReactMarkdown>
            {showFullContent ? note.content : contentPreview}
          </ReactMarkdown>
        </div>
        
        {note.content.length > 200 && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="text-sm text-primary-600 hover:text-primary-700 mb-4"
          >
            {showFullContent ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {note.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(note.created_at).toLocaleDateString()}
            </span>
            {(note.dataset_id || note.literature_id || note.query_id) && (
              <span className="flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                Linked
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => onEdit(note)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          {onViewRelationships && (
            <button
              onClick={() => onViewRelationships(note.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors ml-auto"
            >
              <LinkIcon className="w-4 h-4" />
              Relationships
            </button>
          )}
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Note"
        message="Are you sure you want to delete this note? This will also remove all its relationships."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  )
}
