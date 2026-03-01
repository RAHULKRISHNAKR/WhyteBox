/**
 * useStreamingInference
 *
 * React hook that manages a WebSocket connection to the backend
 * streaming inference endpoint (/api/v1/ws/inference).
 *
 * Usage:
 *   const { state, startInference, cancel, reset } = useStreamingInference()
 *
 * State shape:
 *   status: 'idle' | 'connecting' | 'running' | 'complete' | 'error'
 *   modelName: string
 *   numLayers: number
 *   processedLayers: LayerActivation[]
 *   predictions: Prediction[]
 *   topPrediction: Prediction | null
 *   inferenceTimeMs: number
 *   error: string | null
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LayerActivation {
  layer_index: number
  layer_name: string
  layer_type: string
  activation_mean: number
  activation_max: number
  activation_std: number
  sparsity: number
  activation_map: number[][]
  total_layers: number
}

export interface StreamingPrediction {
  rank: number
  class_index: number
  class_name: string
  confidence: number
  confidence_pct: number
}

export type StreamingStatus = 'idle' | 'connecting' | 'running' | 'complete' | 'error'

export interface StreamingInferenceState {
  status: StreamingStatus
  modelId: string
  modelName: string
  numLayers: number
  processedLayers: LayerActivation[]
  predictions: StreamingPrediction[]
  topPrediction: StreamingPrediction | null
  inferenceTimeMs: number
  error: string | null
}

const INITIAL_STATE: StreamingInferenceState = {
  status: 'idle',
  modelId: '',
  modelName: '',
  numLayers: 0,
  processedLayers: [],
  predictions: [],
  topPrediction: null,
  inferenceTimeMs: 0,
  error: null,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStreamingInference() {
  const [state, setState] = useState<StreamingInferenceState>(INITIAL_STATE)
  const wsRef = useRef<WebSocket | null>(null)
  const cancelledRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  const getWsUrl = (): string => {
    const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:5001'
    // Convert http(s):// → ws(s)://
    const wsBase = apiBase.replace(/^http/, 'ws')
    return `${wsBase}/api/v1/ws/inference`
  }

  /**
   * Convert an image File to base64 string.
   */
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip data URL prefix: "data:image/jpeg;base64,..."
        resolve(result.split(',')[1] ?? result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  /**
   * Start streaming inference for a model + image.
   */
  const startInference = useCallback(async (modelId: string, imageFile: File, topK = 5) => {
    // Close any existing connection
    wsRef.current?.close()
    cancelledRef.current = false

    setState({
      ...INITIAL_STATE,
      status: 'connecting',
      modelId,
    })

    let imageB64: string
    try {
      imageB64 = await fileToBase64(imageFile)
    } catch {
      setState((prev) => ({ ...prev, status: 'error', error: 'Failed to read image file' }))
      return
    }

    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      if (cancelledRef.current) {
        ws.close()
        return
      }
      setState((prev) => ({ ...prev, status: 'running' }))
      ws.send(JSON.stringify({
        type: 'start_inference',
        data: { model_id: modelId, image_b64: imageB64, top_k: topK },
      }))
    }

    ws.onmessage = (event) => {
      if (cancelledRef.current) return

      let msg: { type: string; data: Record<string, unknown> }
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      const { type, data } = msg

      switch (type) {
        case 'inference_start':
          setState((prev) => ({
            ...prev,
            modelName: (data.model_name as string) ?? modelId,
            numLayers: (data.num_layers as number) ?? 0,
          }))
          break

        case 'layer_activation':
          setState((prev) => ({
            ...prev,
            processedLayers: [...prev.processedLayers, data as unknown as LayerActivation],
          }))
          break

        case 'inference_complete':
          setState((prev) => ({
            ...prev,
            status: 'complete',
            predictions: (data.predictions as StreamingPrediction[]) ?? [],
            topPrediction: (data.top_prediction as StreamingPrediction) ?? null,
            inferenceTimeMs: (data.inference_time_ms as number) ?? 0,
          }))
          ws.close()
          break

        case 'inference_error':
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: (data.message as string) ?? 'Unknown error',
          }))
          ws.close()
          break

        default:
          break
      }
    }

    ws.onerror = () => {
      if (cancelledRef.current) return
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'WebSocket connection failed. Is the backend running?',
      }))
    }

    ws.onclose = () => {
      // If still running when closed unexpectedly
      setState((prev) => {
        if (prev.status === 'running') {
          return { ...prev, status: 'error', error: 'Connection closed unexpectedly' }
        }
        return prev
      })
    }
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    wsRef.current?.close()
    setState((prev) => ({ ...prev, status: 'idle' }))
  }, [])

  const reset = useCallback(() => {
    cancelledRef.current = true
    wsRef.current?.close()
    setState(INITIAL_STATE)
  }, [])

  return { state, startInference, cancel, reset }
}

// Made with Bob