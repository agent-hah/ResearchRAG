import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface QueryInputProps {
  onSubmit: (question: string) => void
  isLoading: boolean
  disabled?: boolean
}

export function QueryInput({ onSubmit, isLoading, disabled = false }: QueryInputProps) {
  const [question, setQuestion] = useState('')
  const isDisabled = disabled || isLoading

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim() && !isDisabled) {
      onSubmit(question.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="query-input" className="block text-sm font-medium text-gray-700 mb-2">
          Ask a question about your data
        </label>
        <div className="relative">
          <textarea
            id="query-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Please upload at least one dataset or literature document to query your data" : "e.g., What is the average temperature across all datasets? How does this compare to the findings in the uploaded papers?"}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isDisabled}
          />
          <button
            type="submit"
            disabled={!question.trim() || isDisabled}
            className="absolute right-2 bottom-2 p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Submit query (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Press Enter to submit, Shift+Enter for new line
        </p>
      </div>

      {/* Example queries */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Example queries:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setQuestion(example)}
              disabled={isDisabled}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}

const EXAMPLE_QUERIES = [
  'What is the average value in my dataset?',
  'Show me the top 10 records',
  'How many rows are in each dataset?',
  'What patterns exist in the data?',
  'Compare my data to the literature findings'
]
