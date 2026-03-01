// Model types
export interface Model {
  id: string;
  name: string;
  type: 'cnn' | 'rnn' | 'transformer' | 'custom';
  framework: 'pytorch' | 'tensorflow' | 'keras';
  description: string;
  architecture: ModelArchitecture;
  metadata: ModelMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ModelArchitecture {
  layers: Layer[];
  inputShape: number[];
  outputShape: number[];
  totalParams: number;
  trainableParams: number;
}

export interface Layer {
  id: string;
  name: string;
  type: string;
  inputShape: number[];
  outputShape: number[];
  params: number;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface ModelMetadata {
  author?: string;
  version?: string;
  tags?: string[];
  accuracy?: number;
  dataset?: string;
  trainingTime?: number;
}

// Visualization types
export interface VisualizationConfig {
  showLabels: boolean;
  showConnections: boolean;
  colorScheme: 'default' | 'gradient' | 'heatmap';
  animationSpeed: number;
  cameraMode: 'orbit' | 'free' | 'follow';
  layerSpacing: number;
  nodeSize: number;
}

export interface VisualizationState {
  selectedLayer: string | null;
  hoveredLayer: string | null;
  highlightedConnections: string[];
  isAnimating: boolean;
  currentStep: number;
  totalSteps: number;
}

// Inference types
export interface InferenceRequest {
  modelId: string;
  input: number[] | number[][] | number[][][];
  options?: {
    batchSize?: number;
    device?: 'cpu' | 'cuda';
    returnIntermediates?: boolean;
  };
}

export interface InferenceResult {
  output: number[] | number[][] | number[][][];
  intermediates?: Record<string, number[]>;
  predictions?: Prediction[];
  executionTime: number;
}

export interface Prediction {
  class: string;
  confidence: number;
  index: number;
}

// Explainability types
export interface ExplainabilityRequest {
  modelId: string;
  input: number[] | number[][] | number[][][];
  method: 'gradcam' | 'saliency' | 'integrated_gradients';
  targetLayer?: string;
  targetClass?: number;
}

export interface ExplainabilityResult {
  method: string;
  heatmap: number[][];
  attribution: number[];
  visualization: string; // base64 encoded image
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'educator' | 'researcher' | 'admin';
  avatar?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  defaultVisualization: VisualizationConfig;
}

// API types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Tutorial types
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  steps: TutorialStep[];
  tags: string[];
}

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  code?: string;
  visualization?: string;
  interactive?: boolean;
}

// Dataset types
export interface Dataset {
  id: string;
  name: string;
  description: string;
  type: 'image' | 'text' | 'audio' | 'tabular';
  size: number;
  samples: number;
  classes?: string[];
  metadata: Record<string, any>;
}

// Export types
export interface ExportOptions {
  format: 'json' | 'onnx' | 'tensorflowjs' | 'pytorch';
  includeWeights: boolean;
  optimize: boolean;
  quantize?: boolean;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

// Made with Bob
