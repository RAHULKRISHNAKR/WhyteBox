/**
 * UI Slice
 * 
 * Manages UI-related state including:
 * - Theme mode
 * - Sidebar state
 * - Notifications
 * - Loading states
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type ThemeMode = 'light' | 'dark'
type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface UIState {
  themeMode: ThemeMode
  sidebarOpen: boolean
  notifications: Notification[]
  globalLoading: boolean
  loadingMessage: string | null
}

const initialState: UIState = {
  themeMode: (localStorage.getItem('themeMode') as ThemeMode) || 'light',
  sidebarOpen: true,
  notifications: [],
  globalLoading: false,
  loadingMessage: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload
      localStorage.setItem('themeMode', action.payload)
    },
    toggleTheme: (state) => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light'
      localStorage.setItem('themeMode', state.themeMode)
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
      }
      state.notifications.push(notification)
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
    setGlobalLoading: (state, action: PayloadAction<{ loading: boolean; message?: string }>) => {
      state.globalLoading = action.payload.loading
      state.loadingMessage = action.payload.message || null
    },
  },
})

export const {
  setThemeMode,
  toggleTheme,
  setSidebarOpen,
  toggleSidebar,
  addNotification,
  removeNotification,
  clearNotifications,
  setGlobalLoading,
} = uiSlice.actions

export default uiSlice.reducer

// Made with Bob
