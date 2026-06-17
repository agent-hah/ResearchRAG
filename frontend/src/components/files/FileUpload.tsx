import { useCallback, useState } from 'react'
import { Upload, FileText, Database, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fileService } from '@/services/fileService'
import { cn, formatBytes } from '@/lib/utils'

interface FileUploadProps {
  type: 'csv' | 'pdf'
  onUploadComplete?: () => void
}

interface UploadingFile {
  file: File
  status: 'uploading' | 'success' | 'error'
  message?: string
  progress?: number
}

export function FileUpload({ type, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (type === 'csv') {
        return fileService.uploadCSV(file)
      } else {
        return fileService.uploadPDF(file)
      }
    },
    onSuccess: (data, file) => {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.file === file
            ? { ...f, status: 'success', message: data.message }
            : f
        )
      )
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['literature'] })
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      queryClient.invalidateQueries({ queryKey: ['rag-stats'] })
      queryClient.invalidateQueries({ queryKey: ['queryHistory'] })
      toast.success(`${file.name} uploaded successfully`)
      onUploadComplete?.()
    },
    onError: (error: any, file) => {
      // Handle different error formats
      let errorMessage = 'Upload failed'
      
      if (error.response?.data) {
        const data = error.response.data
        
        // FastAPI validation error format
        if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((err: any) => 
            `${err.loc?.join(' → ') || 'Error'}: ${err.msg}`
          ).join('; ')
        } 
        // Simple detail string
        else if (typeof data.detail === 'string') {
          errorMessage = data.detail
        }
        // Generic error object
        else if (data.message) {
          errorMessage = data.message
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setUploadingFiles(prev =>
        prev.map(f =>
          f.file === file
            ? { ...f, status: 'error', message: errorMessage }
            : f
        )
      )
      toast.error(`Failed to upload ${file.name}: ${errorMessage}`)
    },
  })

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      const fileArray = Array.from(files)
      const validFiles = fileArray.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (type === 'csv' && extension !== 'csv') {
          toast.error(`${file.name} is not a CSV file`)
          return false
        }
        if (type === 'pdf' && extension !== 'pdf') {
          toast.error(`${file.name} is not a PDF file`)
          return false
        }
        return true
      })

      if (validFiles.length === 0) return

      // Add files to uploading list
      const newUploadingFiles = validFiles.map(file => ({
        file,
        status: 'uploading' as const,
      }))
      setUploadingFiles(prev => [...prev, ...newUploadingFiles])

      // Upload each file
      validFiles.forEach(file => {
        uploadMutation.mutate(file)
      })
    },
    [type, uploadMutation]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      e.target.value = '' // Reset input
    },
    [handleFiles]
  )

  const removeUploadingFile = useCallback((file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file))
  }, [])

  const icon = type === 'csv' ? Database : FileText
  const Icon = icon
  const acceptedTypes = type === 'csv' ? '.csv' : '.pdf'
  const fileTypeLabel = type === 'csv' ? 'CSV' : 'PDF'

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-colors',
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        )}
      >
        <input
          type="file"
          id={`file-upload-${type}`}
          aria-label={`Upload ${fileTypeLabel} files`}
          className="sr-only"
          accept={acceptedTypes}
          multiple
          onChange={handleFileInput}
        />
        
        <label
          htmlFor={`file-upload-${type}`}
          className="flex flex-col items-center justify-center px-6 py-10 cursor-pointer"
        >
          <Icon className={cn(
            'h-12 w-12 mb-4',
            isDragging ? 'text-primary-600' : 'text-gray-400'
          )} />
          
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              Drop {fileTypeLabel} files here or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Upload one or multiple {fileTypeLabel} files
            </p>
          </div>
          
          <button
 type="button"
            className="btn btn-primary mt-4"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(`file-upload-${type}`)?.click()
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Select Files
          </button>
        </label>
      </div>

      {/* Uploading Files List */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Uploading Files ({uploadingFiles.length})
          </h4>
          
          <div className="space-y-2">
            {uploadingFiles.map((item) => (
              <div
                key={item.file.name}
                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
              >
                <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(item.file.size)}
                  </p>
                  {item.message && (
                    <p className={cn(
                      'text-xs mt-1',
                      item.status === 'error' ? 'text-red-600' : 'text-gray-600'
                    )}>
                      {item.message}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {item.status === 'uploading' && (
                    <div className="loading-spinner h-5 w-5" />
                  )}
                  
                  {item.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  
                  {item.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  
                  {item.status !== 'uploading' && (
                    <button type="button"
                      onClick={() => removeUploadingFile(item.file)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}