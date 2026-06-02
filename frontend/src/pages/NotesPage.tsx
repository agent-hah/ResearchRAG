import { useState } from 'react'
import { List, Grid3x3 } from 'lucide-react'
import { NotesPanel } from '../components/notes/NotesPanel'
import { NotesCanvas } from '../components/notes/NotesCanvas'

type ViewMode = 'list' | 'canvas'

export function NotesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
            <p className="mt-2 text-lg text-gray-600">
              Capture insights, annotate findings, and organize your research
            </p>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="font-medium">List</span>
            </button>
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                viewMode === 'canvas'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="font-medium">Canvas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="h-full overflow-auto p-6">
            <NotesPanel />
          </div>
        ) : (
          <NotesCanvas />
        )}
      </div>
    </div>
  )
}
