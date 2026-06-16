import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, RefreshCw, Filter } from 'lucide-react'
import { suggestionsService } from '../../services/suggestionsService'
import { SuggestionCard } from './SuggestionCard'

interface SuggestionsPanelProps {
  datasetIds?: number[]
  datasetNames?: string[]
  isGlobal?: boolean
  disabled?: boolean
}

export function SuggestionsPanel({ datasetIds, datasetNames, isGlobal = true, disabled = false }: SuggestionsPanelProps) {
  const idParam = isGlobal ? 'global' : (datasetIds?.length ? datasetIds.join(',') : 'global')
  const [includeDismissed, setIncludeDismissed] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const queryClient = useQueryClient()

  // Fetch suggestions
  const { data: suggestions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suggestions', idParam, includeDismissed],
    queryFn: () => suggestionsService.getDatasetSuggestions(idParam, includeDismissed),
  })
  
  // Fetch generation status
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['suggestionStatus', idParam],
    queryFn: () => suggestionsService.getGenerationStatus(idParam),
    refetchInterval: isGenerating ? 1000 : false,
  })

  useEffect(() => {
    if (statusData) {
      if (statusData.progress > 0 && statusData.progress < 100) {
        setIsGenerating(true);
      } else if (statusData.progress === 100 && isGenerating) {
        setIsGenerating(false);
        refetch(); // Refetch suggestions list once complete
      } else if (statusData.progress === 0 && isGenerating) {
        setIsGenerating(false); // Reset on failure
      }
    }
  }, [statusData, isGenerating, refetch]);

  // Generate suggestions mutation
  const generateMutation = useMutation({
    mutationFn: () => suggestionsService.generateSuggestions({ dataset_id: idParam }),
    onSuccess: () => {
      setIsGenerating(true)
      setTimeout(() => refetchStatus(), 500)
    },
  })

  // Update feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: number; feedback: any }) =>
      suggestionsService.updateFeedback(id, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions', idParam] })
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

  const activeSuggestions = Array.from(new Map(
    suggestions.filter(s => !s.is_dismissed).map(s => [s.title, s])
  ).values())
  const dismissedCount = Array.from(new Map(
    suggestions.filter(s => s.is_dismissed).map(s => [s.title, s])
  ).values()).length

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
            {!isGlobal && datasetNames?.length ? `For datasets: ${datasetNames.join(', ')}` : 'Based on your recent uploads, notes, and queries'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={disabled || isGenerating || generateMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            title={disabled ? "Please upload data before generating suggestions" : ""}
          >
            <RefreshCw className={`w-4 h-4 ${(isGenerating || generateMutation.isPending) ? 'animate-spin' : ''}`} />
            {(isGenerating || generateMutation.isPending) ? 'Generating...' : 'Generate Suggestions'}
          </button>
        </div>
      </div>

      {/* Blocked State */}
      {disabled && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 px-4">
          <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4 opacity-50" />
          <p className="text-gray-700 font-medium text-lg mb-2">Global Context Suggestions Unavailable</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            These suggestions rely on your uploaded data. Please upload at least one literature document or dataset to enable global context document suggestions.
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {!disabled && isGenerating && statusData && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">{statusData.status}</span>
            <span className="text-gray-500 font-medium">{statusData.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${statusData.progress}%` }}
            ></div>
          </div>
        </div>
      )}


      {/* Filter Toggle */}
      {!disabled && dismissedCount > 0 && (
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
      {!disabled && isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!disabled && error && (
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
      {!disabled && !isLoading && !error && suggestions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg mb-2">No suggestions yet</p>
          <p className="text-gray-500 text-sm mb-4">
            Click "Generate Suggestions" to find relevant research articles
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || generateMutation.isPending}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {(isGenerating || generateMutation.isPending) ? 'Generating...' : 'Generate Suggestions'}
          </button>
        </div>
      )}

      {/* Suggestions List */}
      {!disabled && !isLoading && !error && activeSuggestions.length > 0 && (
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
            />
          ))}
        </div>
      )}

      {/* Success Message */}
      {generateMutation.isSuccess && !isGenerating && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            ✓ Suggestion generation complete!
          </p>
        </div>
      )}
    </div>
  )
}
