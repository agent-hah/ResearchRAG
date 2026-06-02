import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bot, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface AnalysisResult {
  status: string
  message: string
  output?: string
  error?: string
  timestamp: string
}

const araService = {
  triggerAnalysis: async (message?: string): Promise<AnalysisResult> => {
    const response = await fetch('/api/ara/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message || 'Analyze current workspace' })
    })
    if (!response.ok) throw new Error('Failed to trigger analysis')
    return response.json()
  }
}

interface AraQuickTriggerProps {
  message?: string
  buttonText?: string
  className?: string
}

export function AraQuickTrigger({ 
  message = 'Analyze my latest uploaded files', 
  buttonText = 'AI Analysis',
  className = ''
}: AraQuickTriggerProps) {
  const [showResult, setShowResult] = useState(false)

  const analysisMutation = useMutation({
    mutationFn: araService.triggerAnalysis,
    onSuccess: (data) => {
      setShowResult(true)
      if (data.status === 'success') {
        toast.success('Analysis completed!')
      } else {
        toast.error(`Analysis failed: ${data.message}`)
      }
      // Auto-hide result after 10 seconds
      setTimeout(() => setShowResult(false), 10000)
    },
    onError: (error) => {
      toast.error(`Failed to run analysis: ${error.message}`)
    }
  })

  const handleTrigger = () => {
    analysisMutation.mutate(message)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <button
        onClick={handleTrigger}
        disabled={analysisMutation.isPending}
        className="btn btn-secondary flex items-center space-x-2"
      >
        {analysisMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
        <span>
          {analysisMutation.isPending ? 'Analyzing...' : buttonText}
        </span>
      </button>

      {/* Quick Result Display */}
      {showResult && analysisMutation.data && (
        <div className={`p-3 rounded-lg border text-sm ${
          analysisMutation.data.status === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="font-medium">{analysisMutation.data.message}</p>
          {analysisMutation.data.output && (
            <p className="mt-1 text-xs opacity-75">
              Analysis completed - check the full results on the home page
            </p>
          )}
        </div>
      )}
    </div>
  )
}