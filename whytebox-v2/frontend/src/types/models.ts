/**
 * Model Types
 * 
 * TypeScript types for model-related data
 */

export interface Model {
  id: string | number
  name: string
  description?: string
  framework: 'pytorch' | 'tensorflow' | 'onnx'
  file_path?: string
  input_shape?: string | number[]
  output_shape?: string | number[]
  status?: 'active' | 'inactive' | 'processing'
  created_at?: string
  updated_at?: string
  user_id?: number
  inference_count?: number
  parameters?: string
  pretrained?: boolean
}

export interface ModelCreate {
  name: string
  description?: string
  framework: 'pytorch' | 'tensorflow' | 'onnx'
  file_path: string
  input_shape: string
  output_shape: string
}

export interface ModelUpdate {
  name?: string
  description?: string
  status?: 'active' | 'inactive' | 'processing'
}

export interface ModelArchitecture {
  layers: Layer[]
  connections: Connection[]
  input_shape: number[]
  output_shape: number[]
}

export interface Layer {
  id: string
  name: string
  type: string
  params: Record<string, any>
  input_shape: number[]
  output_shape: number[]
  trainable_params: number
  non_trainable_params: number
}

export interface Connection {
  from: string
  to: string
  shape: number[]
}

export interface ModelStats {
  total_params: number
  trainable_params: number
  non_trainable_params: number
  model_size_mb: number
  inference_count: number
  avg_inference_time_ms: number
  last_inference_at: string | null
}

// Made with Bob
