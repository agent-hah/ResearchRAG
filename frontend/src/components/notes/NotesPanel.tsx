import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, StickyNote } from 'lucide-react'
import { NoteEditor } from './NoteEditor'
import { NoteCard } from './NoteCard'
import { notesService, type Note, type NoteCreate, type NoteUpdate } from '../../services/notesService'

interface NotesPanelProps {
  queryId?: number
  datasetId?: number
  literatureId?: number
}

export function NotesPanel({ queryId, datasetId, literatureId }: NotesPanelProps) {
  const queryClient = useQueryClient()
  const [showEditor, setShowEditor] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Fetch notes
  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes', searchQuery, selectedTags.join(',')],
    queryFn: () => notesService.listNotes(
      0,
      50,
      selectedTags.length > 0 ? selectedTags.join(',') : undefined,
      searchQuery || undefined
    )
  })

  // Create note mutation
  const createMutation = useMutation({
    mutationFn: (note: NoteCreate) => notesService.createNote(note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setShowEditor(false)
    }
  })

  // Update note mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: number; update: NoteUpdate }) =>
      notesService.updateNote(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setEditingNote(null)
      setShowEditor(false)
    }
  })

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: number) => notesService.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    }
  })

  const handleSaveNote = (title: string, content: string, tags: string[]) => {
    if (editingNote) {
      // Update existing note
      updateMutation.mutate({
        id: editingNote.id,
        update: { title, content, tags }
      })
    } else {
      // Create new note
      const noteData: NoteCreate = {
        title,
        content,
        tags,
        query_id: queryId,
        dataset_id: datasetId,
        literature_id: literatureId
      }
      createMutation.mutate(noteData)
    }
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setShowEditor(true)
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setShowEditor(false)
  }

  const handleDeleteNote = (noteId: number) => {
    deleteMutation.mutate(noteId)
  }

  // Extract all unique tags from notes
  const allTags = Array.from(
    new Set(notes.flatMap(note => note.tags || []))
  ).sort()

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">Notes</h2>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {notes.length}
          </span>
        </div>
        <button type="button"
          onClick={() => setShowEditor(!showEditor)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="card-content space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter by tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button type="button"
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      {showEditor && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingNote ? 'Edit Note' : 'Create New Note'}
            </h3>
          </div>
          <div className="card-content">
            <NoteEditor
              initialTitle={editingNote?.title}
              initialContent={editingNote?.content}
              initialTags={editingNote?.tags || []}
              onSave={handleSaveNote}
              onCancel={handleCancelEdit}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-content">
            <p className="text-sm text-red-700">
              Failed to load notes. Please try again.
            </p>
          </div>
        </div>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-content">
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="card">
          <div className="card-content text-center py-12">
            <StickyNote className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedTags.length > 0
                ? 'No notes match your search criteria'
                : 'Create your first note to get started'}
            </p>
            {!showEditor && (
              <button type="button"
                onClick={() => setShowEditor(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create Note
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>
      )}
    </div>
  )
}
