/**
 * LiveInferencePanel
 *
 * Real-time inference visualization using WebSocket streaming.
 * Shows layer-by-layer activation progress as inference runs,
 * then displays final predictions.
 *
 * Features:
 *   - Image upload / drag-and-drop
 *   - Live progress bar with layer name
 *   - Mini activation heatmap per layer (canvas)
 *   - Final top-K predictions with confidence bars
 *   - Activation timeline chart
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  LinearProgress,
  Chip,
  Alert,
  Divider,
  Grid,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import {
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Refresh as ResetIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material'
import { useStreamingInference, type LayerActivation } from '@/hooks/useStreamingInference'

interface LiveInferencePanelProps {
  modelId: string
  modelName?: string
}

// ─── Mini activation heatmap (canvas) ────────────────────────────────────────

function ActivationHeatmap({ data, size = 48 }: { data: number[][]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rows = data.length
    const cols = data[0]?.length ?? 1
    const cellW = size / cols
    const cellH = size / rows

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = data[r][c] ?? 0
        // Jet colormap: blue→cyan→green→yellow→red
        const r_ = Math.min(255, Math.round(v > 0.5 ? (v - 0.5) * 2 * 255 : 0))
        const g_ = Math.min(255, Math.round(v < 0.5 ? v * 2 * 255 : (1 - v) * 2 * 255))
        const b_ = Math.min(255, Math.round(v < 0.5 ? 255 - v * 2 * 255 : 0))
        ctx.fillStyle = `rgb(${r_},${g_},${b_})`
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH)
      }
    }
  }, [data, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: 4, display: 'block' }}
    />
  )
}

// ─── Layer activation row ─────────────────────────────────────────────────────

function LayerRow({ layer, isLatest }: { layer: LayerActivation; isLatest: boolean }) {
  const progress = ((layer.layer_index + 1) / layer.total_layers) * 100

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        backgroundColor: isLatest ? 'action.selected' : 'transparent',
        transition: 'background-color 0.2s',
      }}
    >
      {/* Activation heatmap */}
      <ActivationHeatmap data={layer.activation_map} size={40} />

      {/* Layer info */}
      <Box flex={1} minWidth={0}>
        <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
          <Typography variant="caption" fontWeight="bold" noWrap>
            {layer.layer_name}
          </Typography>
          <Chip label={layer.layer_type} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 3, borderRadius: 2 }}
        />
        <Stack direction="row" spacing={1.5} mt={0.25}>
          <Typography variant="caption" color="text.secondary">
            μ={layer.activation_mean.toFixed(3)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            max={layer.activation_max.toFixed(3)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            sparse={Math.round(layer.sparsity * 100)}%
          </Typography>
        </Stack>
      </Box>

      {/* Layer index badge */}
      <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
        {layer.layer_index + 1}/{layer.total_layers}
      </Typography>
    </Box>
  )
}

// ─── Prediction bar ───────────────────────────────────────────────────────────

