/**
 * Inference Page
 *
 * Two modes:
 *   1. Standard – REST POST to /api/v1/inference/predict (existing flow)
 *   2. Live     – WebSocket streaming with layer-by-layer activation display
 *
 * A shared model selector sits above the tab panel so the chosen model
 * carries over when the user switches tabs.
 */

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Box,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Divider,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material'
import {
  PlayArrow,
  Refresh,
  Info as InfoIcon,
  FlashOn as LiveIcon,
  Speed as StandardIcon,
} from '@mui/icons-material'
import PageContainer from '@/components/common/PageContainer'
import ImageUpload from '@/components/inference/ImageUpload'
import InferenceConfig, { InferenceConfigData } from '@/components/inference/InferenceConfig'
import LiveInferencePanel from '@/components/inference/LiveInferencePanel'
import { modelsApi } from '@/services/api/models'
import { inferenceApi } from '@/services/api/inference'
import type { InferenceResponse, Prediction } from '@/types/api'

// ─── Confidence bar colours ───────────────────────────────────────────────────
function confidenceColor(conf: number): 'success' | 'warning' | 'error' {
  if (conf >= 0.7) return 'success'
  if (conf >= 0.3) return 'warning'
  return 'error'
}

// ─── Single prediction row ────────────────────────────────────────────────────
function PredictionRow({ pred, rank }: { pred: Prediction; rank: number }) {
  const pct = Math.round(pred.confidence * 100)
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`#${rank}`}
            size="small"
            color={rank === 1 ? 'primary' : 'default'}
            sx={{ minWidth: 36 }}
          />
          <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
            {pred.class_name}
          </Typography>
        </Stack>
        <Typography variant="body2" fontWeight="bold" color={`${confidenceColor(pred.confidence)}.main`}>
          {pct}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={confidenceColor(pred.confidence)}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  )
}

