/**
 * Redux Store Configuration
 * 
 * Configures the Redux store with slices for:
 * - Authentication
 * - Models
 * - UI state
 */

import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

// Import slices
import authReducer from './slices/authSlice'
import modelsReducer from './slices/modelsSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    models: modelsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['models/setSelectedModel'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['models.selectedModel'],
      },
    }),
  devTools: import.meta.env.DEV,
})

// Infer types from store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Made with Bob
