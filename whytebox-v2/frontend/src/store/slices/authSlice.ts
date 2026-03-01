/**
 * Authentication Slice
 * 
 * Manages authentication state including:
 * - User information
 * - API key
 * - Login/logout
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: number
  email: string
  username: string
  is_admin: boolean
}

interface AuthState {
  user: User | null
  apiKey: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  apiKey: localStorage.getItem('api_key'),
  isAuthenticated: !!localStorage.getItem('api_key'),
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
    setApiKey: (state, action: PayloadAction<string>) => {
      state.apiKey = action.payload
      state.isAuthenticated = true
      localStorage.setItem('api_key', action.payload)
    },
    logout: (state) => {
      state.user = null
      state.apiKey = null
      state.isAuthenticated = false
      localStorage.removeItem('api_key')
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { setUser, setApiKey, logout, setLoading } = authSlice.actions
export default authSlice.reducer

// Made with Bob
