import { useState } from 'react'
import { Send, Loader2, Sparkles, History } from 'lucide-react'
import { refinementService } from '../../services/refinementService'
import type { ChartConfig } from '../../services/visualizationService'

interface RefinementPanelProps {
  config: ChartConfig
  onConfigChange: (config: ChartConfig) => void
}

interface RefinementHistoryItem {
  command: string
  explanation: string
  timestamp: Date
}

export function RefinementPanel({ config, onConfigChange }: RefinementPanelProps) {
  const [command, setCommand] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<RefinementHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!command.trim() || isRefining) return

    setIsRefining(true)
    setError(null)

    try {
      const response = await refinementService.refineVisualization(command.trim(), config)
      
      // Update config
      onConfigChange(response.refined_config)
      
      // Add to history
      setHistory(prev => [{
        command: command.trim(),
        explanation: response.explanation,
        timestamp: new Date()
      }, ...prev])
      
      // Clear command
      setCommand('')
      
    } catch (err: any) {
      console.error('Refinement failed:', err)
      setError(err.response?.data?.detail || 'Failed to refine visualization. Please try again.')
    } finally {
      setIsRefining(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setCommand(suggestion)
  }

  const exampleCommands = [
    'Change to bar chart',
    'Hide the legend',
    'Update title to Sales Data',
    'Change x axis to Month',
    'Show grid lines',
    'Filter out outliers'
  ]

  return (
    <div className="space-y-4">
      {/* Refinement Input */}
      <div>
        <label htmlFor="refinement-input" className="block text-sm font-medium text-gray-700 mb-2">
          <Sparkles className="w-4 h-4 inline mr-1" />
          Refine with Natural Language
        </label>
        <form onSubmit={handleSubmit} className="relative">
          <input
            id="refinement-input"
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., change to bar chart, hide legend, update title..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isRefining}
          />
          <button
            type="submit"
            disabled={!command.trim() || isRefining}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Apply refinement"
          >
            {isRefining ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Example Commands */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Example commands:</p>
        <div className="flex flex-wrap gap-2">
          {exampleCommands.map((example, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(example)}
              disabled={isRefining}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Refinement History */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <History className="w-4 h-4" />
            Refinement History ({history.length})
          </button>
          
          {showHistory && (
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        "{item.command}"
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.explanation}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 Try commands like:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>"Change to [chart type]" - Switch chart types</li>
          <li>"Update title to [text]" - Change chart title</li>
          <li>"Hide/show legend" - Toggle legend visibility</li>
          <li>"Change [x/y] axis to [text]" - Update axis labels</li>
          <li>"Filter out outliers" - Remove outlier data points</li>
        </ul>
      </div>
    </div>
  )
}
