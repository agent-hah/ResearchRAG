import axios from 'axios'
import toast from 'react-hot-toast'

// 1. Check if we are in production (Vercel) and have the env variable.
// If so, use the full Render URL. If not, use the local relative path for Vite's proxy.
export const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1` 
  : '/api/v1';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Get or create anonymous user ID
export const getUserId = (): string => {
  let userId: string | null = null;
  if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
    userId = window.localStorage.getItem('user_id');
  }
  
  if (!userId) {
    userId = crypto.randomUUID ? crypto.randomUUID() : 'user_' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem('user_id', userId);
    }
  }
  return userId;
}

let firstConnectionErrorTime: number | null = null;
let connectionToastId: string | undefined = undefined;
let connectionErrorTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

let activeGetRequestsCount = 0;
let pendingRequestTimer: ReturnType<typeof setTimeout> | undefined = undefined;
let isStartingUp = false;

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
    
    // Track slow GET requests for Render cold-starts
    if (config.method?.toLowerCase() === 'get') {
      activeGetRequestsCount++;
      if (activeGetRequestsCount === 1 && !isStartingUp && !firstConnectionErrorTime) {
        pendingRequestTimer = setTimeout(() => {
          isStartingUp = true;
          if (!connectionToastId) {
            connectionToastId = toast.loading('Please wait...', { id: 'network-error-loading', duration: Infinity });
          }
          
          if (!firstConnectionErrorTime) {
            firstConnectionErrorTime = Date.now();
          }
          if (connectionErrorTimeout) {
            clearTimeout(connectionErrorTimeout);
          }
          // Set the 1-minute timeout to show the error if it still hasn't connected
          connectionErrorTimeout = setTimeout(() => {
            if (firstConnectionErrorTime !== null || isStartingUp) {
              if (connectionToastId) {
                toast.dismiss(connectionToastId);
                connectionToastId = undefined;
              }
              toast.error('Something has gone wrong', { id: 'network-error-timeout', duration: Infinity });
            }
          }, 60 * 1000);
        }, 5000); // wait 5 seconds before showing "Please wait..."
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

const handleRequestComplete = (config?: any) => {
  if (config?.method?.toLowerCase() === 'get') {
    activeGetRequestsCount = Math.max(0, activeGetRequestsCount - 1);
    if (activeGetRequestsCount === 0) {
      if (pendingRequestTimer) {
        clearTimeout(pendingRequestTimer);
        pendingRequestTimer = undefined;
      }
    }
  }
};

// Response interceptor
api.interceptors.response.use(
  (response) => {
    handleRequestComplete(response.config);
    
    // Reset connection error state on successful request
    if (firstConnectionErrorTime !== null || isStartingUp) {
      firstConnectionErrorTime = null;
      isStartingUp = false;
      if (connectionErrorTimeout) {
        clearTimeout(connectionErrorTimeout);
        connectionErrorTimeout = undefined;
      }
      if (connectionToastId) {
        toast.dismiss(connectionToastId);
        connectionToastId = undefined;
      }
      toast.success('Connected successfully!', { id: 'network-success' });
    }
    return response
  },
  (error) => {
    handleRequestComplete(error.config);
    
    // Check if it's a network error (e.g., backend down / connection refused)
    const isNetworkError = 
      (!error.response && error.isAxiosError) || 
      error.code === 'ECONNREFUSED' || 
      error.code === 'ERR_NETWORK' ||
      (error.message && error.message.includes('ECONNREFUSED')) ||
      error.response?.status === 502 || 
      error.response?.status === 504;

    if (isNetworkError) {
      const now = Date.now();
      if (!firstConnectionErrorTime) {
        firstConnectionErrorTime = now;
        if (!connectionToastId) {
          connectionToastId = toast.loading('Please wait...', { id: 'network-error-loading', duration: Infinity });
        }
        
        // Setup timeout to change to error message after 1 minute
        if (connectionErrorTimeout) clearTimeout(connectionErrorTimeout);
        connectionErrorTimeout = setTimeout(() => {
          if (firstConnectionErrorTime !== null || isStartingUp) {
            if (connectionToastId) {
              toast.dismiss(connectionToastId);
              connectionToastId = undefined;
            }
            toast.error('Something has gone wrong', { id: 'network-error-timeout', duration: Infinity });
          }
        }, 60 * 1000);
      } else {
        const timeElapsed = now - firstConnectionErrorTime;
        const oneMinute = 60 * 1000;
        
        if (timeElapsed > oneMinute) {
          if (connectionToastId) {
            toast.dismiss(connectionToastId);
            connectionToastId = undefined;
          }
          toast.error('Something has gone wrong', { id: 'network-error-timeout', duration: Infinity });
        }
      }
    } else {
      // Handle common errors
      if (error.response?.status === 401) {
        // Handle unauthorized access
        console.error('Unauthorized access')
      } else if (error.response?.status >= 500) {
        // Handle server errors
        console.error('Server error:', error.response.data)
      }
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