/**
 * Explainability Page
 *
 * Generate and compare Grad-CAM, Saliency, and Integrated Gradients
 * visualizations for a selected model and uploaded image.
 *
 * Features:
 *   - Compare All mode: runs all three methods side-by-side
 *   - Single Method mode: run one method with full advanced parameter controls
 *     • Grad-CAM: target layer selector (fetched from /explainability/layers)
 *     • Saliency: SmoothGrad toggle, n_samples, noise_level
 *     • Integrated Gradients: num_steps, baseline_type
 *   - Download overlay images
 *   - Educational method descriptions
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
  Checkbox,
  FormGroup,
  FormControlLabel,
  Divider,
  Stack,
  Chip,
  Tab,
  Tabs,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import {
  CompareArrows,
  Refresh,
  Info as InfoIcon,
  Download as DownloadIcon,
  ExpandMore,
  Tune as TuneIcon,
} from '@mui/icons-material'
import PageContainer from '@/components/common/PageContainer'
import ImageUpload from '@/components/inference/ImageUpload'
import {
  GradCAMParamsPanel,
  SaliencyParamsPanel,
  IGParamsPanel,
  DEFAULT_GRADCAM_PARAMS,
  DEFAULT_SALIENCY_PARAMS,
  DEFAULT_IG_PARAMS,
  type GradCAMParams,
  type SaliencyParams,
  type IGParams,
} from '@/components/explainability/ExplainabilityParams'
import { modelsApi } from '@/services/api/models'
import { explainabilityApi } from '@/services/api/explainability'
import type { ExplainabilityResponse, CompareMethodResult } from '@/types/api'

// ─── Method metadata ──────────────────────────────────────────────────────────

const METHOD_INFO: Record<string, { label: string; description: string; color: string }> = {
  gradcam: {
    label: 'Grad-CAM',
    description:
      'Gradient-weighted Class Activation Mapping highlights discriminative regions using gradients flowing into the final convolutional layer.',
    color: '#2196F3',
  },
  saliency: {
    label: 'Saliency Maps',
    description:
      'Raw gradient magnitudes show which pixels most influence the prediction when perturbed.',
    color: '#FF9800',
  },
  integrated_gradients: {
    label: 'Integrated Gradients',
    description:
      'Path-integrated gradients from a baseline to the input satisfy sensitivity and implementation invariance axioms.',
    color: '#9C27B0',
  },
}

// ─── Heatmap result card ──────────────────────────────────────────────────────

function HeatmapCard({
  methodKey,
  result,
}: {
  methodKey: string
  result: CompareMethodResult
}) {
  const info = METHOD_INFO[methodKey] ?? { label: result.name, description: '', color: '#666' }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${result.overlay}`
    a.download = `${methodKey}_overlay.png`
    a.click()
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Chip
          label={info.label}
          size="small"
          sx={{ backgroundColor: info.color, color: 'white', fontWeight: 'bold' }}
        />
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {result.compute_time_ms.toFixed(0)} ms
          </Typography>
          <Tooltip title="Download overlay">
            <Button size="small" onClick={handleDownload} sx={{ minWidth: 0, p: 0.5 }}>
              <DownloadIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      <Box
        component="img"
        src={`data:image/png;base64,${result.overlay}`}
        alt={`${info.label} overlay`}
        sx={{ width: '100%', borderRadius: 1, display: 'block' }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {info.description}
      </Typography>
    </Paper>
  )
}

// ─── Side-by-side comparison view ────────────────────────────────────────────

function ComparisonView({
  methods,
  originalUrl,
  predictedClass,
  confidence,
}: {
  methods: Record<string, CompareMethodResult>
  originalUrl: string
  predictedClass: string
  confidence: number
}) {
  const entries = Object.entries(methods)

  return (
    <Box>
      <Paper
        sx={{
          p: 2,
          mb: 2,
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          Top Prediction
        </Typography>
        <Typography variant="h6" fontWeight="bold">
          {predictedClass}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {Math.round(confidence * 100)}% confidence
        </Typography>
      </Paper>

      <Grid container spacing={2}>
        {/* Original image */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Chip label="Original" size="small" sx={{ mb: 1 }} />
            <Box
              component="img"
              src={originalUrl}
              alt="Original"
              sx={{ width: '100%', borderRadius: 1, display: 'block' }}
            />
          </Paper>
        </Grid>

        {entries.map(([methodKey, result]) => (
          <Grid item xs={12} sm={6} md={3} key={methodKey}>
            <HeatmapCard methodKey={methodKey} result={result} />
          </Grid>
        ))}
      </Grid>

      {/* Compute time summary */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Compute Times
        </Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          {entries.map(([key, r]) => (
            <Box key={key}>
              <Typography variant="caption" color="text.secondary">
                {METHOD_INFO[key]?.label ?? key}
              </Typography>
              <Typography variant="body2">{r.compute_time_ms.toFixed(0)} ms</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  )
}

// ─── Single method result view ────────────────────────────────────────────────

function SingleMethodView({
  result,
  originalUrl,
}: {
  result: ExplainabilityResponse
  originalUrl: string
}) {
  const [tab, setTab] = useState(0)
  const methodLabel = METHOD_INFO[result.method]?.label ?? result.method

  const handleDownload = (type: 'overlay' | 'heatmap') => {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${type === 'overlay' ? result.overlay : result.heatmap}`
    a.download = `${result.method}_${type}.png`
    a.click()
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Overlay" />
          <Tab label="Heatmap" />
          <Tab label="Original" />
        </Tabs>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Download overlay">
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleDownload('overlay')}>
              Overlay
            </Button>
          </Tooltip>
          <Tooltip title="Download heatmap">
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleDownload('heatmap')}>
              Heatmap
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {tab === 0 && (
        <Box
          component="img"
          src={`data:image/png;base64,${result.overlay}`}
          alt="Overlay"
          sx={{ width: '100%', borderRadius: 1 }}
        />
      )}
      {tab === 1 && (
        <Box
          component="img"
          src={`data:image/png;base64,${result.heatmap}`}
          alt="Heatmap"
          sx={{ width: '100%', borderRadius: 1 }}
        />
      )}
      {tab === 2 && (
        <Box
          component="img"
          src={originalUrl}
          alt="Original"
          sx={{ width: '100%', borderRadius: 1 }}
        />
      )}

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" spacing={3} flexWrap="wrap">
        <Box>
          <Typography variant="caption" color="text.secondary">Method</Typography>
          <Typography variant="body2">{methodLabel}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Predicted Class</Typography>
          <Typography variant="body2">
            {result.predicted_class_name} (#{result.predicted_class})
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Confidence</Typography>
          <Typography variant="body2">{Math.round(result.confidence * 100)}%</Typography>
        </Box>
        {result.compute_time_ms !== undefined && (
          <Box>
            <Typography variant="caption" color="text.secondary">Compute Time</Typography>
            <Typography variant="body2">{result.compute_time_ms.toFixed(0)} ms</Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  )
}

// ─── Advanced params accordion ────────────────────────────────────────────────

function AdvancedParamsAccordion({
  method,
  modelId,
  gradcamParams,
  saliencyParams,
  igParams,
  onGradcamChange,
  onSaliencyChange,
  onIGChange,
}: {
  method: 'gradcam' | 'saliency' | 'integrated_gradients'
  modelId: string
  gradcamParams: GradCAMParams
  saliencyParams: SaliencyParams
  igParams: IGParams
  onGradcamChange: (p: GradCAMParams) => void
  onSaliencyChange: (p: SaliencyParams) => void
  onIGChange: (p: IGParams) => void
}) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TuneIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">Advanced Parameters</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {method === 'gradcam' && (
          <GradCAMParamsPanel
            modelId={modelId}
            params={gradcamParams}
            onChange={onGradcamChange}
          />
        )}
        {method === 'saliency' && (
          <SaliencyParamsPanel params={saliencyParams} onChange={onSaliencyChange} />
        )}
        {method === 'integrated_gradients' && (
          <IGParamsPanel params={igParams} onChange={onIGChange} />
        )}
      </AccordionDetails>
    </Accordion>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Explainability() {
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [targetClass, setTargetClass] = useState<string>('')
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(
    new Set(['gradcam', 'saliency', 'integrated_gradients'])
  )
  const [useCompare, setUseCompare] = useState<'compare' | 'single'>('compare')
  const [singleMethod, setSingleMethod] = useState<'gradcam' | 'saliency' | 'integrated_gradients'>('gradcam')

  // Per-method advanced params
  const [gradcamParams, setGradcamParams] = useState<GradCAMParams>(DEFAULT_GRADCAM_PARAMS)
  const [saliencyParams, setSaliencyParams] = useState<SaliencyParams>(DEFAULT_SALIENCY_PARAMS)
  const [igParams, setIGParams] = useState<IGParams>(DEFAULT_IG_PARAMS)

  // Results
  const [compareMethods, setCompareMethods] = useState<{
    methods: Record<string, CompareMethodResult>
    predictedClass: string
    confidence: number
  } | null>(null)
  const [singleResult, setSingleResult] = useState<ExplainabilityResponse | null>(null)

  // Fetch models
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.getModels(),
  })

  // Compare mutation
  const compareMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModelId || !uploadedFile) throw new Error('Model and image required')
      const tc = targetClass ? parseInt(targetClass) : undefined
      return explainabilityApi.compare(selectedModelId, uploadedFile, tc)
    },
    onSuccess: (data) => {
      setCompareMethods({
        methods: data.methods,
        predictedClass: data.predicted_class_name,
        confidence: data.confidence,
      })
      setSingleResult(null)
    },
  })

  // Single method mutation — passes advanced params
  const singleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModelId || !uploadedFile) throw new Error('Model and image required')
      const tc = targetClass ? parseInt(targetClass) : undefined

      switch (singleMethod) {
        case 'gradcam':
          return explainabilityApi.gradcam(selectedModelId, uploadedFile, {
            ...gradcamParams,
            target_class: tc ?? gradcamParams.target_class,
          })
        case 'saliency':
          return explainabilityApi.saliency(selectedModelId, uploadedFile, {
            ...saliencyParams,
            target_class: tc ?? saliencyParams.target_class,
          })
        case 'integrated_gradients':
          return explainabilityApi.integratedGradients(selectedModelId, uploadedFile, {
            ...igParams,
            target_class: tc ?? igParams.target_class,
          })
      }
    },
    onSuccess: (data) => {
      setSingleResult(data)
      setCompareMethods(null)
    },
  })

  const activeMutation = useCompare === 'compare' ? compareMutation : singleMutation

  const handleMethodToggle = (method: string) => {
    setSelectedMethods((prev) => {
      const next = new Set(prev)
      next.has(method) ? next.delete(method) : next.add(method)
      return next
    })
  }

  const handleImageSelect = (file: File) => {
    setUploadedFile(file)
    setUploadedImageUrl(URL.createObjectURL(file))
  }

  const handleReset = () => {
    setUploadedFile(null)
    setUploadedImageUrl(null)
    setCompareMethods(null)
    setSingleResult(null)
    setTargetClass('')
    compareMutation.reset()
    singleMutation.reset()
  }

  const handleGenerate = () => {
    if (!selectedModelId) { alert('Please select a model'); return }
    if (!uploadedFile) { alert('Please upload an image'); return }
    activeMutation.mutate()
  }

  const canGenerate = !!selectedModelId && !!uploadedFile && !activeMutation.isPending
  const canReset = !!uploadedFile || !!compareMethods || !!singleResult

  return (
    <PageContainer
      title="Model Explainability"
      subtitle="Visualize and understand model predictions with Grad-CAM, Saliency Maps, and Integrated Gradients"
    >
      <Grid container spacing={3}>
        {/* ── Left: Configuration ── */}
        <Grid item xs={12} md={4}>
          {/* Model selection */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <Typography variant="h6">Select Model</Typography>
              <Tooltip title="Choose a pretrained model to explain">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Stack>
            {modelsLoading ? (
              <CircularProgress size={24} />
            ) : models.length === 0 ? (
              <Alert severity="info">No models available.</Alert>
            ) : (
              <FormControl fullWidth>
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

          {/* Image upload */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Upload Image</Typography>
            <ImageUpload
              onImageSelect={handleImageSelect}
              onImageRemove={() => { setUploadedFile(null); setUploadedImageUrl(null) }}
            />
          </Box>

          {/* Method selection */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Methods</Typography>

            {/* Compare vs single toggle */}
            <ToggleButtonGroup
              value={useCompare}
              exclusive
              onChange={(_, v) => { if (v) setUseCompare(v) }}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="compare">
                <CompareArrows fontSize="small" sx={{ mr: 0.5 }} />
                Compare All
              </ToggleButton>
              <ToggleButton value="single">
                <TuneIcon fontSize="small" sx={{ mr: 0.5 }} />
                Single Method
              </ToggleButton>
            </ToggleButtonGroup>

            {useCompare === 'compare' ? (
              /* Compare mode: show all methods as checkboxes (informational) */
              <FormGroup>
                {Object.entries(METHOD_INFO).map(([key, info]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={selectedMethods.has(key)}
                        onChange={() => handleMethodToggle(key)}
                        disabled // compare always runs all
                        size="small"
                        defaultChecked
                      />
                    }
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: info.color,
                          }}
                        />
                        <Typography variant="body2">{info.label}</Typography>
                      </Stack>
                    }
                  />
                ))}
              </FormGroup>
            ) : (
              /* Single mode: method selector + advanced params */
              <Box>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Method</InputLabel>
                  <Select
                    value={singleMethod}
                    onChange={(e) =>
                      setSingleMethod(e.target.value as typeof singleMethod)
                    }
                    label="Method"
                  >
                    {Object.entries(METHOD_INFO).map(([key, info]) => (
                      <MenuItem key={key} value={key}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: info.color,
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2">{info.label}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Advanced params accordion */}
                {selectedModelId && (
                  <AdvancedParamsAccordion
                    method={singleMethod}
                    modelId={selectedModelId}
                    gradcamParams={gradcamParams}
                    saliencyParams={saliencyParams}
                    igParams={igParams}
                    onGradcamChange={setGradcamParams}
                    onSaliencyChange={setSaliencyParams}
                    onIGChange={setIGParams}
                  />
                )}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Target class */}
            <Typography variant="subtitle2" gutterBottom>
              Target Class (Optional)
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Class Index</InputLabel>
              <Select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                label="Class Index"
              >
                <MenuItem value="">Auto (Top Prediction)</MenuItem>
                <MenuItem value="0">0 – tench</MenuItem>
                <MenuItem value="1">1 – goldfish</MenuItem>
                <MenuItem value="281">281 – tabby cat</MenuItem>
                <MenuItem value="282">282 – tiger cat</MenuItem>
                <MenuItem value="243">243 – bull mastiff</MenuItem>
                <MenuItem value="207">207 – golden retriever</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Leave empty to explain the top predicted class
            </Typography>
          </Paper>

          {/* Actions */}
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={
                activeMutation.isPending
                  ? <CircularProgress size={20} color="inherit" />
                  : <CompareArrows />
              }
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              {activeMutation.isPending
                ? 'Generating…'
                : useCompare === 'compare'
                  ? 'Compare All'
                  : `Generate ${METHOD_INFO[singleMethod]?.label ?? ''}`}
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Refresh />}
              onClick={handleReset}
              disabled={!canReset}
            >
              Reset
            </Button>
          </Stack>
        </Grid>

        {/* ── Right: Results ── */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>Explainability Results</Typography>

          {activeMutation.isPending && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Generating explainability visualizations…
              </Typography>
              {useCompare === 'compare' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Running all three methods in parallel — this may take 30–60 seconds.
                </Typography>
              )}
            </Paper>
          )}

          {activeMutation.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {(activeMutation.error as Error).message}
            </Alert>
          )}

          {compareMethods && uploadedImageUrl && (
            <ComparisonView
              methods={compareMethods.methods}
              originalUrl={uploadedImageUrl}
              predictedClass={compareMethods.predictedClass}
              confidence={compareMethods.confidence}
            />
          )}

          {singleResult && uploadedImageUrl && (
            <SingleMethodView result={singleResult} originalUrl={uploadedImageUrl} />
          )}

          {!activeMutation.isPending && !compareMethods && !singleResult && !activeMutation.error && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Upload an image, select a model, and click <strong>Generate</strong> to visualize
                explanations.
              </Typography>
            </Paper>
          )}

          {/* Educational method descriptions */}
          {!activeMutation.isPending && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                About These Methods
              </Typography>
              <Stack spacing={1.5}>
                {Object.entries(METHOD_INFO).map(([key, info]) => (
                  <Box
                    key={key}
                    sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: info.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {info.label}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {info.description}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>
    </PageContainer>
  )
}

// Made with Bob
