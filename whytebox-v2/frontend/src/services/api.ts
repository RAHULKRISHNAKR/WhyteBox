import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Model,
  InferenceRequest,
  InferenceResult,
  ExplainabilityRequest,
  ExplainabilityResult,
  ApiResponse,
  ApiError,
  PaginatedResponse,
} from '@/types/index';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'An error occurred',
          code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
          details: error.response?.data?.details,
        };
        return Promise.reject(apiError);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Model endpoints
  async getModels(page = 1, pageSize = 10): Promise<PaginatedResponse<Model>> {
    const response = await this.client.get('/api/v1/models/', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  async getModel(id: string): Promise<Model> {
    const response = await this.client.get(`/api/v1/models/${id}`);
    return response.data;
  }

  async loadModel(modelId: string, device: 'cpu' | 'cuda' = 'cpu'): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.post('/api/v1/models/load', {
      model_id: modelId,
      device,
    });
    return response.data;
  }

  async uploadModel(file: File, metadata?: Record<string, any>): Promise<ApiResponse<Model>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await this.client.post('/api/v1/models/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteModel(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.delete(`/api/v1/models/${id}`);
    return response.data;
  }

  // Inference endpoints
  async runInference(request: InferenceRequest): Promise<InferenceResult> {
    const response = await this.client.post('/api/v1/inference', request);
    return response.data;
  }

  async batchInference(requests: InferenceRequest[]): Promise<InferenceResult[]> {
    const response = await this.client.post('/api/v1/inference/batch', { requests });
    return response.data;
  }

  // Explainability endpoints
  async getExplanation(request: ExplainabilityRequest): Promise<ExplainabilityResult> {
    const response = await this.client.post('/api/v1/explainability', request);
    return response.data;
  }

  async compareExplanations(
    modelId: string,
    input: number[] | number[][] | number[][][],
    methods: string[]
  ): Promise<Record<string, ExplainabilityResult>> {
    const response = await this.client.post('/api/v1/explainability/compare', {
      model_id: modelId,
      input,
      methods,
    });
    return response.data;
  }

  // Visualization endpoints
  async getModelVisualization(modelId: string): Promise<{ graph: any }> {
    const response = await this.client.get(`/api/v1/visualization/${modelId}`);
    return response.data;
  }

  async getLayerActivations(
    modelId: string,
    input: number[] | number[][] | number[][][],
    layerId?: string
  ): Promise<Record<string, number[]>> {
    const response = await this.client.post(`/api/v1/visualization/${modelId}/activations`, {
      input,
      layer_id: layerId,
    });
    return response.data;
  }

  // Export endpoints
  async exportModel(modelId: string, format: string, options?: Record<string, any>): Promise<Blob> {
    const response = await this.client.post(
      `/api/v1/models/${modelId}/export`,
      { format, options },
      { responseType: 'blob' }
    );
    return response.data;
  }

  // Tutorial endpoints
  async getTutorials(): Promise<any[]> {
    const response = await this.client.get('/api/v1/tutorials');
    return response.data;
  }

  async getTutorial(id: string): Promise<any> {
    const response = await this.client.get(`/api/v1/tutorials/${id}`);
    return response.data;
  }

  // Dataset endpoints
  async getDatasets(): Promise<any[]> {
    const response = await this.client.get('/api/v1/datasets');
    return response.data;
  }

  async getDataset(id: string): Promise<any> {
    const response = await this.client.get(`/api/v1/datasets/${id}`);
    return response.data;
  }

  async uploadDataset(file: File, metadata?: Record<string, any>): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await this.client.post('/api/v1/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;

// Made with Bob
