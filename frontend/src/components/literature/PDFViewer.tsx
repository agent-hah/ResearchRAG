import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, MessageSquare, List } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { annotationsService, type Annotation, type AnnotationCreate } from '../../services/annotationsService'
import { AnnotationsList } from './AnnotationsList'
import { AnnotationForm } from './AnnotationForm'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PDFViewerProps {
  fileUrl: string
  literatureId: number
}

export function PDFViewer({ fileUrl, literatureId }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [showAnnotationForm, setShowAnnotationForm] = useState(false)
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null)

  const queryClient = useQueryClient()

  // Fetch annotations for current page
  const { data: annotations = [] } = useQuery({
    queryKey: ['annotations', literatureId, pageNumber],
    queryFn: () => annotationsService.getLiteratureAnnotations(literatureId, pageNumber),
  })

  // Create annotation mutation
  const createAnnotationMutation = useMutation({
    mutationFn: annotationsService.createAnnotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', literatureId] })
      setShowAnnotationForm(false)
      setEditingAnnotation(null)
    },
  })

  // Update annotation mutation
  const updateAnnotationMutation = useMutation({
    mutationFn: ({ id, update }: { id: number; update: { content?: string; color?: string } }) =>
      annotationsService.updateAnnotation(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', literatureId] })
      setShowAnnotationForm(false)
      setEditingAnnotation(null)
    },
  })

  // Delete annotation mutation
  const deleteAnnotationMutation = useMutation({
    mutationFn: annotationsService.deleteAnnotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', literatureId] })
    },
  })

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset
      return Math.min(Math.max(1, newPage), numPages)
    })
  }

  function previousPage() {
    changePage(-1)
  }

  function nextPage() {
    changePage(1)
  }

  function zoomIn() {
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }

  function zoomOut() {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }

  function handleAnnotate() {
    setShowAnnotationForm(true)
    setEditingAnnotation(null)
  }

  function handleSaveAnnotation(annotation: AnnotationCreate) {
    if (editingAnnotation) {
      updateAnnotationMutation.mutate({
        id: editingAnnotation.id,
        update: {
          content: annotation.content,
          color: annotation.color,
        },
      })
    } else {
      createAnnotationMutation.mutate(annotation)
    }
  }

  function handleEditAnnotation(annotation: Annotation) {
    setEditingAnnotation(annotation)
    setShowAnnotationForm(true)
  }

  function handleDeleteAnnotation(annotationId: number) {
    if (confirm('Are you sure you want to delete this annotation?')) {
      deleteAnnotationMutation.mutate(annotationId)
    }
  }

  function handleCancelAnnotation() {
    setShowAnnotationForm(false)
    setEditingAnnotation(null)
  }

  return (
    <div className="flex h-full">
      {/* Main PDF Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Page {pageNumber} of {numPages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation */}
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="p-2 text-gray-700 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextPage}
              disabled={pageNumber >= numPages}
              className="p-2 text-gray-700 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Zoom */}
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 text-gray-700 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className="p-2 text-gray-700 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            {/* Annotate */}
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <button
              onClick={handleAnnotate}
              className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center gap-2"
              title="Add annotation"
            >
              <MessageSquare className="w-4 h-4" />
              Annotate
            </button>

            {/* Toggle Annotations Panel */}
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-2 rounded-md transition-colors ${showAnnotations
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-200'
                }`}
              title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Document */}
        <div className="flex-1 overflow-auto bg-gray-200 p-4">
          <div className="flex justify-center">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              }
              error={
                <div className="p-12 text-center">
                  <p className="text-red-600">Failed to load PDF</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Please check the file and try again
                  </p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg relative"
              >
                {/* Render Highlights */}
                {showAnnotations && annotations.map((ann) => {
                  if (ann.annotation_type !== 'highlight') return null;
                  
                  if (ann.rects && ann.rects.length > 0) {
                    return (
                      <div key={ann.id}>
                        {ann.rects.map((rect: any, idx: number) => (
                          <div
                            key={idx}
                            className="absolute mix-blend-multiply cursor-pointer"
                            style={{
                              left: `${rect.x * scale}px`,
                              top: `${rect.y * scale}px`,
                              width: `${rect.width * scale}px`,
                              height: `${rect.height * scale}px`,
                              backgroundColor: ann.color || 'yellow',
                              opacity: 0.5,
                            }}
                            title={ann.content || 'Highlight'}
                            onClick={() => handleEditAnnotation(ann)}
                          />
                        ))}
                      </div>
                    )
                  } else if (ann.x_position != null && ann.y_position != null) {
                    return (
                      <div
                        key={ann.id}
                        className="absolute mix-blend-multiply cursor-pointer"
                        style={{
                          left: `${ann.x_position * 100}%`,
                          top: `${ann.y_position * 100}%`,
                          width: `${(ann.width || 0.1) * 100}%`,
                          height: `${(ann.height || 0.02) * 100}%`,
                          backgroundColor: ann.color || 'yellow',
                          opacity: 0.5,
                        }}
                        title={ann.content || 'Highlight'}
                        onClick={() => handleEditAnnotation(ann)}
                      />
                    )
                  }
                  
                  return null;
                })}
              </Page>
            </Document>
          </div>
        </div>
      </div>

      {/* Annotations Sidebar */}
      {showAnnotations && (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Annotations
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Page {pageNumber} • {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <AnnotationsList
              annotations={annotations}
              onEdit={handleEditAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          </div>
        </div>
      )}

      {/* Annotation Form Modal */}
      {showAnnotationForm && (
        <AnnotationForm
          literatureId={literatureId}
          pageNumber={pageNumber}
          editingAnnotation={editingAnnotation}
          onSave={handleSaveAnnotation}
          onCancel={handleCancelAnnotation}
        />
      )}
    </div>
  )
}
