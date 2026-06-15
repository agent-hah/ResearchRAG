import { X, Home, Files, FileText, Search, BarChart3, StickyNote, Sparkles, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpGuideProps {
  isOpen: boolean
  onClose: () => void
}

const features = [
  { title: 'Home', icon: Home, description: 'View a dashboard and overview of your workspace, recent queries, and data summary.' },
  { title: 'Files', icon: Files, description: 'Upload, manage, and view tabular datasets (CSV files) that you want to analyze.' },
  { title: 'Literature', icon: FileText, description: 'Upload and read PDF papers, highlight text, and add annotations directly on the documents.' },
  { title: 'Query', icon: Search, description: 'Use natural language to ask questions about your datasets and literature.' },
  { title: 'Visualization', icon: BarChart3, description: 'Generate charts and graphs based on your data to visualize patterns and trends.' },
  { title: 'Notes', icon: StickyNote, description: 'Create, organize, and manage your research notes, insights, and annotations on a flexible canvas.' },
  { title: 'Suggestions', icon: Sparkles, description: 'Discover relevant research articles and datasets suggested by AI based on your current workspace context.' },
  { title: 'Export', icon: Download, description: 'Export your analysis results, visualizations, and notes to share or save for later.' },
]

export function HelpGuide({ isOpen, onClose }: HelpGuideProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-md shadow-xl sm:ring-1 sm:ring-gray-900/10",
        "transform transition-transform duration-300 ease-in-out"
      )}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">User Guide</h2>
          <button
            type="button"
            className="-m-2.5 rounded-md p-2.5 text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            <span className="sr-only">Close help guide</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Welcome to the Research Workspace. Here is a quick guide on how to use all the features available to you:
          </p>
          
          <div className="flex flex-col gap-y-6">
            {features.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-x-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                    <Icon className="h-6 w-6 text-primary-700" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold leading-7 text-gray-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
