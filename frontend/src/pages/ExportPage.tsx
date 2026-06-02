import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Database, Search, StickyNote, FileDown } from 'lucide-react'
import { fileService } from '../services/fileService'
import { queryService } from '../services/queryService'
import { notesService } from '../services/notesService'
import { api } from '@/lib/api'
import type { Dataset, Literature } from '@/types'

export function ExportPage() {
  const [exporting, setExporting] = useState(false)
  const [pdfAnnotationsEnabled, setPdfAnnotationsEnabled] = useState<Record<number, boolean>>({})

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
    queryFn: () => queryService.getQueryHistory(0, 10),
  })

  // Extract queries array from response object
  const queries = queryHistoryData?.queries || []

  // Fetch notes
  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesService.listNotes(0, 100),
  })

  const handleExportDataset = async (datasetId: number, format: 'csv' | 'json') => {
    try {
      setExporting(true)
      const response = await api.post(
        '/export/dataset',
        { dataset_id: datasetId, format },
        { responseType: 'blob' }
      )
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `dataset_${datasetId}.${format}`)
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

  const handleExportQuery = async (queryId: number, format: 'csv' | 'json') => {
    try {
      setExporting(true)
      const response = await api.post(
        '/export/query',
        { query_id: queryId, format },
        { responseType: 'blob' }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `query_${queryId}_results.${format}`)
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

  const handleExportNotes = async (format: 'markdown' | 'json') => {
    try {
      setExporting(true)
      const response = await api.post(
        '/export/notes',
        { format },
        { responseType: 'blob' }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `notes.${format === 'markdown' ? 'md' : 'json'}`)
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

  const handleExportPDF = async (literatureId: number, includeAnnotations: boolean) => {
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
      const filename = includeAnnotations ? `literature_${literatureId}_annotated.pdf` : `literature_${literatureId}.pdf`
      link.setAttribute('download', filename)
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
                      {dataset.metadata?.row_count?.toLocaleString() || 0} rows
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleExportDataset(dataset.id, 'csv')}
                      disabled={exporting}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleExportDataset(dataset.id, 'json')}
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
            <div className="space-y-3">
              {queries.slice(0, 10).map((query: any) => (
                <div
                  key={query.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {query.question}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(query.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleExportQuery(query.id, 'csv')}
                      disabled={exporting}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleExportQuery(query.id, 'json')}
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
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">
                  All Notes ({notes.length})
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Export all your research notes with tags and references
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportNotes('markdown')}
                  disabled={exporting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Markdown
                </button>
                <button
                  onClick={() => handleExportNotes('json')}
                  disabled={exporting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  JSON
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
                      onClick={() => handleExportPDF(lit.id, pdfAnnotationsEnabled[lit.id] || false)}
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
    </div>
  )
}