// ─── Results panel ────────────────────────────────────────────────────────────
function ResultsPanel({
  result,
  isLoading,
  error,
  topK,
}: {
  result: InferenceResponse | null
  isLoading: boolean
  error?: string
  topK: number
}) {
  if (isLoading) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Running inference…
        </Typography>
      </Paper>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!result) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Upload an image and click <strong>Run Inference</strong> to see predictions.
        </Typography>
      </Paper>
    )
  }

  const predictions = result.predictions.slice(0, topK)

  return (
    <Paper sx={{ p: 3 }}>
      {/* Top prediction banner */}
      <Box
        sx={{
          mb: 3, p: 2, borderRadius: 2,
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          Top Prediction
        </Typography>
        <Typography variant="h6" fontWeight="bold">
          {result.top_prediction.class_name}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {Math.round(result.top_prediction.confidence * 100)}% confidence
        </Typography>
      </Box>

      {/* All predictions */}
      <Typography variant="subtitle2" gutterBottom>
        Top {predictions.length} Predictions
      </Typography>
      {predictions.map((pred, i) => (
        <PredictionRow key={pred.class_index} pred={pred} rank={i + 1} />
      ))}

      <Divider sx={{ my: 2 }} />

      {/* Metadata */}
      <Stack direction="row" spacing={3} flexWrap="wrap">
        <Box>
          <Typography variant="caption" color="text.secondary">Inference Time</Typography>
          <Typography variant="body2">{result.inference_time_ms.toFixed(1)} ms</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Image Size</Typography>
          <Typography variant="body2">{result.image_size[0]}×{result.image_size[1]}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Model</Typography>
          <Typography variant="body2">{result.model_id}</Typography>
        </Box>
      </Stack>
    </Paper>
  )
}

// ─── Standard inference tab ───────────────────────────────────────────────────
function StandardInferenceTab({ modelId }: { modelId: string }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [result, setResult] = useState<InferenceResponse | null>(null)
  const [config, setConfig] = useState<InferenceConfigData>({
    batchSize: 1,
    topK: 5,
    temperature: 1.0,
    normalize: true,
    resize: true,
    targetSize: 224,
    preprocessingMethod: 'standard',
  })

  const inferenceMutation = useMutation({
    mutationFn: async () => {
      if (!modelId) throw new Error('Please select a model')
      if (!uploadedFile) throw new Error('Please upload an image')
      return inferenceApi.runInference(modelId, uploadedFile, config.topK)
    },
    onSuccess: (data) => setResult(data),
  })

  const handleRunInference = () => {
    if (!modelId) { alert('Please select a model above'); return }
    if (!uploadedFile) { alert('Please upload an image'); return }
    inferenceMutation.mutate()
  }

  const handleReset = () => {
    setUploadedFile(null)
    setResult(null)
    inferenceMutation.reset()
  }

  const canRun = !!modelId && !!uploadedFile && !inferenceMutation.isPending

  return (
    <Grid container spacing={3}>
      {/* ── Left: Input & Config ── */}
      <Grid item xs={12} md={5}>
        {/* Image upload */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Upload Image</Typography>
          <ImageUpload
            onImageSelect={setUploadedFile}
            onImageRemove={() => setUploadedFile(null)}
          />
        </Box>

        {/* Config */}
        <InferenceConfig config={config} onChange={setConfig} />

        {/* Actions */}
        <Stack direction="row" spacing={2} mt={3}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={
              inferenceMutation.isPending
                ? <CircularProgress size={20} color="inherit" />
                : <PlayArrow />
            }
            onClick={handleRunInference}
            disabled={!canRun}
          >
            {inferenceMutation.isPending ? 'Running…' : 'Run Inference'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Refresh />}
            onClick={handleReset}
            disabled={!uploadedFile && !result}
          >
            Reset
          </Button>
        </Stack>
      </Grid>

      {/* ── Right: Results ── */}
      <Grid item xs={12} md={7}>
        <Typography variant="h6" gutterBottom>Results</Typography>
        <ResultsPanel
          result={result}
          isLoading={inferenceMutation.isPending}
          error={inferenceMutation.error?.message}
          topK={config.topK}
        />

        {/* Config summary */}
        {result && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Configuration Used</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {[
                ['Top K', config.topK],
                ['Normalize', config.normalize ? 'Yes' : 'No'],
                ['Target Size', `${config.targetSize}px`],
                ['Preprocessing', config.preprocessingMethod],
              ].map(([label, value]) => (
                <Box key={String(label)}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2">{value}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Grid>
    </Grid>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Inference() {
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<0 | 1>(0)

  // Fetch available models (shared between both tabs)
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.getModels(),
  })

  const selectedModel = models.find((m) => m.id === selectedModelId)

  return (
    <PageContainer
      title="Model Inference"
      subtitle="Run image classification predictions using pretrained models"
    >
      {/* ── Shared model selector ── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Typography variant="h6">Select Model</Typography>
          <Tooltip title="Choose a pretrained model. The same model is used in both Standard and Live modes.">
            <InfoIcon fontSize="small" color="action" />
          </Tooltip>
        </Stack>

        {modelsLoading ? (
          <CircularProgress size={24} />
        ) : models.length === 0 ? (
          <Alert severity="info">No models available. Start the backend and load a model first.</Alert>
        ) : (
          <FormControl sx={{ minWidth: 320 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              label="Model"
            >
              {models.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  <Stack>
                    <Typography variant="body2">{m.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.framework} · {(m.total_params / 1e6).toFixed(1)}M params
                    </Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Paper>

      {/* ── Mode tabs ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as 0 | 1)}
          aria-label="inference mode tabs"
        >
          <Tab
            icon={<StandardIcon fontSize="small" />}
            iconPosition="start"
            label="Standard Inference"
            id="inference-tab-0"
            aria-controls="inference-tabpanel-0"
          />
          <Tab
            icon={<LiveIcon fontSize="small" />}
            iconPosition="start"
            label="Live Inference"
            id="inference-tab-1"
            aria-controls="inference-tabpanel-1"
          />
        </Tabs>
      </Box>

      {/* ── Tab panels ── */}
      <Box
        role="tabpanel"
        hidden={activeTab !== 0}
        id="inference-tabpanel-0"
        aria-labelledby="inference-tab-0"
      >
        {activeTab === 0 && <StandardInferenceTab modelId={selectedModelId} />}
      </Box>

      <Box
        role="tabpanel"
        hidden={activeTab !== 1}
        id="inference-tabpanel-1"
        aria-labelledby="inference-tab-1"
      >
        {activeTab === 1 && (
          selectedModelId ? (
            <LiveInferencePanel
              modelId={selectedModelId}
              modelName={selectedModel?.name}
            />
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              Please select a model above to use Live Inference.
            </Alert>
          )
        )}
      </Box>
    </PageContainer>
  )
}

// Made with Bob
