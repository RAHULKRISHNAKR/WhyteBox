/**
 * Models Slice
 *
 * Lightweight Redux slice for model-related UI state.
 * Actual data fetching is handled by React Query (modelsApi).
 * This slice only tracks the currently selected model ID and UI filters.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ModelsState {
  selectedModelId: string | null
  filters: {
    framework: string | null
    search: string
  }
  sort: {
    field: string
    order: 'asc' | 'desc'
  }
}

const initialState: ModelsState = {
  selectedModelId: null,
  filters: {
    framework: null,
    search: '',
  },
  sort: {
    field: 'name',
    order: 'asc',
  },
}

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    setSelectedModelId: (state, action: PayloadAction<string | null>) => {
      state.selectedModelId = action.payload
    },
    setFilters: (state, action: PayloadAction<Partial<ModelsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setSort: (state, action: PayloadAction<ModelsState['sort']>) => {
      state.sort = action.payload
    },
    clearFilters: (state) => {
      state.filters = initialState.filters
    },
  },
})

export const { setSelectedModelId, setFilters, setSort, clearFilters } = modelsSlice.actions
export default modelsSlice.reducer

// Made with Bob
