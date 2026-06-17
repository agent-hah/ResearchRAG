import { MessageSquare, Edit2, Trash2 } from 'lucide-react'
import type { Annotation } from '../../services/annotationsService'

interface AnnotationsListProps {
  annotations: Annotation[]
  onEdit: (annotation: Annotation) => void
  onDelete: (annotationId: number) => void
}

export function AnnotationsList({ annotations, onEdit, onDelete }: AnnotationsListProps) {
  if (annotations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-500" />
        <p>No annotations on this page</p>
        <p className="text-sm mt-1">Click "Annotate" to add one</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: annotation.color || 'yellow' }}
                  title={`${annotation.annotation_type} annotation`}
                />
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {annotation.annotation_type}
                </span>
              </div>
              
              {annotation.highlighted_text && (
                <p className="text-sm text-yellow-900 mb-2 italic bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                  "{annotation.highlighted_text}"
                </p>
              )}
              
              {annotation.content && (
                <p className="text-sm text-gray-900">{annotation.content}</p>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                Page {annotation.page_number} • {new Date(annotation.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              <button type="button"
                onClick={() => onEdit(annotation)}
                className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors"
                title="Edit annotation"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button type="button"
                onClick={() => onDelete(annotation.id)}
                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                title="Delete annotation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
