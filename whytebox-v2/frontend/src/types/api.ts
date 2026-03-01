/**
 * API Types
 *
 * TypeScript types for API requests and responses
 */

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

// ─── Inference ────────────────────────────────────────────────────────────────

export interface InferenceRequest {
  /** String model ID (e.g. "resnet50") */
  model_id: string
  /** Raw image file sent as multipart/form-data */
  image: File
  top_k?: number
}

export interface Prediction {
  class_index: number
  class_name: string
  confidence: number
}

export interface InferenceResponse {
  model_id: string
  predictions: Prediction[]
  top_prediction: Prediction
  inference_time_ms: number
  image_size: [number, number]
  timestamp: string
}

export interface ActivationRequest {
  model_id: string
  image: File
  layer_name: string
}

export interface ActivationResponse {
  model_id: string
  layer_name: string
  layer_type: string
  activation_maps: number[][][]   // [channels, H, W]
  global_activation: number[][]   // [H, W]
  num_channels: number
  spatial_size: [number, number]
  stats: {
    mean: number
    std: number
    min: number
    max: number
  }
}

// ─── Explainability ───────────────────────────────────────────────────────────

export interface ExplainabilityRequest {
  model_id: string
  image: File
  target_class?: number
  /** Grad-CAM specific */
  layer_name?: string
  /** Saliency specific */
  smooth_grad?: boolean
  n_samples?: number
  noise_level?: number
  /** Integrated Gradients specific */
  num_steps?: number
  baseline_type?: 'zeros' | 'blur' | 'noise'
}

export interface ExplainabilityResponse {
  model_id: string
  /** Method name string e.g. "Grad-CAM", "Saliency Map", "Integrated Gradients" */
  method: string
  heatmap: string          // base64 PNG
  overlay: string          // base64 PNG
  heatmap_data: number[][] // raw 2D array
  /** Backend returns predicted_class (not target_class) */
  predicted_class: number
  predicted_class_name: string
  confidence: number
  /** Only present on individual method calls, not in compare results */
  compute_time_ms?: number
  timestamp?: string
  success?: boolean
}

/**
 * Per-method result inside a compare response.
 * Lighter shape — only overlay + heatmap_data + compute_time_ms.
 */
export interface CompareMethodResult {
  name: string
  overlay: string          // base64 PNG
  heatmap_data: number[][] // raw 2D array
  compute_time_ms: number
}

export interface CompareResponse {
  model_id: string
  predicted_class: number
  predicted_class_name: string
  confidence: number
  /** Keyed by method slug: "gradcam" | "saliency" | "integrated_gradients" */
  methods: Record<string, CompareMethodResult>
  num_methods: number
  success?: boolean
}

// ─── Architecture ─────────────────────────────────────────────────────────────

export interface LayerConfig {
  in_channels?: number
  out_channels?: number
  kernel_size?: number | number[]
  stride?: number | number[]
  padding?: number | number[]
  in_features?: number
  out_features?: number
  num_features?: number
  p?: number
  [key: string]: unknown
}

export interface ArchitectureLayer {
  id: string
  name: string
  type: string
  category: string
  color: string
  parameters: number
  trainable: boolean
  config: LayerConfig
  input_shape: number[] | null
  output_shape: number[] | null
}

export interface ArchitectureStats {
  total_layers: number
  total_params: number
  trainable_params: number
  non_trainable_params: number
  layer_type_counts: Record<string, number>
}

export interface VisualizationHints {
  total_depth: number
  blocks: Array<{
    category: string
    layer_indices: number[]
    count: number
  }>
  suggested_spacing: number
  suggested_scale: number
}

export interface ModelArchitectureResponse {
  model_id: string
  layers: ArchitectureLayer[]
  connections: Array<{ from: string; to: string; weight: number }>
  stats: ArchitectureStats
  visualization_hints: VisualizationHints
}

// ─── Conversion ───────────────────────────────────────────────────────────────

export interface ConversionRequest {
  model_id: string
  target_format: 'onnx' | 'tensorflowjs'
  optimization_level?: 'none' | 'basic' | 'aggressive'
}

export interface ConversionResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  model_id: string
  target_format: string
  created_at: string
}

export interface TaskStatus {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message?: string
  result?: unknown
  error?: string
  created_at: string
  updated_at: string
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  version: string
  timestamp: string
  services: {
    database: boolean
    redis: boolean
    celery: boolean
  }
}

// Made with Bob
