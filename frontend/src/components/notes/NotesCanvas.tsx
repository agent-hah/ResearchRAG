import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ZoomIn, ZoomOut, Maximize2, Grid } from 'lucide-react'
import _Draggable from 'react-draggable'
const Draggable = _Draggable as any
import { NoteEditor } from './NoteEditor'
import { CanvasNoteCard } from './CanvasNoteCard'
import { ConfirmDialog } from '../common/ConfirmDialog'
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
  const [showGrid, setShowGrid] = useState(true)
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null)
  const [{ zoom, pan }, setView] = useState({ zoom: 0.75, pan: { x: 0, y: 0 } })
  
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
            x: (rect.width / 2 - 150 - pan.x) / zoom,
            y: (rect.height / 2 - 100 - pan.y) / zoom
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

  const handleSaveNote = (title: string, content: string, tags: string[]) => {
    if (editingNote) {
      updateMutation.mutate({
        id: editingNote.id,
        update: { title, content, tags }
      })
    } else {
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
    setNoteToDelete(noteId)
  }

  const handleDragStop = useCallback((noteId: number, data: { x: number; y: number }) => {
    setNotePositions(prev => ({
      ...prev,
      [noteId]: { x: data.x, y: data.y }
    }))
  }, [])

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

  const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const updateZoom = (direction: 'in' | 'out' | null, absolute?: number) => {
    setView(prevView => {
      let newZoom = prevView.zoom;
      if (absolute !== undefined) {
        newZoom = absolute;
      } else if (direction === 'in') {
        const nextLevel = ZOOM_LEVELS.find(z => z > prevView.zoom + 0.01) || prevView.zoom;
        newZoom = nextLevel;
      } else if (direction === 'out') {
        const prevLevel = [...ZOOM_LEVELS].reverse().find(z => z < prevView.zoom - 0.01) || prevView.zoom;
        newZoom = prevLevel;
      }
      
      if (prevView.zoom === newZoom) return prevView;
      
      if (!canvasRef.current) return { ...prevView, zoom: newZoom };
      
      const targetX = canvasRef.current.clientWidth / 2;
      const targetY = canvasRef.current.clientHeight / 2;
      
      const ix = (targetX - prevView.pan.x) / prevView.zoom;
      const iy = (targetY - prevView.pan.y) / prevView.zoom;
      
      return {
        zoom: newZoom,
        pan: {
          x: targetX - ix * newZoom,
          y: targetY - iy * newZoom
        }
      };
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent browser zoom and native scroll

      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = Math.exp(-e.deltaY / 200);
        setView(prevView => {
          let newZoom = prevView.zoom * zoomFactor;
          newZoom = Math.max(0.1, Math.min(3, newZoom));
          if (prevView.zoom === newZoom) return prevView;
          
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const ix = (mouseX - prevView.pan.x) / prevView.zoom;
          const iy = (mouseY - prevView.pan.y) / prevView.zoom;
          
          return {
            zoom: newZoom,
            pan: {
              x: mouseX - ix * newZoom,
              y: mouseY - iy * newZoom
            }
          };
        });
      } else {
        // Two-finger trackpad pan or regular mouse wheel
        setView(prevView => ({
          ...prevView,
          pan: {
            x: prevView.pan.x - e.deltaX,
            y: prevView.pan.y - e.deltaY
          }
        }));
      }
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, [notes, notePositions]); // Re-bind if dependencies change, though we mostly just use state updaters

  const handleZoomIn = () => updateZoom('in');
  const handleZoomOut = () => updateZoom('out');
  const handleResetZoom = () => updateZoom(null, 0.75);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.id === 'canvas-container' || target.id === 'canvas-content') {
      setIsDraggingCanvas(true)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return
    setView(prev => ({
      ...prev,
      pan: {
        x: prev.pan.x + e.movementX,
        y: prev.pan.y + e.movementY
      }
    }))
  }

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false)
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
              disabled={zoom <= 0.25}
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
          id="canvas-container"
          className="w-full h-full overflow-hidden select-none"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{
            cursor: isDraggingCanvas ? 'grabbing' : 'grab',
            backgroundImage: showGrid
              ? `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `
              : 'none',
            backgroundSize: showGrid ? `${20 * zoom}px ${20 * zoom}px` : 'auto',
            backgroundPosition: showGrid ? `${pan.x}px ${pan.y}px` : '0 0'
          }}
        >
          <div
            id="canvas-content"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0
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
                initialTitle={editingNote?.title}
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

      <ConfirmDialog
        isOpen={noteToDelete !== null}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        confirmText="Delete"
        onConfirm={() => {
          if (noteToDelete !== null) {
            deleteMutation.mutate(noteToDelete)
            setNoteToDelete(null)
          }
        }}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  )
}
