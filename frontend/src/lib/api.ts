import axios from 'axios'

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // If sending FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    // Add LLM Settings from local storage
    try {
      const stored = localStorage.getItem('llmSettings')
      if (stored) {
        const settings = JSON.parse(stored)
        config.headers['X-LLM-Provider'] = settings.provider
        if (settings.apiKey) config.headers['X-LLM-API-Key'] = settings.apiKey
        if (settings.modelName) config.headers['X-LLM-Model'] = settings.modelName
        if (settings.baseUrl) config.headers['X-LLM-Base-URL'] = settings.baseUrl
        
        config.headers['X-Embed-Provider'] = settings.embeddingProvider
        if (settings.embeddingApiKey) config.headers['X-Embed-API-Key'] = settings.embeddingApiKey
        if (settings.embeddingModelName) config.headers['X-Embed-Model'] = settings.embeddingModelName
        if (settings.embeddingBaseUrl) config.headers['X-Embed-Base-URL'] = settings.embeddingBaseUrl
      }
    } catch (e) {
      console.error('Failed to parse LLM settings in interceptor', e)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access')
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error:', error.response.data)
    }
    
    return Promise.reject(error)
  }
)

// API response types
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success?: boolean
}

export interface ApiError {
  detail: string
  status?: number
}

// Helper function to handle API errors
export const getErrorMessage = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail
  }
  if (error.message) {
    return error.message
  }
  return 'An unexpected error occurred'
}