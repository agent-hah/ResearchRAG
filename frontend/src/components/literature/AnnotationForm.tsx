import { useState, useEffect, useCallback } from 'react'
import { X, Save } from 'lucide-react'
import type { Annotation, AnnotationCreate } from '../../services/annotationsService'
import { RichTextEditor } from '../common/RichTextEditor'

interface AnnotationFormProps {
  literatureId: number
  pageNumber: number
  editingAnnotation?: Annotation | null
  onSave: (annotation: AnnotationCreate) => void
  onCancel: () => void
}

const ANNOTATION_TYPES = [
  { value: 'highlight', label: 'Highlight', color: 'yellow' },
  { value: 'comment', label: 'Comment', color: 'blue' },
  { value: 'note', label: 'Note', color: 'green' },
]

const COLORS = [
  { value: 'yellow', label: 'Yellow' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
]

export function AnnotationForm({
  literatureId,
  pageNumber,
  editingAnnotation,
  onSave,
  onCancel,
}: AnnotationFormProps) {
  interface AnnotationFormState {
    annotationType: 'note' | 'highlight' | 'question'
    content: string
    highlightedText: string
    color: string
    rects: {x: number, y: number, width: number, height: number}[]
  }

  const [state, setState] = useState<AnnotationFormState>({
    annotationType: (editingAnnotation?.annotation_type as 'note' | 'highlight' | 'question') || 'highlight',
    content: editingAnnotation?.content || '',
    highlightedText: editingAnnotation?.highlighted_text || '',
    color: editingAnnotation?.color || 'yellow',
    rects: []
  })

  const { annotationType, content, highlightedText, color, rects } = state

  const setAnnotationType = (val: 'note' | 'highlight' | 'question' | ((p: 'note' | 'highlight' | 'question') => 'note' | 'highlight' | 'question')) => setState(s => ({ ...s, annotationType: typeof val === 'function' ? val(s.annotationType) : val }))
  const setContent = (val: string | ((p: string) => string)) => setState(s => ({ ...s, content: typeof val === 'function' ? val(s.content) : val }))
  const setHighlightedText = useCallback((val: string | ((p: string) => string)) => setState(s => ({ ...s, highlightedText: typeof val === 'function' ? val(s.highlightedText) : val })), [])
  const setColor = (val: string | ((p: string) => string)) => setState(s => ({ ...s, color: typeof val === 'function' ? val(s.color) : val }))
  const setRects = useCallback((val: {x: number, y: number, width: number, height: number}[] | ((p: {x: number, y: number, width: number, height: number}[]) => {x: number, y: number, width: number, height: number}[])) => setState(s => ({ ...s, rects: typeof val === 'function' ? val(s.rects) : val })), [])

  useEffect(() => {
    if (!editingAnnotation) {
      // Try to get selected text from the document
      const selection = window.getSelection()
      if (selection && selection.toString().trim() && selection.rangeCount > 0) {
        setHighlightedText(selection.toString().trim())
        
        const pageElement = document.querySelector('.react-pdf__Page') as HTMLElement
        if (pageElement) {
          const pageRect = pageElement.getBoundingClientRect()
          // Get scale from data-scale attribute set by react-pdf, default to 1
          const scale = parseFloat(pageElement.getAttribute('data-scale') || '1')
          
          const range = selection.getRangeAt(0)
          const clientRects = range.getClientRects()
          const newRects = []
          
          for (let i = 0; i < clientRects.length; i++) {
            const rect = clientRects[i]
            newRects.push({
              x: (rect.left - pageRect.left) / scale,
              y: (rect.top - pageRect.top) / scale,
              width: rect.width / scale,
              height: rect.height / scale
            })
          }
          setRects(newRects)
        }
      }
    }
  }, [editingAnnotation, setHighlightedText, setRects])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const annotation: AnnotationCreate = {
      literature_id: literatureId,
      annotation_type: annotationType,
      content: content.trim() || undefined,
      highlighted_text: highlightedText.trim() || undefined,
      page_number: pageNumber,
      color,
      ...(rects.length > 0 ? { rects } : {})
    }

    onSave(annotation)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingAnnotation ? 'Edit Annotation' : 'Add Annotation'}
          </h3>
          <button type="button"
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="annotation-type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="annotation-type"
              value={annotationType}
              onChange={(e) => setAnnotationType(e.target.value as 'note' | 'highlight' | 'question')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ANNOTATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="highlighted-text" className="block text-sm font-medium text-gray-700 mb-1">
              Highlighted Text (optional)
            </label>
            <textarea
              id="highlighted-text"
              value={highlightedText}
              onChange={(e) => setHighlightedText(e.target.value)}
              placeholder="Text from the PDF..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div>
            <label htmlFor="annotation-content" className="block text-sm font-medium text-gray-700 mb-1">
              Comment / Note
            </label>
            <RichTextEditor
              initialContent={content}
              onChange={setContent}
              placeholder="Add your thoughts, comments, or notes..."
              minHeight="100px"
              maxHeight="250px"
            />
          </div>

          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </div>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c.value
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
 type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
 type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
