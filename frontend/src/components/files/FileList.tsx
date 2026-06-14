import { useState } from 'react'
import { FileText, Database, Trash2, RefreshCw, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fileService } from '@/services/fileService'
import { formatBytes, formatDate, cn } from '@/lib/utils'
import type { Dataset, Literature, ProcessingStatus } from '@/types'

interface FileListProps {
  datasets: Dataset[]
  literature: Literature[]
  onPreview?: (id: number, type: 'dataset' | 'literature') => void
}

export function FileList({ datasets, literature, onPreview }: FileListProps) {
  const [activeTab, setActiveTab] = useState<'datasets' | 'literature'>('datasets')
  const queryClient = useQueryClient()

  const deleteDatasetMutation = useMutation({
    mutationFn: fileService.deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('Dataset deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete dataset')
    },
  })

  const deleteLiteratureMutation = useMutation({
    mutationFn: fileService.deleteLiterature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('Literature deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete literature')
    },
  })

  const reprocessDatasetMutation = useMutation({
    mutationFn: fileService.reprocessDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('Dataset reprocessing started')
    },
    onError: () => {
      toast.error('Failed to reprocess dataset')
    },
  })

  const reprocessLiteratureMutation = useMutation({
    mutationFn: fileService.reprocessLiterature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('Literature reprocessing started')
    },
    onError: () => {
      toast.error('Failed to reprocess literature')
    },
  })

  const getStatusBadge = (status: ProcessingStatus) => {
    const badges = {
      pending: { class: 'badge-warning', icon: Clock, text: 'Pending' },
      processing: { class: 'badge-warning', icon: RefreshCw, text: 'Processing' },
      completed: { class: 'badge-success', icon: CheckCircle, text: 'Upload Complete' },
      indexed: { class: 'badge-success', icon: CheckCircle, text: 'Indexed' },
      failed: { class: 'badge-error', icon: AlertCircle, text: 'Failed' },
    }
    
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    
    return (
      <span className={cn('badge', badge.class)}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.text}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('datasets')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'datasets'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Database className="h-4 w-4 inline mr-2" />
            Datasets ({datasets.length})
          </button>
          
          <button
            onClick={() => setActiveTab('literature')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'literature'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Literature ({literature.length})
          </button>
        </nav>
      </div>

      {/* Datasets Tab */}
      {activeTab === 'datasets' && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {datasets.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">No datasets uploaded yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload CSV files to get started</p>
            </div>
          ) : (
            datasets.map((dataset) => (
              <div key={dataset.id} className="card">
                <div className="card-content">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <Database className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {dataset.filename}
                        </h4>
                        
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>{formatBytes(dataset.file_size)}</span>
                          {dataset.row_count && (
                            <span>{dataset.row_count.toLocaleString()} rows</span>
                          )}
                          {dataset.column_count && (
                            <span>{dataset.column_count} columns</span>
                          )}
                          <span>{formatDate(dataset.created_at)}</span>
                        </div>
                        
                        {dataset.table_name && (
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            Table: {dataset.table_name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {dataset.table_name && onPreview && (
                        <button
                          onClick={() => onPreview(dataset.id, 'dataset')}
                          className="btn btn-sm btn-ghost"
                          title="Preview data"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => reprocessDatasetMutation.mutate(dataset.id)}
                        disabled={reprocessDatasetMutation.isPending}
                        className="btn btn-sm btn-ghost"
                        title="Reprocess"
                      >
                        <RefreshCw className={cn(
                          'h-4 w-4',
                          reprocessDatasetMutation.isPending && 'animate-spin'
                        )} />
                      </button>
                      
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this dataset?')) {
                            deleteDatasetMutation.mutate(dataset.id)
                          }
                        }}
                        disabled={deleteDatasetMutation.isPending}
                        className="btn btn-sm btn-ghost text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Literature Tab */}
      {activeTab === 'literature' && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {literature.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">No literature uploaded yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload PDF files to get started</p>
            </div>
          ) : (
            literature.map((lit) => (
              <div key={lit.id} className="card">
                <div className="card-content">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {lit.filename}
                        </h4>
                        
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>{formatBytes(lit.file_size)}</span>
                          {lit.page_count && (
                            <span>{lit.page_count} pages</span>
                          )}
                          <span>{formatDate(lit.created_at)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-2">
                          {getStatusBadge(lit.processing_status)}
                          {lit.indexed_at && (
                            <span className="text-xs text-gray-500">
                              Indexed {formatDate(lit.indexed_at)}
                            </span>
                          )}
                        </div>
                        
                        {lit.processing_status === 'processing' && lit.indexing_progress !== undefined && (
                          <div className="mt-3 max-w-md">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Indexing...</span>
                              <span>{Math.round(lit.indexing_progress * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-primary-600 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(0, Math.min(100, lit.indexing_progress * 100))}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => reprocessLiteratureMutation.mutate(lit.id)}
                        disabled={reprocessLiteratureMutation.isPending}
                        className="btn btn-sm btn-ghost"
                        title="Reprocess"
                      >
                        <RefreshCw className={cn(
                          'h-4 w-4',
                          reprocessLiteratureMutation.isPending && 'animate-spin'
                        )} />
                      </button>
                      
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this literature?')) {
                            deleteLiteratureMutation.mutate(lit.id)
                          }
                        }}
                        disabled={deleteLiteratureMutation.isPending}
                        className="btn btn-sm btn-ghost text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}