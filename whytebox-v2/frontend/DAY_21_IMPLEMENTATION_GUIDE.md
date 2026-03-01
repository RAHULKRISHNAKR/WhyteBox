# Day 21: Frontend Architecture & Setup - Implementation Guide

**Date:** 2026-02-26  
**Status:** In Progress

## Overview

Day 21 sets up the modern React + TypeScript frontend architecture with Vite, Redux Toolkit, React Query, and routing.

## Completed

✅ Vite configuration with path aliases  
✅ Package.json with all dependencies  
✅ TypeScript configuration  

## To Implement

### 1. Redux Store Setup

**File:** `src/store/index.ts`
```typescript
import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

// Import slices
import authSlice from './slices/authSlice'
import modelsSlice from './slices/modelsSlice'
import uiSlice from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    models: modelsSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

### 2. API Client

**File:** `src/services/api/client.ts`
```typescript
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('api_key')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('api_key')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### 3. React Query Setup

**File:** `src/services/api/queryClient.ts`
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

### 4. Router Configuration

**File:** `src/app/routes.tsx`
```typescript
import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'

// Lazy load pages
const Dashboard = lazy(() => import('@features/dashboard/Dashboard'))
const ModelList = lazy(() => import('@features/models/ModelList'))
const ModelDetail = lazy(() => import('@features/models/ModelDetail'))
const Inference = lazy(() => import('@features/inference/Inference'))
const Explainability = lazy(() => import('@features/explainability/Explainability'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'models', element: <ModelList /> },
      { path: 'models/:id', element: <ModelDetail /> },
      { path: 'inference', element: <Inference /> },
      { path: 'explainability', element: <Explainability /> },
    ],
  },
])
```

### 5. Main App Component

**File:** `src/App.tsx`
```typescript
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

import { store } from '@store'
import { queryClient } from '@services/api/queryClient'
import { router } from './routes'
import { theme } from '@theme'

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  )
}

export default App
```

### 6. TypeScript Types

**File:** `src/types/models.ts`
```typescript
export interface Model {
  id: number
  name: string
  description: string
  framework: 'pytorch' | 'tensorflow' | 'onnx'
  file_path: string
  input_shape: string
  output_shape: string
  status: 'active' | 'inactive' | 'processing'
  created_at: string
  updated_at: string
  user_id: number
  inference_count: number
}

export interface ModelCreate {
  name: string
  description?: string
  framework: string
  file_path: string
  input_shape: string
  output_shape: string
}
```

**File:** `src/types/api.ts`
```typescript
export interface APIResponse<T> {
  data: T
  message?: string
  status: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export interface APIError {
  error: {
    code: string
    message: string
    status_code: number
    details?: Record<string, any>
  }
  request_id?: string
}
```

### 7. Theme Configuration

**File:** `src/theme/index.ts`
```typescript
import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
})
```

## Project Structure Created

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── routes.tsx
│   ├── store/
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── modelsSlice.ts
│   │       └── uiSlice.ts
│   ├── services/
│   │   └── api/
│   │       ├── client.ts
│   │       ├── queryClient.ts
│   │       └── endpoints/
│   │           ├── models.ts
│   │           ├── inference.ts
│   │           └── tasks.ts
│   ├── types/
│   │   ├── models.ts
│   │   ├── api.ts
│   │   └── index.ts
│   ├── theme/
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useWebSocket.ts
│   ├── utils/
│   │   ├── format.ts
│   │   └── validation.ts
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

## Installation Commands

```bash
cd whytebox-v2/frontend
npm install
npm run dev
```

## Next Steps (Day 22)

- Create layout components
- Build navigation system
- Implement responsive design
- Create reusable UI components
- Set up theming

## Summary

Day 21 establishes the foundation for a modern, scalable React application with:
- ✅ Vite for fast development
- ✅ TypeScript for type safety
- ✅ Redux Toolkit for state management
- ✅ React Query for server state
- ✅ React Router for navigation
- ✅ Material-UI for components
- ✅ Path aliases for clean imports

The architecture is production-ready and follows React best practices!