import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Table2, BarChart3 } from 'lucide-react'
import { fileService } from '@/services/fileService'
import { VisualizationPanel } from '../visualization/VisualizationPanel'

interface DataPreviewModalProps {
  datasetId: number
  onClose: () => void
}

export function DataPreviewModal({ datasetId, onClose }: DataPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table')

  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: ['dataset-preview', datasetId],
    queryFn: () => fileService.getDatasetPreview(datasetId, 100),
    enabled: activeTab === 'table',
  })

  const { data: vizData, isLoading: vizLoading, error: vizError } = useQuery({
    queryKey: ['dataset-viz', datasetId],
    queryFn: () => fileService.getDatasetVizData(datasetId, 1000),
    enabled: activeTab === 'chart',
  })

  // Format data for VisualizationPanel
  const chartColumns = vizData?.columns || []
  const chartRows = vizData?.data?.map((row: any) => chartColumns.map((col: string) => row[col])) || []

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dataset Viewer</h3>
              {preview && activeTab === 'table' && (
                <p className="text-sm text-gray-500 mt-1">
                  Showing {preview.rows.length} of {preview.row_count} rows
                </p>
              )}
            </div>
            
            <button type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 px-6 pt-4">
            <div className="flex space-x-8">
              <button type="button"
                onClick={() => setActiveTab('table')}
                className={`pb-4 flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'table'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Table2 className="w-4 h-4" />
                <span>Data Table</span>
              </button>
              <button type="button"
                onClick={() => setActiveTab('chart')}
                className={`pb-4 flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'chart'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Chart</span>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'table' && (
              <>
                {previewLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="loading-spinner h-8 w-8" />
                    <span className="ml-3 text-gray-600">Loading preview...</span>
                  </div>
                )}
                {previewError && (
                  <div className="text-center py-12">
                    <p className="text-red-600">Failed to load preview</p>
                  </div>
                )}
                {preview && (
                  <div className="space-y-6">
                    {/* Schema Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Schema</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {preview.schema.map((col: any) => (
                          <div key={col.name} className="bg-gray-50 rounded p-3">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {col.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {col.type}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Data Table */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Data</h4>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {preview.schema.map((col: any) => (
                                <th
                                  key={col.name}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  {col.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {preview.rows.map((row: any, idx: number) => (
                              <tr key={row.id || Object.values(row).join("-").substring(0,20) || idx} className="hover:bg-gray-50">
                                {preview.schema.map((col: any) => (
                                  <td
                                    key={col.name}
                                    className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                                  >
                                    {row[col.name] !== null && row[col.name] !== undefined
                                      ? String(row[col.name])
                                      : <span className="text-gray-400">null</span>
                                    }
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'chart' && (
              <>
                {vizLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="loading-spinner h-8 w-8" />
                    <span className="ml-3 text-gray-600">Loading chart data...</span>
                  </div>
                )}
                {vizError && (
                  <div className="text-center py-12">
                    <p className="text-red-600">Failed to load chart data</p>
                  </div>
                )}
                {vizData && chartColumns.length > 0 && chartRows.length > 0 && (
                  <VisualizationPanel columns={chartColumns} rows={chartRows} />
                )}
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="flex items-center space-x-3 ml-auto">
              <button type="button"
                onClick={onClose}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}