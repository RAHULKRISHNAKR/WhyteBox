/**
 * Explainability API Service
 *
 * All calls use multipart/form-data with a string model_id.
 * Backend endpoints:
 *   POST /explainability/gradcam
 *   POST /explainability/saliency
 *   POST /explainability/integrated-gradients
 *   POST /explainability/compare
 *   GET  /explainability/layers?model_id=<id>
 */

import apiClient from './client'
import type { ExplainabilityResponse, CompareResponse } from '@/types/api'

export type ExplainMethod = 'gradcam' | 'saliency' | 'integrated_gradients'

export interface GradCAMOptions {
  layer_name?: string
  target_class?: number
}

export interface SaliencyOptions {
  target_class?: number
  smooth_grad?: boolean
  n_samples?: number
  noise_level?: number
}

export interface IntegratedGradientsOptions {
  target_class?: number
  num_steps?: number
  baseline_type?: 'zeros' | 'blur' | 'noise'
}

export const explainabilityApi = {
  /**
   * Generate Grad-CAM heatmap for an image.
   * Returns base64 heatmap PNG, overlay PNG, and raw heatmap_data array.
   */
  gradcam: async (
    modelId: string,
    imageFile: File,
    options: GradCAMOptions = {}
  ): Promise<ExplainabilityResponse> => {
    const formData = new FormData()
    formData.append('model_id', modelId)
    formData.append('image', imageFile)
    if (options.layer_name) formData.append('layer_name', options.layer_name)
    if (options.target_class !== undefined)
      formData.append('target_class', String(options.target_class))

    const response = await apiClient.post<ExplainabilityResponse>(
      '/explainability/gradcam',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90_000 }
    )
    return response.data
  },

  /**
   * Generate Saliency Map for an image.
   * Supports SmoothGrad averaging.
   */
  saliency: async (
    modelId: string,
    imageFile: File,
    options: SaliencyOptions = {}
  ): Promise<ExplainabilityResponse> => {
    const formData = new FormData()
    formData.append('model_id', modelId)
    formData.append('image', imageFile)
    if (options.target_class !== undefined)
      formData.append('target_class', String(options.target_class))
    if (options.smooth_grad !== undefined)
      formData.append('smooth_grad', String(options.smooth_grad))
    if (options.n_samples !== undefined)
      formData.append('n_samples', String(options.n_samples))
    if (options.noise_level !== undefined)
      formData.append('noise_level', String(options.noise_level))

    const response = await apiClient.post<ExplainabilityResponse>(
      '/explainability/saliency',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90_000 }
    )
    return response.data
  },

  /**
   * Generate Integrated Gradients attribution for an image.
   */
  integratedGradients: async (
    modelId: string,
    imageFile: File,
    options: IntegratedGradientsOptions = {}
  ): Promise<ExplainabilityResponse> => {
    const formData = new FormData()
    formData.append('model_id', modelId)
    formData.append('image', imageFile)
    if (options.target_class !== undefined)
      formData.append('target_class', String(options.target_class))
    if (options.num_steps !== undefined)
      formData.append('num_steps', String(options.num_steps))
    if (options.baseline_type)
      formData.append('baseline_type', options.baseline_type)

    const response = await apiClient.post<ExplainabilityResponse>(
      '/explainability/integrated-gradients',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 }
    )
    return response.data
  },

  /**
   * Run all three methods and return a comparison.
   * Returns a CompareResponse with results keyed by method name.
   */
  compare: async (
    modelId: string,
    imageFile: File,
    targetClass?: number
  ): Promise<CompareResponse> => {
    const formData = new FormData()
    formData.append('model_id', modelId)
    formData.append('image', imageFile)
    if (targetClass !== undefined) formData.append('target_class', String(targetClass))

    const response = await apiClient.post<CompareResponse>(
      '/explainability/compare',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180_000 }
    )
    return response.data
  },

  /**
   * Get available Grad-CAM target layers for a model.
   * Backend returns { all_layers, conv_layers, recommended_layers, default_target_layer }
   */
  getLayers: async (modelId: string): Promise<{
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
    }>('/explainability/layers', { params: { model_id: modelId } })
    return {
      all_layers: response.data.all_layers,
      conv_layers: response.data.conv_layers,
      recommended_layers: response.data.recommended_layers,
      default_target_layer: response.data.default_target_layer,
    }
  },

  /**
   * Convenience: run a single named method.
   */
  runMethod: async (
    method: ExplainMethod,
    modelId: string,
    imageFile: File,
    targetClass?: number
  ): Promise<ExplainabilityResponse> => {
    switch (method) {
      case 'gradcam':
        return explainabilityApi.gradcam(modelId, imageFile, { target_class: targetClass })
      case 'saliency':
        return explainabilityApi.saliency(modelId, imageFile, { target_class: targetClass })
      case 'integrated_gradients':
        return explainabilityApi.integratedGradients(modelId, imageFile, { target_class: targetClass })
    }
  },
}

// Made with Bob
