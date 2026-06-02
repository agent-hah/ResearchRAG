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
  dataset_id: number
  max_per_keyword?: number
}

export interface UpdateFeedbackRequest {
  is_relevant?: boolean
  is_dismissed?: boolean
  is_imported?: boolean
}

export interface KeywordsResponse {
  dataset_id: number
  keywords: string[]
}

export const suggestionsService = {
  /**
   * Generate suggestions for a dataset
   */
  async generateSuggestions(request: GenerateSuggestionsRequest): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${API_BASE_URL}/api/suggestions/generate`, request)
    return response.data
  },

  /**
   * Get suggestions for a dataset
   */
  async getDatasetSuggestions(
    datasetId: number,
    includeDismissed: boolean = false
  ): Promise<DocumentSuggestion[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/suggestions/dataset/${datasetId}`,
      { params: { include_dismissed: includeDismissed } }
    )
    return response.data
  },

  /**
   * Get keywords for a dataset
   */
  async getDatasetKeywords(datasetId: number): Promise<KeywordsResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/api/suggestions/dataset/${datasetId}/keywords`
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
      `${API_BASE_URL}/api/suggestions/${suggestionId}/feedback`,
      feedback
    )
    return response.data
  },

  /**
   * Delete all suggestions for a dataset
   */
  async deleteDatasetSuggestions(datasetId: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/suggestions/dataset/${datasetId}`)
  },

  /**
   * Get a specific suggestion
   */
  async getSuggestion(suggestionId: number): Promise<DocumentSuggestion> {
    const response = await axios.get(`${API_BASE_URL}/api/suggestions/${suggestionId}`)
    return response.data
  }
}
