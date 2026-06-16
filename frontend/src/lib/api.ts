import axios from 'axios'

// 1. Check if we are in production (Vercel) and have the env variable.
// If so, use the full Render URL. If not, use the local relative path for Vite's proxy.
export const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1` 
  : '/api/v1';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
})

// Get or create anonymous user ID
export const getUserId = (): string => {
  let userId = localStorage.getItem('user_id')
  if (!userId) {
    userId = crypto.randomUUID ? crypto.randomUUID() : 'user_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('user_id', userId)
  }
  return userId
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // If sending FormData, ensure Content-Type is not set so the browser can add the boundary
    if (config.data instanceof FormData && config.headers) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type')
        config.headers.delete('content-type')
      } else {
        delete config.headers['Content-Type']
        delete config.headers['content-type']
      }
    }
    
    // Add User ID header
    if (config.headers) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('X-User-ID', getUserId())
      } else {
        config.headers['X-User-ID'] = getUserId()
      }
    }
    
    // Add any auth headers here if needed in the future
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