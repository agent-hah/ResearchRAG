import axios from 'axios'
import type { ChartConfig } from './visualizationService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface RefinementRequest {
  command: string
  current_config: ChartConfig
}

export interface RefinementResponse {
  updates: Partial<ChartConfig>
  refined_config: ChartConfig
  explanation: string
}

export interface RefinementSuggestion {
  suggestions: string[]
}

export const refinementService = {
  /**
   * Refine visualization with natural language command
   */
  async refineVisualization(
    command: string,
    currentConfig: ChartConfig
  ): Promise<RefinementResponse> {
    const response = await axios.post(`${API_BASE_URL}/api/refinement/refine`, {
      command,
      current_config: currentConfig
    })
    return response.data
  },

  /**
   * Get refinement suggestions
   */
  async getSuggestions(
    chartType: string,
    dataSummary: Record<string, any> = {}
  ): Promise<string[]> {
    const response = await axios.post(`${API_BASE_URL}/api/refinement/suggestions`, {
      chart_type: chartType,
      data_summary: dataSummary
    })
    return response.data.suggestions
  }
}
