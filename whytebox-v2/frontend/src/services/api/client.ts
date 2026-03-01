/**
 * API Client
 * 
 * Axios instance with interceptors for:
 * - Authentication
 * - Error handling
 * - Request/response logging
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { store } from '@/store'
import { addNotification } from '@/store/slices/uiSlice'
import { logout } from '@/store/slices/authSlice'

// Create axios instance
// VITE_API_URL is the full base URL including /api/v1 path (set at build time).
// Falls back to localhost:8000/api/v1 for local development.
// Env var name matches .env.prod.example and docker-compose.prod.yml VITE_API_URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add API key to headers if available
    const state = store.getState()
    const apiKey = state.auth.apiKey

    if (apiKey && config.headers) {
      config.headers['X-API-Key'] = apiKey
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }

    return config
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }

    return response
  },
  (error: AxiosError<{ detail?: string; message?: string }>) => {
    // Handle different error types
    if (error.response) {
      const { status, data } = error.response
      const message = data?.detail || data?.message || 'An error occurred'

      // Handle authentication errors
      if (status === 401) {
        store.dispatch(logout())
        store.dispatch(
          addNotification({
            type: 'error',
            message: 'Session expired. Please log in again.',
            duration: 5000,
          })
        )
      }

      // Handle forbidden errors
      else if (status === 403) {
        store.dispatch(
          addNotification({
            type: 'error',
            message: 'You do not have permission to perform this action.',
            duration: 5000,
          })
        )
      }

      // Handle not found errors
      else if (status === 404) {
        store.dispatch(
          addNotification({
            type: 'error',
            message: 'Resource not found.',
            duration: 5000,
          })
        )
      }

      // Handle validation errors
      else if (status === 422) {
        store.dispatch(
          addNotification({
            type: 'error',
            message: `Validation error: ${message}`,
            duration: 5000,
          })
        )
      }

      // Handle rate limiting
      else if (status === 429) {
        store.dispatch(
          addNotification({
            type: 'warning',
            message: 'Too many requests. Please try again later.',
            duration: 5000,
          })
        )
      }

      // Handle server errors
      else if (status >= 500) {
        store.dispatch(
          addNotification({
            type: 'error',
            message: 'Server error. Please try again later.',
            duration: 5000,
          })
        )
      }

      // Handle other errors
      else {
        store.dispatch(
          addNotification({
            type: 'error',
            message,
            duration: 5000,
          })
        )
      }

      // Log error in development
      if (import.meta.env.DEV) {
        console.error(`[API Error] ${status}`, message, error.response)
      }
    } else if (error.request) {
      // Network error
      store.dispatch(
        addNotification({
          type: 'error',
          message: 'Network error. Please check your connection.',
          duration: 5000,
        })
      )
      console.error('[API Network Error]', error.request)
    } else {
      // Other errors
      store.dispatch(
        addNotification({
          type: 'error',
          message: error.message || 'An unexpected error occurred.',
          duration: 5000,
        })
      )
      console.error('[API Error]', error.message)
    }

    return Promise.reject(error)
  }
)

export default apiClient

// Made with Bob
