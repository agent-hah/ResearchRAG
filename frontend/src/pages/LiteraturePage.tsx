import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, ArrowLeft } from 'lucide-react'
import { fileService } from '../services/fileService'
import { PDFViewer } from '../components/literature/PDFViewer'
import type { Literature } from '@/types'

export function LiteraturePage() {
  const [selectedLiterature, setSelectedLiterature] = useState<Literature | null>(null)

  // Fetch literature files
  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ['literature'],
    queryFn: fileService.listLiterature,
  })

  const handleSelectLiterature = (file: Literature) => {
    setSelectedLiterature(file)
  }

  const handleBack = () => {
    setSelectedLiterature(null)
  }

  // If a literature is selected, show the PDF viewer
  if (selectedLiterature) {
    const fileUrl = `http://localhost:8000/api/v1/files/${selectedLiterature.id}/download`
    
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-white border-b border-gray-200">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Literature List
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {selectedLiterature.filename}
          </h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <PDFViewer
            fileUrl={fileUrl}
            literatureId={selectedLiterature.id}
          />
        </div>
      </div>
    )
  }

  // Otherwise, show the literature list
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Literature</h1>
        <p className="mt-2 text-lg text-gray-600">
          View and annotate your research papers
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Your Literature</h2>
          <p className="text-sm text-gray-500 mt-1">
            {files.length} document{files.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <div className="card-content">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load literature. Please try again.</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No literature uploaded yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Upload PDF files from the Files page to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectLiterature(file)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {file.filename}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded {new Date(file.created_at).toLocaleDateString()}
                      </p>
                      {file.metadata?.page_count && (
                        <p className="text-sm text-gray-500">
                          {file.metadata.page_count} pages
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
