import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, RefreshCw, Lightbulb, Filter } from 'lucide-react'
import { suggestionsService } from '../../services/suggestionsService'
import { SuggestionCard } from './SuggestionCard'

interface SuggestionsPanelProps {
  datasetId: number
  datasetName: string
}

export function SuggestionsPanel({ datasetId, datasetName }: SuggestionsPanelProps) {
  const [includeDismissed, setIncludeDismissed] = useState(false)
  const [showKeywords, setShowKeywords] = useState(false)
  const queryClient = useQueryClient()

  // Fetch suggestions
  const { data: suggestions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suggestions', datasetId, includeDismissed],
    queryFn: () => suggestionsService.getDatasetSuggestions(datasetId, includeDismissed),
  })

  // Fetch keywords
  const { data: keywordsData } = useQuery({
    queryKey: ['keywords', datasetId],
    queryFn: () => suggestionsService.getDatasetKeywords(datasetId),
    enabled: showKeywords,
  })

  // Generate suggestions mutation
  const generateMutation = useMutation({
    mutationFn: () => suggestionsService.generateSuggestions({ dataset_id: datasetId }),
    onSuccess: () => {
      setTimeout(() => {
        refetch()
      }, 2000) // Refetch after 2 seconds to allow background processing
    },
  })

  // Update feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: number; feedback: any }) =>
      suggestionsService.updateFeedback(id, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions', datasetId] })
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate()
  }

  const handleMarkRelevant = (id: number) => {
    updateFeedbackMutation.mutate({ id, feedback: { is_relevant: true } })
  }

  const handleMarkIrrelevant = (id: number) => {
    updateFeedbackMutation.mutate({ id, feedback: { is_relevant: false } })
  }

  const handleDismiss = (id: number) => {
    updateFeedbackMutation.mutate({ id, feedback: { is_dismissed: true } })
  }

  const handleImport = (id: number) => {
    // TODO: Implement PDF import functionality
    updateFeedbackMutation.mutate({ id, feedback: { is_imported: true } })
    alert('Import functionality coming soon! This will download and process the PDF.')
  }

  const activeSuggestions = suggestions.filter(s => !s.is_dismissed)
  const dismissedCount = suggestions.filter(s => s.is_dismissed).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            Suggested Articles
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            For dataset: {datasetName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            {showKeywords ? 'Hide' : 'Show'} Keywords
          </button>
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            {generateMutation.isPending ? 'Generating...' : 'Generate Suggestions'}
          </button>
        </div>
      </div>

      {/* Keywords Display */}
      {showKeywords && keywordsData && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Research Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {keywordsData.keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      {dismissedCount > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIncludeDismissed(!includeDismissed)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Filter className="w-4 h-4" />
            {includeDismissed ? 'Hide' : 'Show'} Dismissed ({dismissedCount})
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load suggestions</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && suggestions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg mb-2">No suggestions yet</p>
          <p className="text-gray-500 text-sm mb-4">
            Click "Generate Suggestions" to find relevant research articles
          </p>
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Generate Suggestions
          </button>
        </div>
      )}

      {/* Suggestions List */}
      {!isLoading && !error && activeSuggestions.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Showing {activeSuggestions.length} suggestion{activeSuggestions.length !== 1 ? 's' : ''}
          </p>
          {activeSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onMarkRelevant={handleMarkRelevant}
              onMarkIrrelevant={handleMarkIrrelevant}
              onDismiss={handleDismiss}
              onImport={handleImport}
            />
          ))}
        </div>
      )}

      {/* Success Message */}
      {generateMutation.isSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            ✓ Suggestion generation started! Results will appear shortly.
          </p>
        </div>
      )}
    </div>
  )
}
