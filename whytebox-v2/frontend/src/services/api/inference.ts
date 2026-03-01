/**
 * Inference API Service
 *
 * All inference calls use multipart/form-data with a string model_id.
 * Backend endpoints: POST /inference/predict, POST /inference/activations
 */

import apiClient from './client'
import type { InferenceResponse, ActivationResponse } from '@/types/api'

export interface BulkActivationResult {
  layer_name: string
  layer_type: string
  success: boolean
  activation_maps?: number[][][]
  global_activation?: number[][]
  stats?: {
    mean: number
    std: number
    min: number
    max: number
    sparsity?: number
  }
  error?: string
}

export const inferenceApi = {
  /**
   * Run single-image inference.
   * Sends image as multipart/form-data alongside model_id and top_k.
   */
  runInference: async (
    modelId: string,
    imageFile: File,
    topK = 5
  ): Promise<InferenceResponse> => {
    const formData = new FormData()
    formData.append('model_id', modelId)
    formData.append('image', imageFile)
    formData.append('top_k', String(topK))

    const response = await apiClient.post<InferenceResponse>('/inference/predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Inference can take a while for large models
      timeout: 60_000,
    })
    return response.data
  },

  /**
   * Extract intermediate layer activations for a given image.
   * Returns per-channel activation maps and a global activation map.
   */
  getActivations: async (
    modelId: string,
    imageFile: File,
    layerName: string
  ): Promise<ActivationResponse> => {
    const formData = new FormData()
    formData.append('model_id', modelId)
    formData.append('image', imageFile)
    formData.append('layer_name', layerName)

    const response = await apiClient.post<ActivationResponse>('/inference/activations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    })
    return response.data
  },

  /**
   * Run batch inference on multiple images.
   * Returns an array of InferenceResponse, one per image.
   */
  runBatchInference: async (
    modelId: string,
    imageFiles: File[],
    topK = 5
  ): Promise<InferenceResponse[]> => {
    const formData = new FormData()
    formData.append('model_id', modelId)
    formData.append('top_k', String(topK))
    imageFiles.forEach((f) => formData.append('images', f))

    const response = await apiClient.post<InferenceResponse[]>('/inference/predict-batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    })
    return response.data
  },

  /**
   * Extract activations for multiple layers in parallel.
   * Calls /inference/activations once per layer and collects results.
   * Returns a map of layer_name → BulkActivationResult.
   */
  getBulkActivations: async (
    modelId: string,
    imageFile: File,
    layerNames: string[],
    maxChannels = 16
  ): Promise<Record<string, BulkActivationResult>> => {
    const results: Record<string, BulkActivationResult> = {}

    // Run in parallel (up to 4 at a time to avoid overwhelming the server)
    const BATCH = 4
    for (let i = 0; i < layerNames.length; i += BATCH) {
      const batch = layerNames.slice(i, i + BATCH)
      await Promise.all(
        batch.map(async (layerName) => {
          try {
            const formData = new FormData()
            formData.append('model_id', modelId)
            formData.append('image', imageFile)
            formData.append('layer_name', layerName)
            formData.append('max_channels', String(maxChannels))

            const response = await apiClient.post<ActivationResponse>(
              '/inference/activations',
              formData,
              { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 }
            )
            results[layerName] = {
              layer_name: layerName,
              layer_type: response.data.layer_type,
              success: true,
              activation_maps: response.data.activation_maps,
              global_activation: response.data.global_activation,
              stats: response.data.stats,
            }
          } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } }; message?: string })
              ?.response?.data?.detail ?? (err as { message?: string })?.message ?? 'Unknown error'
            results[layerName] = {
              layer_name: layerName,
              layer_type: 'unknown',
              success: false,
              error: msg,
            }
          }
        })
      )
    }

    return results
  },
}

// Made with Bob
