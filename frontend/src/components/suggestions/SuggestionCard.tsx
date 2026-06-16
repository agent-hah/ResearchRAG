import { ExternalLink, ThumbsUp, ThumbsDown, X, BookOpen } from 'lucide-react'
import type { DocumentSuggestion } from '../../services/suggestionsService'

interface SuggestionCardProps {
  suggestion: DocumentSuggestion
  onMarkRelevant: (id: number) => void
  onMarkIrrelevant: (id: number) => void
  onDismiss: (id: number) => void
}

export function SuggestionCard({
  suggestion,
  onMarkRelevant,
  onMarkIrrelevant,
  onDismiss,
}: SuggestionCardProps) {
  const relevanceColor = suggestion.relevance_score
    ? suggestion.relevance_score >= 0.7
      ? 'text-green-600'
      : suggestion.relevance_score >= 0.5
      ? 'text-amber-600'
      : 'text-gray-600'
    : 'text-gray-600'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
            {suggestion.title}
          </h3>
          {suggestion.authors && (
            <p className="text-sm text-gray-600 mb-1">{suggestion.authors}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {suggestion.publication_year && (
              <span>{suggestion.publication_year}</span>
            )}
            {suggestion.publication_venue && (
              <span className="truncate">{suggestion.publication_venue}</span>
            )}
            {suggestion.citation_count !== null && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {suggestion.citation_count} citations
              </span>
            )}
          </div>
        </div>
        
        {/* Relevance Score */}
        {suggestion.relevance_score !== null && (
          <div className="flex flex-col items-end">
            <span className={`text-sm font-medium ${relevanceColor}`}>
              {Math.round(suggestion.relevance_score * 100)}%
            </span>
            <span className="text-xs text-gray-500">relevance</span>
          </div>
        )}
      </div>

      {/* Abstract/Snippet */}
      {(suggestion.snippet || suggestion.abstract) && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-3">
          {suggestion.snippet || suggestion.abstract}
        </p>
      )}

      {/* Search Query Tag */}
      {suggestion.search_query && (
        <div className="mb-3">
          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
            Found via: {suggestion.search_query}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {/* View Link */}
        {suggestion.url && (
          <a
            href={suggestion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View
          </a>
        )}

        <div className="flex-1"></div>

        {/* Feedback Buttons */}
        {suggestion.is_relevant === null && (
          <>
            <button
              onClick={() => onMarkRelevant(suggestion.id)}
              className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Mark as relevant"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMarkIrrelevant(suggestion.id)}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Mark as not relevant"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </>
        )}

        {suggestion.is_relevant === true && (
          <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 bg-green-50 rounded">
            <ThumbsUp className="w-3 h-3" />
            Relevant
          </span>
        )}

        {suggestion.is_relevant === false && (
          <span className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded">
            <ThumbsDown className="w-3 h-3" />
            Not Relevant
          </span>
        )}

        {/* Dismiss Button */}
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Dismiss this suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* DOI */}
      {suggestion.doi && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            DOI: {suggestion.doi}
          </span>
        </div>
      )}
    </div>
  )
}
