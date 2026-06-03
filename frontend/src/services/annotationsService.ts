import { api } from '@/lib/api'

export interface Annotation {
  id: number
  literature_id: number
  note_id: number | null
  annotation_type: string
  content: string | null
  highlighted_text: string | null
  page_number: number
  x_position: number | null
  y_position: number | null
  width: number | null
  height: number | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface AnnotationCreate {
  literature_id: number
  annotation_type: string
  content?: string
  highlighted_text?: string
  page_number: number
  x_position?: number
  y_position?: number
  width?: number
  height?: number
  color?: string
  note_id?: number
}

export interface AnnotationUpdate {
  content?: string
  color?: string
}

export const annotationsService = {
  /**
   * Create a new annotation
   */
  async createAnnotation(annotation: AnnotationCreate): Promise<Annotation> {
    const response = await api.post('/annotations/', annotation)
    return response.data
  },

  /**
   * Get annotations for a literature document
   */
  async getLiteratureAnnotations(
    literatureId: number,
    pageNumber?: number
  ): Promise<Annotation[]> {
    const params: any = { literature_id: literatureId }
    if (pageNumber !== undefined) params.page_number = pageNumber
    
    const response = await api.get('/annotations/', { params })
    return response.data
  },

  /**
   * Get a specific annotation
   */
  async getAnnotation(annotationId: number): Promise<Annotation> {
    const response = await api.get(`/annotations/${annotationId}/`)
    return response.data
  },

  /**
   * Update an annotation
   */
  async updateAnnotation(
    annotationId: number,
    update: AnnotationUpdate
  ): Promise<Annotation> {
    const response = await api.put(
      `/annotations/${annotationId}/`,
      update
    )
    return response.data
  },

  /**
   * Delete an annotation
   */
  async deleteAnnotation(annotationId: number): Promise<void> {
    await api.delete(`/annotations/${annotationId}/`)
  }
}
