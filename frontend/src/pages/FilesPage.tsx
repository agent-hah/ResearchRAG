import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileUpload } from '../components/files/FileUpload'
import { FileList } from '../components/files/FileList'
import { DataPreviewModal } from '../components/files/DataPreviewModal'
import { fileService } from '../services/fileService'

export function FilesPage() {
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null)
  const [selectedFileType, setSelectedFileType] = useState<'dataset' | 'literature' | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Fetch files list
  const { data: filesData, isLoading, error, refetch } = useQuery({
    queryKey: ['files'],
    queryFn: fileService.listFiles,
    refetchInterval: 5000, // Refetch every 5 seconds to update processing status
  })

  const datasets = filesData?.datasets || []
  const literature = filesData?.literature || []
  const totalFiles = datasets.length + literature.length

  const handleUploadSuccess = () => {
    refetch()
  }

  const handlePreview = (id: number, type: 'dataset' | 'literature') => {
    setSelectedFileId(id)
    setSelectedFileType(type)
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
    setSelectedFileId(null)
    setSelectedFileType(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Files</h1>
        <p className="mt-2 text-lg text-gray-600">
          Upload and manage your datasets and literature
        </p>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Upload */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Upload CSV Datasets</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload CSV files for data analysis
            </p>
          </div>
          <div className="card-content">
            <FileUpload type="csv" onUploadComplete={handleUploadSuccess} />
          </div>
        </div>

        {/* PDF Upload */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Upload PDF Literature</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload PDF files for literature review
            </p>
          </div>
          <div className="card-content">
            <FileUpload type="pdf" onUploadComplete={handleUploadSuccess} />
          </div>
        </div>
      </div>

      {/* Files List Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Your Files</h2>
          <p className="text-sm text-gray-500 mt-1">
            {totalFiles} file{totalFiles !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <div className="card-content">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load files. Please try again.</p>
              <button type="button"
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading files...</p>
            </div>
          ) : (
            <FileList
              datasets={datasets}
              literature={literature}
              onPreview={handlePreview}
            />
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedFileId && selectedFileType === 'dataset' && isPreviewOpen && (
        <DataPreviewModal
          datasetId={selectedFileId}
          onClose={handleClosePreview}
        />
      )}
    </div>
  )
}