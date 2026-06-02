import { Clock, ChevronRight } from 'lucide-react'
import type { QueryHistoryItem } from '@/types'

interface QueryHistoryProps {
  history: QueryHistoryItem[]
  onSelectQuery: (queryId: string) => void
  isLoading: boolean
}

export function QueryHistory({ history, onSelectQuery, isLoading }: QueryHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No query history yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Your previous queries will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {history.map((query) => (
        <button
          key={query.id}
          onClick={() => onSelectQuery(query.id.toString())}
          className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">
                {query.query}
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(query.created_at).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>{query.row_count} rows</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 flex-shrink-0" />
          </div>
        </button>
      ))}
    </div>
  )
}
