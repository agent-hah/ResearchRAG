import { api } from '@/lib/api'
import type { ChartConfig } from './visualizationService'

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
    const response = await api.post('/refinement/refine/', {
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
    const response = await api.post('/refinement/suggestions/', {
      chart_type: chartType,
      data_summary: dataSummary
    })
    return response.data.suggestions
  }
}
