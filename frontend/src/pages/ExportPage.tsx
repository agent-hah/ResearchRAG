import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Database, Search, StickyNote, FileDown, X } from 'lucide-react'
import { fileService } from '../services/fileService'
import { queryService } from '../services/queryService'
import { notesService } from '../services/notesService'
import { api } from '@/lib/api'
import type { Dataset, Literature } from '@/types'

export function ExportPage() {
  const [exporting, setExporting] = useState(false)
  const [pdfAnnotationsEnabled, setPdfAnnotationsEnabled] = useState<Record<number, boolean>>({})
  const [selectedQueries, setSelectedQueries] = useState<number[]>([])

  const [selectedNotes, setSelectedNotes] = useState<number[]>(() => {
    const saved = localStorage.getItem('selectedNotes')
    return saved ? JSON.parse(saved) : []
  })

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('selectedTags')
    return saved ? JSON.parse(saved) : []
  })

  type ExportMode = 'all' | 'tag' | 'custom'
  const [exportMode, setExportMode] = useState<ExportMode>(() => {
    return (localStorage.getItem('noteExportMode') as ExportMode) || 'all'
  })

  const [showNotesModal, setShowNotesModal] = useState(false)
  const [notesSearchQuery, setNotesSearchQuery] = useState('')

  const [showTagsModal, setShowTagsModal] = useState(false)
  const [tagsSearchQuery, setTagsSearchQuery] = useState('')

  useEffect(() => {
    localStorage.setItem('selectedNotes', JSON.stringify(selectedNotes))
  }, [selectedNotes])

  useEffect(() => {
    localStorage.setItem('selectedTags', JSON.stringify(selectedTags))
  }, [selectedTags])

  useEffect(() => {
    localStorage.setItem('noteExportMode', exportMode)
  }, [exportMode])

  // Fetch datasets
  const { data: filesData } = useQuery({
    queryKey: ['files'],
    queryFn: fileService.listFiles,
  })

  const datasets = filesData?.datasets || []
  const literature = filesData?.literature || []

  // Fetch query history
  const { data: queryHistoryData } = useQuery({
    queryKey: ['query-history'],
    queryFn: () => queryService.getQueryHistory(0, 50),
  })

  // Extract queries array from response object
  const queries = queryHistoryData?.queries || []

  const [searchQuery, setSearchQuery] = useState('')

  const filteredQueries = useMemo(() => {
    if (!searchQuery.trim()) return queries
    const lowerQuery = searchQuery.toLowerCase()
    return queries.filter((q: any) => q.query.toLowerCase().includes(lowerQuery))
  }, [queries, searchQuery])

  // Fetch notes
  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesService.listNotes(0, 100),
  })

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    notes.forEach((n: any) => {
      if (n.tags) {
        n.tags.forEach((t: string) => tags.add(t))
      }
    })
    return Array.from(tags).sort()
  }, [notes])

  const handleExportDataset = async (datasetId: number, format: 'csv' | 'json', originalFilename?: string) => {
    try {
      setExporting(true)
      const response = await api.post(
        '/export/dataset',
        { dataset_id: datasetId, format },
        { responseType: 'blob' }
      )

      let baseName = `dataset_${datasetId}`;
      if (originalFilename) {
        baseName = originalFilename;
        if (baseName.toLowerCase().endsWith('.csv')) {
          baseName = baseName.slice(0, -4);
        } else if (baseName.toLowerCase().endsWith('.json')) {
          baseName = baseName.slice(0, -5);
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${baseName}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export dataset')
    } finally {
      setExporting(false)
    }
  }

  const handleExportQuery = async (queryIds: number[], format: 'json' | 'csv') => {
    try {
      setExporting(true)
      const response = await api.post(
        '/export/query',
        { query_ids: queryIds, format },
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `query_results.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export query results')
    } finally {
      setExporting(false)
    }
  }

  const toggleQuerySelection = (queryId: number) => {
    setSelectedQueries(prev =>
      prev.includes(queryId) ? prev.filter(id => id !== queryId) : [...prev, queryId]
    )
  }

  const toggleNoteSelection = (noteId: number) => {
    setSelectedNotes(prev =>
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    )
  }

  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleExportNotes = async (format: 'csv' | 'json') => {
    try {
      setExporting(true)
      let payload: any = { format }

      if (exportMode === 'custom') {
        if (selectedNotes.length === 0) {
          alert('Please select at least one note to export.')
          setExporting(false)
          return
        }
        payload.note_ids = selectedNotes
      } else if (exportMode === 'tag') {
        if (selectedTags.length === 0) {
          alert('Please select at least one tag to export.')
          setExporting(false)
          return
        }
        const tagNoteIds = notes.filter((n: any) => n.tags?.some((t: string) => selectedTags.includes(t))).map((n: any) => n.id)
        if (tagNoteIds.length === 0) {
          alert('No notes found for these tags.')
          setExporting(false)
          return
        }
        payload.note_ids = tagNoteIds
      }

      const response = await api.post(
        '/export/notes',
        payload,
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `notes.${format === 'csv' ? 'csv' : 'json'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export notes')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async (literatureId: number, includeAnnotations: boolean, originalFilename: string) => {
    try {
      setExporting(true)
      const response = await api.post(
        '/export/literature/pdf',
        { literature_id: literatureId, include_annotations: includeAnnotations },
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', originalFilename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  const togglePdfAnnotations = (literatureId: number) => {
    setPdfAnnotationsEnabled(prev => ({
      ...prev,
      [literatureId]: !prev[literatureId]
    }))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Download className="w-8 h-8 text-primary-600" />
          Export Data
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Export your data, results, and notes in various formats
        </p>
      </div>

      {/* Export Datasets */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-600" />
            Export Datasets
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Export your uploaded datasets as CSV or JSON
          </p>
        </div>
        <div className="card-content">
          {datasets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No datasets available</p>
          ) : (
            <div className="space-y-3">
              {datasets.map((dataset: Dataset) => (
                <div
                  key={dataset.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {dataset.filename}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {(dataset.row_count ?? dataset.metadata?.row_count ?? 0).toLocaleString()} rows
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleExportDataset(dataset.id, 'csv', dataset.filename)}
                      disabled={exporting}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleExportDataset(dataset.id, 'json', dataset.filename)}
                      disabled={exporting}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      JSON
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Query Results */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary-600" />
            Export Query Results
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Export results from your previous queries
          </p>
        </div>
        <div className="card-content">
          {queries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No query history available</p>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Search queries..."
                />
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {filteredQueries.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    No queries match your search
                  </div>
                ) : (
                  filteredQueries.map((query: any) => (
                    <div
                      key={query.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedQueries.includes(query.id)}
                          onChange={() => toggleQuerySelection(query.id)}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleQuerySelection(query.id)}>
                          <h3 className="font-medium text-gray-900 truncate" title={query.query}>
                            {query.query}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(query.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleExportQuery(selectedQueries, 'csv')}
                  disabled={exporting || selectedQueries.length === 0}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Export Selected as CSV
                </button>
                <button
                  onClick={() => handleExportQuery(selectedQueries, 'json')}
                  disabled={exporting || selectedQueries.length === 0}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Export Selected as JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Notes */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary-600" />
            Export Notes
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Export all your research notes
          </p>
        </div>
        <div className="card-content">
          {notes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No notes available</p>
          ) : (
            <div className="flex flex-col gap-4 p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">
                  Export Scope
                </h3>

                <div className="mt-3 space-y-3">
                  <div
                    onClick={() => setExportMode('all')}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${exportMode === 'all' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900">All Notes</h3>
                      <p className="text-sm text-gray-500 mt-1">Export all {notes.length} note(s)</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setExportMode('tag')}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${exportMode === 'tag' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900">By Tag</h3>
                      <p className="text-sm text-gray-500 mt-1">Export notes containing specific tags</p>
                    </div>
                    {exportMode === 'tag' && (
                      <div className="ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowTagsModal(true)
                          }}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Choose Tags ({selectedTags.length} selected)
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    onClick={() => setExportMode('custom')}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${exportMode === 'custom' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900">Custom</h3>
                      <p className="text-sm text-gray-500 mt-1">Hand-pick exactly which notes to export</p>
                    </div>
                    {exportMode === 'custom' && (
                      <div className="ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowNotesModal(true)
                          }}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Choose Notes ({selectedNotes.length} selected)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100 mt-2">
                <button
                  onClick={() => handleExportNotes('csv')}
                  disabled={exporting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleExportNotes('json')}
                  disabled={exporting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Export JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Literature PDFs */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Export Literature PDFs
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Download PDFs with or without annotations
          </p>
        </div>
        <div className="card-content">
          {literature.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No literature available</p>
          ) : (
            <div className="space-y-3">
              {literature.map((lit: Literature) => (
                <div
                  key={lit.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {lit.filename}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {lit.page_count ? `${lit.page_count} pages` : 'PDF document'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {/* Annotations Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-600">Include annotations</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={pdfAnnotationsEnabled[lit.id] || false}
                          onChange={() => togglePdfAnnotations(lit.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </div>
                    </label>

                    {/* Download Button */}
                    <button
                      onClick={() => handleExportPDF(lit.id, pdfAnnotationsEnabled[lit.id] || false, lit.filename)}
                      disabled={exporting}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Info */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="card-content">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Export Formats
          </h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <span className="font-semibold">CSV:</span> Comma-separated values, compatible with Excel and data analysis tools
            </div>
            <div>
              <span className="font-semibold">JSON:</span> Structured data format, includes metadata and can be imported back
            </div>
            <div>
              <span className="font-semibold">Markdown:</span> Human-readable format for notes, preserves formatting
            </div>
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Choose Notes</h2>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={notesSearchQuery}
                  onChange={(e) => setNotesSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Search notes..."
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {notes
                  .filter((n: any) =>
                    (n.title || '').toLowerCase().includes(notesSearchQuery.toLowerCase()) ||
                    n.content.toLowerCase().includes(notesSearchQuery.toLowerCase())
                  )
                  .map((note: any) => (
                    <div
                      key={note.id}
                      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                      onClick={() => toggleNoteSelection(note.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNotes.includes(note.id)}
                        onChange={() => toggleNoteSelection(note.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {note.title || 'Untitled Note'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {note.content}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Tags Modal */}
      {showTagsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Choose Tags</h2>
              <button
                onClick={() => setShowTagsModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tagsSearchQuery}
                  onChange={(e) => setTagsSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Search tags..."
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {allTags
                  .filter((t: string) => t.toLowerCase().includes(tagsSearchQuery.toLowerCase()))
                  .map((tag: string) => {
                    const tagNotesCount = notes.filter((n: any) => n.tags?.includes(tag)).length;
                    return (
                      <div
                        key={tag}
                        className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => toggleTagSelection(tag)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTagSelection(tag)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {tag}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {tagNotesCount} note(s) associated with this tag
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowTagsModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
