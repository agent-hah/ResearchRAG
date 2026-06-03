import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QueryInput } from '../components/query/QueryInput'
import { QueryResults } from '../components/query/QueryResults'
import { QueryHistory } from '../components/query/QueryHistory'
import { VisualizationPanel } from '../components/visualization/VisualizationPanel'
import { SpatialVisualizationPanel } from '../components/visualization/SpatialVisualizationPanel'
import { queryService } from '../services/queryService'
import { detectSpatialData } from '../services/spatialVisualizationService'
import type { QueryResult } from '../services/queryService'
import type { QueryHistoryItem } from '@/types'
import { AlertCircle, BarChart3, Map } from 'lucide-react'

export function QueryPage() {
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showVisualization, setShowVisualization] = useState(false)
  const [showSpatialViz, setShowSpatialViz] = useState(false)

  // Fetch query history
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['queryHistory'],
    queryFn: () => queryService.getQueryHistory(0, 20),
  })

  // Extract queries array from response
  const history: QueryHistoryItem[] = historyData?.queries || []

  const queryClient = useQueryClient()
  
  // Execute query mutation
  const executeMutation = useMutation({
    mutationFn: queryService.executeQuery,
    onSuccess: (data) => {
      setCurrentResult(data)
      setError(null)
      setShowVisualization(false) // Reset visualization on new query
      setShowSpatialViz(false) // Reset spatial viz on new query
      queryClient.invalidateQueries({ queryKey: ['queryHistory'] })
    },
    onError: (error: any) => {
      console.error('Query execution failed:', error)
      
      // Handle different error formats
      let errorMessage = 'Failed to execute query. Please try again.'
      
      if (error.response?.data) {
        const data = error.response.data
        
        // FastAPI validation error format
        if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((err: any) => 
            `${err.loc?.join(' → ') || 'Error'}: ${err.msg}`
          ).join('; ')
        } 
        // Simple detail string
        else if (typeof data.detail === 'string') {
          errorMessage = data.detail
        }
        // Generic error object
        else if (data.message) {
          errorMessage = data.message
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    },
  })

  const handleSubmitQuery = (question: string) => {
    if (!question || !question.trim()) {
      setError('Please enter a question')
      return
    }
    
    executeMutation.mutate({ query: question.trim() })
  }

  const handleSelectHistory = (queryId: string) => {
    // Find the query in history
    const query = history.find(q => q.id.toString() === queryId)
    if (query && query.query && query.query.trim()) {
      // Re-execute the query instead of trying to load cached results
      executeMutation.mutate({ query: query.query })
    } else {
      setError('Cannot load this query - query text is missing')
    }
  }

  const handleToggleVisualization = () => {
    setShowVisualization(!showVisualization)
    setShowSpatialViz(false) // Hide spatial viz when showing regular viz
  }

  const handleToggleSpatialViz = () => {
    setShowSpatialViz(!showSpatialViz)
    setShowVisualization(false) // Hide regular viz when showing spatial viz
  }

  const isLoading = executeMutation.isPending
  const hasDataResults = currentResult?.data_results && currentResult.data_results.row_count > 0
  
  // Check if data has spatial information
  const hasSpatialData = hasDataResults
    ? detectSpatialData(
        currentResult.data_results.columns,
        currentResult.data_results.rows
      ).isSpatial
    : false

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Query</h1>
        <p className="mt-2 text-lg text-gray-600">
          Ask questions about your data in natural language
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Query Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Query Input */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Ask a Question</h2>
              <p className="text-sm text-gray-500 mt-1">
                Query your datasets using natural language
              </p>
            </div>
            <div className="card-content">
              <QueryInput onSubmit={handleSubmitQuery} isLoading={isLoading} />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="card border-red-200 bg-red-50">
              <div className="card-content">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Query Failed</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="card">
              <div className="card-content">
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  <p className="mt-4 text-gray-600">Processing your query...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Analyzing data and retrieving relevant literature
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Visualization Toggle Buttons */}
          {hasDataResults && !isLoading && (
            <div className="flex justify-center gap-3">
              <button
                onClick={handleToggleVisualization}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <BarChart3 className="w-5 h-5" />
                {showVisualization ? 'Hide Charts' : 'Show Charts'}
              </button>
              
              {hasSpatialData && (
                <button
                  onClick={handleToggleSpatialViz}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Map className="w-5 h-5" />
                  {showSpatialViz ? 'Hide Map' : 'Show Map'}
                </button>
              )}
            </div>
          )}

          {/* Spatial Visualization Panel */}
          {showSpatialViz && hasDataResults && !isLoading && (
            <SpatialVisualizationPanel
              columns={currentResult.data_results.columns}
              rows={currentResult.data_results.rows}
              question={currentResult.question}
              onClose={() => setShowSpatialViz(false)}
            />
          )}

          {/* Visualization Panel */}
          {showVisualization && hasDataResults && !isLoading && (
            <VisualizationPanel
              columns={currentResult.data_results.columns}
              rows={currentResult.data_results.rows}
              question={currentResult.question}
              onClose={() => setShowVisualization(false)}
            />
          )}

          {/* Query Results */}
          {currentResult && !isLoading && !showVisualization && !showSpatialViz && (
            <QueryResults result={currentResult} />
          )}

          {/* Empty State */}
          {!currentResult && !isLoading && !error && (
            <div className="card">
              <div className="card-content">
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ready to explore your data
                  </h3>
                  <p className="text-gray-500">
                    Enter a question above to get started, or select a previous query from the history
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Query History Sidebar */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">History</h2>
              <p className="text-sm text-gray-500 mt-1">
                {history.length} previous {history.length === 1 ? 'query' : 'queries'}
              </p>
            </div>
            <div className="card-content">
              <QueryHistory
                history={history}
                onSelectQuery={handleSelectHistory}
                isLoading={historyLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}