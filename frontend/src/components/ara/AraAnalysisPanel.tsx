import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, Bot, Clock, CheckCircle, AlertCircle, Loader2, History, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface AraStatus {
  ara_app_exists: boolean
  ara_status: string
  backend_status: string
  integration_ready: boolean
  timestamp: string
}

interface AnalysisResult {
  status: string
  message: string
  output?: string
  error?: string
  timestamp: string
  data?: any
}

interface QueryHistoryItem {
  id: number
  query_text: string
  sql_query: string
  result_count: number
  execution_time_ms: number
  created_at: string
}

interface QueryHistoryResponse {
  queries: QueryHistoryItem[]
  total_count: number
  page: number
  page_size: number
}

const araService = {
  getStatus: async (): Promise<AraStatus> => {
    const response = await fetch('/api/ara/status')
    if (!response.ok) throw new Error('Failed to get Ara status')
    return response.json()
  },

  triggerAnalysis: async (message?: string): Promise<AnalysisResult> => {
    const response = await fetch('/api/ara/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message || 'Analyze current workspace' })
    })
    if (!response.ok) throw new Error('Failed to trigger analysis')
    return response.json()
  },

  deployApp: async (): Promise<AnalysisResult> => {
    const response = await fetch('/api/ara/deploy', {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to deploy Ara app')
    return response.json()
  },

  getHistory: async (): Promise<QueryHistoryResponse> => {
    const response = await fetch('/api/v1/query/history?page=1&page_size=10')
    if (!response.ok) throw new Error('Failed to get query history')
    return response.json()
  }
}

export function AraAnalysisPanel() {
  const queryClient = useQueryClient()
  const [customMessage, setCustomMessage] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<number>>(new Set())
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null)

  // Get Ara status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['ara-status'],
    queryFn: araService.getStatus,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Get query history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['ara-history'],
    queryFn: araService.getHistory,
  })

  // Filter for Ara analyses only
  const araAnalyses = historyData?.queries.filter(q =>
    q.query_text.startsWith('[Ara Analysis]')
  ) || []

  // Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: araService.triggerAnalysis,
    onSuccess: (data) => {
      if (data.status === 'success') {
        toast.success('Analysis completed successfully!')
        setLastAnalysisTime(new Date())
        // Invalidate history cache so it refreshes with the new entry
        queryClient.invalidateQueries({ queryKey: ['ara-history'] })
      } else {
        toast.error(`Analysis failed: ${data.message}`)
      }
    },
    onError: (error) => {
      toast.error(`Failed to run analysis: ${error.message}`)
    }
  })

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: araService.deployApp,
    onSuccess: (data) => {
      if (data.status === 'success') {
        toast.success('Ara app deployed successfully!')
        refetchStatus()
      } else {
        toast.error(`Deployment failed: ${data.message}`)
      }
    },
    onError: (error) => {
      toast.error(`Failed to deploy: ${error.message}`)
    }
  })

  const handleQuickAnalysis = () => {
    analysisMutation.mutate('Analyze my latest research data and provide key insights')
  }

  const handleCustomAnalysis = () => {
    if (!customMessage.trim()) {
      toast.error('Please enter an analysis request')
      return
    }
    analysisMutation.mutate(customMessage)
    setCustomMessage('')
    setShowCustomInput(false)
  }

  const toggleAnalysisExpansion = (analysisId: number) => {
    setExpandedAnalyses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(analysisId)) {
        newSet.delete(analysisId)
      } else {
        newSet.add(analysisId)
      }
      return newSet
    })
  }

  const getStatusIcon = () => {
    if (statusLoading) return <Loader2 className="h-4 w-4 animate-spin" />
    if (!status?.integration_ready) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (status.ara_status === 'connected') return <CheckCircle className="h-4 w-4 text-green-500" />
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  const getStatusText = () => {
    if (statusLoading) return 'Checking status...'
    if (!status?.integration_ready) return 'Ara not ready'
    if (status.ara_status === 'connected') return 'Ara connected'
    return 'Ara available'
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Research Assistant</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            {getStatusIcon()}
            <span className="text-gray-600">{getStatusText()}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Trigger automated analysis of your research data using Ara agents
        </p>
      </div>

      <div className="card-content space-y-4">
        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Quick Analysis</h4>

          <button
            onClick={handleQuickAnalysis}
            disabled={analysisMutation.isPending || !status?.integration_ready}
            className="btn btn-primary w-full flex items-center justify-center space-x-2"
          >
            {analysisMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>
              {analysisMutation.isPending ? 'Analyzing...' : 'Analyze Latest Data'}
            </span>
          </button>

          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            disabled={!status?.integration_ready}
            className="btn btn-secondary w-full"
          >
            Custom Analysis Request
          </button>
        </div>

        {/* Custom Analysis Input */}
        {showCustomInput && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700">
              Analysis Request
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g., Compare patterns across my datasets, Find correlations in the latest data, Summarize key findings..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCustomAnalysis}
                disabled={analysisMutation.isPending || !customMessage.trim()}
                className="btn btn-primary flex items-center space-x-2"
              >
                {analysisMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>Run Analysis</span>
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomMessage('')
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Setup Section */}
        {!status?.integration_ready && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">Setup Required</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Ara integration needs to be deployed before you can run analysis.
                </p>
                <button
                  onClick={() => deployMutation.mutate()}
                  disabled={deployMutation.isPending}
                  className="mt-2 btn btn-sm bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {deployMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Deploying...
                    </>
                  ) : (
                    'Deploy Ara App'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {analysisMutation.data && (() => {
          const outputText = analysisMutation.data?.data?.result?.output_text
          return (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Analysis Results</h4>
              <div className={`p-4 rounded-lg border ${analysisMutation.data.status === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
                }`}>
                <div className="flex items-start space-x-3">
                  {analysisMutation.data.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {outputText ? (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {outputText}
                      </p>
                    ) : (
                      <p className={`text-sm font-medium ${analysisMutation.data.status === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                        {analysisMutation.data.message}
                      </p>
                    )}
                    {analysisMutation.data.error && (
                      <p className="mt-2 text-xs text-red-700">
                        {analysisMutation.data.error}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {lastAnalysisTime ? lastAnalysisTime.toLocaleString() : new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Analysis agents use your existing data and query services</p>
          <p>• Daily automated analysis runs at 9 AM when deployed</p>
          <p>• Results are generated using your current AI pipeline</p>
        </div>

        {/* Past Analyses Section */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4 text-gray-600" />
              <h4 className="text-sm font-medium text-gray-900">Past Analyses</h4>
              {araAnalyses.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                  {araAnalyses.length}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {showHistory ? 'Hide' : 'Show'}
            </span>
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {historyLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading history...</span>
                </div>
              ) : araAnalyses.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  No past analyses yet. Run your first analysis above!
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {araAnalyses.map((analysis) => {
                    // Extract the actual message from query_text
                    const message = analysis.query_text.replace('[Ara Analysis] ', '')
                    // Extract output from sql_query (it's stored there)
                    const outputMatch = analysis.sql_query.match(/-- Output:\n(.+)$/s)
                    const output = outputMatch ? outputMatch[1].trim() : 'No output available'
                    const isExpanded = expandedAnalyses.has(analysis.id)

                    return (
                      <div
                        key={analysis.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <button
                            onClick={() => toggleAnalysisExpansion(analysis.id)}
                            className="flex-1 min-w-0 text-left flex items-start space-x-2 hover:text-primary-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Execution Time: {analysis.execution_time_ms}ms
                              </p>
                            </div>
                          </button>
                          <a
                            href={`/query`}
                            className="ml-2 p-1 text-gray-400 hover:text-primary-600 transition-colors flex-shrink-0"
                            title="View in Query History"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>

                        {/* Output preview - collapsible */}
                        {isExpanded && (
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                            <p className="text-xs text-gray-700 whitespace-pre-wrap">
                              {output}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {araAnalyses.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <a
                    href="/query"
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center justify-center space-x-1"
                  >
                    <span>View all in Query History</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}