function PredictionBar({ rank, className, confidence }: {
  rank: number
  className: string
  confidence: number
}) {
  const pct = Math.round(confidence * 100)
  const isTop = rank === 1

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" mb={0.25}>
        <Typography
          variant="body2"
          fontWeight={isTop ? 'bold' : 'normal'}
          color={isTop ? 'primary.main' : 'text.primary'}
          noWrap
          sx={{ maxWidth: '70%' }}
        >
          {rank}. {className}
        </Typography>
        <Typography variant="body2" fontWeight={isTop ? 'bold' : 'normal'}>
          {pct}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={isTop ? 'primary' : 'inherit'}
        sx={{ height: isTop ? 8 : 5, borderRadius: 2 }}
      />
    </Box>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveInferencePanel({ modelId, modelName }: LiveInferencePanelProps) {
  const { state, startInference, cancel, reset } = useStreamingInference()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const layerListRef = useRef<HTMLDivElement>(null)

  // Auto-scroll layer list to bottom
  useEffect(() => {
    if (layerListRef.current) {
      layerListRef.current.scrollTop = layerListRef.current.scrollHeight
    }
  }, [state.processedLayers.length])

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleRun = () => {
    if (!imageFile || !modelId) return
    startInference(modelId, imageFile)
  }

  const handleReset = () => {
    reset()
    setImageFile(null)
    setImagePreview(null)
  }

  const isRunning = state.status === 'running' || state.status === 'connecting'
  const progress = state.numLayers > 0
    ? Math.round((state.processedLayers.length / state.numLayers) * 100)
    : 0

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Live Inference
        {modelName && (
          <Chip label={modelName} size="small" sx={{ ml: 1 }} color="primary" variant="outlined" />
        )}
      </Typography>

      <Grid container spacing={2}>
        {/* ── Left: image upload + controls ── */}
        <Grid item xs={12} md={4}>
          {/* Drop zone */}
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !imageFile && fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: isDragging ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
              cursor: imageFile ? 'default' : 'pointer',
              backgroundColor: isDragging ? 'action.hover' : 'background.default',
              transition: 'all 0.2s',
              mb: 2,
              minHeight: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Input"
                style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, objectFit: 'contain' }}
              />
            ) : (
              <Stack alignItems="center" spacing={1}>
                <UploadIcon color="disabled" sx={{ fontSize: 40 }} />
                <Typography variant="body2" color="text.secondary">
                  Drop image here or click to upload
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  PNG, JPG, WEBP
                </Typography>
              </Stack>
            )}
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />

          {/* Action buttons */}
          <Stack spacing={1}>
            {!isRunning ? (
              <Button
                variant="contained"
                startIcon={<RunIcon />}
                onClick={handleRun}
                disabled={!imageFile || !modelId}
                fullWidth
              >
                Run Inference
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={cancel}
                fullWidth
              >
                Cancel
              </Button>
            )}
            <Button
              variant="text"
              startIcon={<ResetIcon />}
              onClick={handleReset}
              disabled={isRunning}
              fullWidth
            >
              Reset
            </Button>
          </Stack>

          {/* Status */}
          {state.status === 'connecting' && (
            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
              <CircularProgress size={16} />
              <Typography variant="caption">Connecting…</Typography>
            </Stack>
          )}
          {state.status === 'running' && (
            <Box mt={1}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption">Processing layers…</Typography>
                <Typography variant="caption">{progress}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}
          {state.status === 'error' && (
            <Alert severity="error" sx={{ mt: 1 }} variant="outlined">
              {state.error}
            </Alert>
          )}
          {state.status === 'complete' && (
            <Alert severity="success" sx={{ mt: 1 }} variant="outlined">
              Done in {state.inferenceTimeMs.toFixed(0)}ms
            </Alert>
          )}
        </Grid>

        {/* ── Middle: layer activation stream ── */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>
            Layer Activations
            {state.processedLayers.length > 0 && (
              <Chip
                label={`${state.processedLayers.length}/${state.numLayers}`}
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          <Box
            ref={layerListRef}
            sx={{
              height: 380,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 0.5,
            }}
          >
            {state.processedLayers.length === 0 ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.disabled">
                  Layer activations will appear here during inference
                </Typography>
              </Box>
            ) : (
              state.processedLayers.map((layer, i) => (
                <LayerRow
                  key={layer.layer_name}
                  layer={layer}
                  isLatest={i === state.processedLayers.length - 1}
                />
              ))
            )}
          </Box>
        </Grid>

        {/* ── Right: predictions ── */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>
            Predictions
          </Typography>
          <Box
            sx={{
              height: 380,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1.5,
            }}
          >
            {state.predictions.length === 0 ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.disabled">
                  Predictions will appear after inference completes
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {state.topPrediction && (
                  <>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Top Prediction
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {state.topPrediction.class_name}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {state.topPrediction.confidence_pct}%
                      </Typography>
                    </Box>
                    <Divider />
                  </>
                )}
                {state.predictions.map((pred) => (
                  <PredictionBar
                    key={pred.class_index}
                    rank={pred.rank}
                    className={pred.class_name}
                    confidence={pred.confidence}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}

// Made with Bob