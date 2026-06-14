import { useQuery } from '@tanstack/react-query'
import { 
  Database, 
  Search, 
  Clock,
  TrendingUp,
  FileText,
  Brain
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatDuration } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import type { RAGStatsResponse, QueryHistoryResponse } from '@/types'
import { fileService } from '@/services/fileService'

export function HomePage() {
  const navigate = useNavigate()
  // Fetch dashboard data
  const { data: filesData } = useQuery({
    queryKey: ['files'],
    queryFn: fileService.listFiles,
  })

  const { data: ragStats } = useQuery({
    queryKey: ['rag-stats'],
    queryFn: () => api.get<RAGStatsResponse>('/rag/stats').then(res => res.data),
  })

  const { data: queryHistory } = useQuery({
    queryKey: ['query-history'],
    queryFn: () => api.get<QueryHistoryResponse>('/query/history?page=1&page_size=5').then(res => res.data),
  })

  const stats = [
    {
      name: 'Datasets',
      value: filesData?.total_datasets || 0,
      icon: Database,
      description: 'CSV files uploaded',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Literature',
      value: filesData?.total_literature || 0,
      icon: FileText,
      description: 'PDF papers indexed',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Indexed Chunks',
      value: ragStats?.total_chunks || 0,
      icon: Brain,
      description: 'Text chunks in vector DB',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Queries Run',
      value: queryHistory?.total_count || 0,
      icon: Search,
      description: 'Natural language queries',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-3xl font-bold text-gray-900">Research Workspace</h1>
        <p className="mt-2 text-lg text-gray-600">
          AI-driven data engineering workspace for researchers
        </p>
      </div>

      {/* Stats Grid */}
      <div className="shrink-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard Panels */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="card flex flex-col min-h-0">
          <div className="card-header shrink-0 pb-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <h3 className="card-title">Recent Queries</h3>
            </div>
            <p className="card-description">
              Your latest natural language queries
            </p>
          </div>
          <div className="card-content flex-1 overflow-y-auto min-h-0 pr-2">
            {queryHistory?.queries?.length ? (
              <div className="space-y-4">
                {queryHistory.queries.map((query) => (
                  <div 
                    key={query.id} 
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/query?id=${query.id}`)}
                  >
                    <Search className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {query.query}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>{query.row_count} rows</span>
                        <span>{query.literature_count} literature</span>
                        <span>{formatDuration(query.processing_time_ms)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">No queries yet</p>
                <p className="text-xs text-gray-400">Start by uploading data and asking questions</p>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="card flex flex-col min-h-0">
          <div className="card-header shrink-0 pb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h3 className="card-title">System Status</h3>
            </div>
            <p className="card-description">
              Current system information
            </p>
          </div>
          <div className="card-content flex-1 overflow-y-auto min-h-0 pr-2">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Backend API</span>
                <span className="badge badge-success">Online</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Vector Database</span>
                <span className="badge badge-success">
                  {ragStats?.collection_name || 'Ready'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Embedding Model</span>
                <span className="text-sm text-gray-900">
                  {ragStats?.embedding_model || 'Gemini'}
                </span>
              </div>
              
              {ragStats && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Chunk Settings</span>
                  <span className="text-sm text-gray-900">
                    {ragStats.chunk_size}/{ragStats.chunk_overlap}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}