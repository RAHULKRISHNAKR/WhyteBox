/**
 * Models API Service
 *
 * API calls for model management and architecture retrieval.
 * All model IDs are strings (e.g. "resnet50", "vgg16").
 */

import apiClient from './client'
import type { ModelArchitectureResponse } from '@/types/api'

export interface ModelMeta {
  id: string
  name: string
  framework: string
  description: string
  type: string
  total_params: number
  input_size: number[]
  num_classes: number
  source: 'pretrained' | 'custom'
}

export interface ModelListResponse {
  models: ModelMeta[]
  count: number
}

export interface ModelStats {
  model_id: string
  total_params: number
  trainable_params: number
  non_trainable_params: number
  model_size_mb: number
  input_size: number[]
  num_classes: number
  framework: string
}

export const modelsApi = {
  /**
   * List all available models (pretrained + custom uploaded)
   */
  getModels: async (): Promise<ModelMeta[]> => {
    const response = await apiClient.get<ModelListResponse>('/models')
    return response.data.models
  },

  /**
   * Get metadata for a single model
   */
  getModel: async (id: string): Promise<ModelMeta> => {
    const response = await apiClient.get<ModelMeta>(`/models/${id}`)
    return response.data
  },

  /**
   * Get model statistics (param counts, size, etc.)
   */
  getModelStats: async (id: string): Promise<ModelStats> => {
    const response = await apiClient.get<ModelStats>(`/models/${id}/stats`)
    return response.data
  },

  /**
   * Get full architecture (layers, connections, visualization hints)
   */
  getModelArchitecture: async (id: string): Promise<ModelArchitectureResponse> => {
    const response = await apiClient.get<ModelArchitectureResponse>(`/models/${id}/architecture`)
    return response.data
  },

  /**
   * Get available layer names for Grad-CAM target selection.
   * Backend returns { all_layers, conv_layers, recommended_layers, default_target_layer }
   */
  getModelLayers: async (id: string): Promise<{
    all_layers: string[]
    conv_layers: string[]
    recommended_layers: string[]
    default_target_layer: string | null
  }> => {
    const response = await apiClient.get<{
      model_id: string
      total_layers: number
      all_layers: string[]
      conv_layers: string[]
      recommended_layers: string[]
      default_target_layer: string | null
    }>(`/models/${id}/layers`)
    return {
      all_layers: response.data.all_layers,
      conv_layers: response.data.conv_layers,
      recommended_layers: response.data.recommended_layers,
      default_target_layer: response.data.default_target_layer,
    }
  },

  /**
   * Explicitly load a model into the server cache
   */
  loadModel: async (id: string): Promise<{ model_id: string; status: string; message: string }> => {
    const response = await apiClient.post(`/models/${id}/load`)
    return response.data
  },

  /**
   * Upload a custom model file (.pt, .pth, .h5, .onnx)
   */
  uploadModel: async (
    file: File,
    name: string,
    onProgress?: (progress: number) => void
  ): Promise<ModelMeta> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)

    const response = await apiClient.post<ModelMeta>('/models/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
        }
      },
    })
    return response.data
  },

  /**
   * Delete a custom model
   */
  deleteModel: async (id: string): Promise<void> => {
    await apiClient.delete(`/models/${id}`)
  },

  /**
   * Get model cache info.
   * Backend returns { cached_models, max_cached, num_cached }
   */
  getCacheInfo: async (): Promise<{
    cached_models: string[]
    num_cached: number
    max_cached: number
  }> => {
    const response = await apiClient.get<{
      cached_models: string[]
      num_cached: number
      max_cached: number
    }>('/models/cache/info')
    return response.data
  },
}

// Made with Bob
