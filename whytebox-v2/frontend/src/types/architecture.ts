/**
 * Architecture types for 3D neural network visualization
 */

export interface LayerConfig {
  // Conv2d
  in_channels?: number
  out_channels?: number
  kernel_size?: number | number[]
  stride?: number | number[]
  padding?: number | number[]
  groups?: number
  bias?: boolean
  // Linear
  in_features?: number
  out_features?: number
  // Pooling
  output_size?: number | number[]
  // BatchNorm
  num_features?: number
  eps?: number
  momentum?: number
  affine?: boolean
  // Dropout
  p?: number
  [key: string]: unknown
}

export interface Layer {
  id: string
  name: string
  type: string
  category: LayerCategory
  color: string
  parameters: number
  trainable: boolean
  config: LayerConfig
  input_shape: number[] | null
  output_shape: number[] | null
}

export type LayerCategory =
  | 'conv'
  | 'dense'
  | 'activation'
  | 'pooling'
  | 'normalization'
  | 'regularization'
  | 'reshape'
  | 'output'
  | 'unknown'

export interface Connection {
  from: string
  to: string
  weight: number
}

export interface ArchitectureStats {
  total_layers: number
  total_params: number
  trainable_params: number
  non_trainable_params: number
  layer_type_counts: Record<string, number>
}

export interface VisualizationBlock {
  category: LayerCategory
  layer_indices: number[]
  count: number
}

export interface VisualizationHints {
  total_depth: number
  blocks: VisualizationBlock[]
  suggested_spacing: number
  suggested_scale: number
}

export interface ModelArchitecture {
  model_id: string
  layers: Layer[]
  connections: Connection[]
  stats: ArchitectureStats
  visualization_hints: VisualizationHints
}

// Visualization state
export interface LayerVisualizationState {
  selectedLayerId: string | null
  hoveredLayerId: string | null
  expandedLayerIds: Set<string>
  highlightedConnections: string[]
}

// 3D position for a layer
export interface LayerPosition {
  x: number
  y: number
  z: number
  width: number
  height: number
  depth: number
}

// Made with Bob
