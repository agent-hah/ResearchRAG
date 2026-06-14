import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface DocumentSuggestion {
  id: number
  dataset_id: number | null
  title: string
  authors: string | null
  publication_year: number | null
  publication_venue: string | null
  abstract: string | null
  snippet: string | null
  url: string | null
  pdf_url: string | null
  doi: string | null
  relevance_score: number | null
  search_query: string | null
  is_relevant: boolean | null
  is_imported: boolean
  is_dismissed: boolean
  citation_count: number | null
  created_at: string
}

export interface GenerateSuggestionsRequest {
  dataset_id?: string | 'global'
  max_per_keyword?: number
}

export interface UpdateFeedbackRequest {
  is_relevant?: boolean
  is_dismissed?: boolean
  is_imported?: boolean
}

export interface KeywordsResponse {
  dataset_id: string | 'global'
  keywords: string[]
}

export interface GenerationStatus {
  status: string
  progress: number
}

export const suggestionsService = {
  /**
   * Get suggestion generation status
   */
  async getGenerationStatus(datasetId?: string | number | 'global'): Promise<GenerationStatus> {
    const idParam = datasetId || 'global'
    const response = await axios.get(`${API_BASE_URL}/api/v1/query/suggestions/dataset/${idParam}/status`)
    return response.data
  },

  /**
   * Generate suggestions for a dataset
   */
  async generateSuggestions(request: GenerateSuggestionsRequest): Promise<{ success: boolean; message: string }> {
    const payload = {
      ...request,
      dataset_id: request.dataset_id || 'global'
    }
    const response = await axios.post(`${API_BASE_URL}/api/v1/query/suggestions/generate`, payload)
    return response.data
  },

  /**
   * Get suggestions for a dataset
   */
  async getDatasetSuggestions(
    datasetId?: string | number,
    includeDismissed: boolean = false
  ): Promise<DocumentSuggestion[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/query/suggestions/`,
      { params: { 
          dataset_id: datasetId || 'global',
          include_dismissed: includeDismissed 
        } 
      }
    )
    return response.data
  },

  /**
   * Get keywords for a dataset
   */
  async getDatasetKeywords(datasetId?: string | number): Promise<KeywordsResponse> {
    const idParam = datasetId || 'global'
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/query/suggestions/dataset/${idParam}/keywords`
    )
    return response.data
  },

  /**
   * Update suggestion feedback
   */
  async updateFeedback(
    suggestionId: number,
    feedback: UpdateFeedbackRequest
  ): Promise<DocumentSuggestion> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/query/suggestions/${suggestionId}/feedback/`,
      feedback
    )
    return response.data
  },

  /**
   * Delete all suggestions for a dataset
   */
  async deleteDatasetSuggestions(datasetId?: string | number): Promise<void> {
    const idParam = datasetId || 'global'
    if (idParam === 'global') {
      await axios.delete(`${API_BASE_URL}/api/v1/query/suggestions/global/`)
    } else {
      await axios.delete(`${API_BASE_URL}/api/v1/query/suggestions/dataset/${idParam}/`)
    }
  },

  /**
   * Get a specific suggestion
   */
  async getSuggestion(suggestionId: number): Promise<DocumentSuggestion> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/query/suggestions/${suggestionId}/`)
    return response.data
  }
}
