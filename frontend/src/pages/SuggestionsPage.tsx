import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Database } from 'lucide-react'
import { fileService } from '../services/fileService'
import { SuggestionsPanel } from '../components/suggestions/SuggestionsPanel'

export function SuggestionsPage() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null | 'global'>('global')

  // Fetch datasets
  const { data: datasets = [], isLoading, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: fileService.listDatasets,
  })

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary-600" />
          Document Suggestions
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Discover relevant research articles based on your datasets
        </p>
      </div>

      {/* Dataset Selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Select Scope</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose global context or a specific dataset to find relevant research articles
          </p>
        </div>
        <div className="card-content">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load datasets</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No datasets uploaded yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Upload CSV datasets from the Files page to get started with dataset-specific suggestions
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => setSelectedDatasetId('global')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedDatasetId === 'global'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedDatasetId === 'global'
                      ? 'bg-primary-100'
                      : 'bg-gray-100'
                  }`}>
                    <Sparkles className={`w-5 h-5 ${
                      selectedDatasetId === 'global'
                        ? 'text-primary-600'
                        : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      Global Context
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Based on uploads & notes
                    </p>
                  </div>
                </div>
              </button>
              {datasets.map((dataset) => (
                <button
                  key={dataset.id}
                  onClick={() => setSelectedDatasetId(dataset.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedDatasetId === dataset.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedDatasetId === dataset.id
                        ? 'bg-primary-100'
                        : 'bg-gray-100'
                    }`}>
                      <Database className={`w-5 h-5 ${
                        selectedDatasetId === dataset.id
                          ? 'text-primary-600'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {dataset.filename}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {dataset.metadata?.row_count?.toLocaleString() || 0} rows
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(dataset.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggestions Panel */}
      {selectedDatasetId === 'global' ? (
        <div className="card">
          <div className="card-content">
            <SuggestionsPanel />
          </div>
        </div>
      ) : selectedDataset ? (
        <div className="card">
          <div className="card-content">
            <SuggestionsPanel
              datasetId={selectedDataset.id}
              datasetName={selectedDataset.filename}
            />
          </div>
        </div>
      ) : null}

      {/* Help Text */}
      {!selectedDatasetId && datasets.length > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="card-content">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How it works
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span>Select a dataset above to analyze</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>AI extracts research keywords from your data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>System searches for relevant academic articles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">4.</span>
                <span>Review suggestions and import interesting papers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">5.</span>
                <span>Provide feedback to improve future suggestions</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
