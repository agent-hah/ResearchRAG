import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ZoomIn, ZoomOut, Maximize2, Grid } from 'lucide-react'
import _Draggable from 'react-draggable'
const Draggable = _Draggable as any
import { NoteEditor } from './NoteEditor'
import { CanvasNoteCard } from './CanvasNoteCard'
import { notesService, type Note, type NoteCreate, type NoteUpdate } from '../../services/notesService'

interface NotePosition {
  x: number
  y: number
}

interface NotesPanelProps {
  queryId?: number
  datasetId?: number
  literatureId?: number
}

interface DraggableNoteWrapperProps {
  note: Note
  position: NotePosition
  zoom: number
  onDragStop: (noteId: number, data: { x: number; y: number }) => void
  onEdit: (note: Note) => void
  onDelete: (noteId: number) => void
}

function DraggableNoteWrapper({ note, position, zoom, onDragStop, onEdit, onDelete }: DraggableNoteWrapperProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  
  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onStop={(_: any, data: any) => onDragStop(note.id, data)}
      handle=".drag-handle"
      bounds="parent"
      scale={zoom}
    >
      <div ref={nodeRef} style={{ position: 'absolute' }}>
        <CanvasNoteCard
          note={note}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </Draggable>
  )
}

export function NotesCanvas({ queryId, datasetId, literatureId }: NotesPanelProps) {
  const queryClient = useQueryClient()
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const [showEditor, setShowEditor] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  
  // Store note positions in local state (could be persisted to backend)
  const [notePositions, setNotePositions] = useState<Record<number, NotePosition>>({})

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesService.listNotes(0, 100)
  })

  // Create note mutation
  const createMutation = useMutation({
    mutationFn: (note: NoteCreate) => notesService.createNote(note),
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setShowEditor(false)
      
      // Position new note in center of viewport
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        setNotePositions(prev => ({
          ...prev,
          [newNote.id]: {
            x: (rect.width / 2 - 150) / zoom,
            y: (rect.height / 2 - 100) / zoom
          }
        }))
      }
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
    onSuccess: (_, noteId) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      // Remove position data
      setNotePositions(prev => {
        const newPositions = { ...prev }
        delete newPositions[noteId]
        return newPositions
      })
    }
  })

  const handleSaveNote = (content: string, tags: string[]) => {
    if (editingNote) {
      updateMutation.mutate({
        id: editingNote.id,
        update: { content, tags }
      })
    } else {
      const noteData: NoteCreate = {
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
    if (confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate(noteId)
    }
  }

  const handleDragStop = useCallback((noteId: number, data: { x: number; y: number }) => {
    setNotePositions(prev => ({
      ...prev,
      [noteId]: { x: data.x, y: data.y }
    }))
  }, [])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5))
  }

  const handleResetZoom = () => {
    setZoom(1)
  }

  const getInitialPosition = (noteId: number, index: number): NotePosition => {
    if (notePositions[noteId]) {
      return notePositions[noteId]
    }
    
    // Arrange notes in a grid pattern initially
    const cols = 3
    const row = Math.floor(index / cols)
    const col = index % cols
    
    return {
      x: 50 + col * 350,
      y: 50 + row * 250
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Canvas View</h2>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {notes.length} notes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={showGrid ? 'Hide grid' : 'Show grid'}
          >
            <Grid className="w-5 h-5" />
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-sm font-medium hover:bg-gray-200 rounded min-w-[3rem] text-center"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 2}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* New Note Button */}
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden relative bg-gray-50">
        <div
          ref={canvasRef}
          className="w-full h-full overflow-auto"
          style={{
            backgroundImage: showGrid
              ? `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `
              : 'none',
            backgroundSize: showGrid ? `${20 * zoom}px ${20 * zoom}px` : 'auto'
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              minWidth: '2000px',
              minHeight: '2000px',
              position: 'relative'
            }}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading notes...</p>
                </div>
              </div>
            ) : notes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Maximize2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Your canvas is empty
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create notes and arrange them spatially to organize your research
                  </p>
                  <button
                    onClick={() => setShowEditor(true)}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Create Your First Note
                  </button>
                </div>
              </div>
            ) : (
              notes.map((note, index) => {
                const position = getInitialPosition(note.id, index)
                return (
                  <DraggableNoteWrapper
                    key={note.id}
                    note={note}
                    position={position}
                    zoom={zoom}
                    onDragStop={handleDragStop}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {editingNote ? 'Edit Note' : 'Create New Note'}
              </h3>
              <NoteEditor
                initialContent={editingNote?.content}
                initialTags={editingNote?.tags || []}
                onSave={handleSaveNote}
                onCancel={handleCancelEdit}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
