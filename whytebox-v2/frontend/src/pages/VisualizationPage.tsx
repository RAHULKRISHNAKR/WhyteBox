/**
 * Visualization Page
 *
 * 3D BabylonJS visualization of a selected model's architecture.
 * Reads ?model=<id> from the URL query string to pre-select a model.
 *
 * Sections:
 *   1. Left sidebar  — model selector, architecture stats, legend, controls
 *   2. Main canvas   — 3D BabylonJS scene (ModelViewer)
 *   3. Feature Maps  — image upload + per-layer activation map grid
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  GridView as FeatureMapIcon,
} from '@mui/icons-material'
import PageContainer from '@/components/common/PageContainer'
import ModelViewer from '@/components/visualization/ModelViewer'
import FeatureMapPanel from '@/components/visualization/FeatureMapPanel'
import { modelsApi } from '@/services/api/models'
import { inferenceApi, type BulkActivationResult } from '@/services/api/inference'

// ─── Architecture stats panel ─────────────────────────────────────────────────
function ArchitectureStats({ modelId }: { modelId: string }) {
  const { data: arch, isLoading } = useQuery({
    queryKey: ['architecture', modelId],
    queryFn: () => modelsApi.getModelArchitecture(modelId),
    enabled: !!modelId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <CircularProgress size={20} />
  if (!arch) return null

  const { stats, visualization_hints } = arch

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip label={`${stats.total_layers} layers`} size="small" color="primary" />
        <Chip label={`${(stats.total_params / 1e6).toFixed(1)}M params`} size="small" color="secondary" />
        <Chip label={`${(stats.trainable_params / 1e6).toFixed(1)}M trainable`} size="small" color="success" />
      </Stack>

      <Box>
        <Typography variant="subtitle2" gutterBottom>Layer Types</Typography>
        <Stack spacing={0.5}>
          {Object.entries(stats.layer_type_counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([type, count]) => (
              <Stack key={type} direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">{type}</Typography>
                <Typography variant="caption" fontWeight="bold">{count}</Typography>
              </Stack>
            ))}
        </Stack>
      </Box>

      {visualization_hints.blocks.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Block Structure</Typography>
          <Stack spacing={0.5}>
            {visualization_hints.blocks.map((block, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">{block.category}</Typography>
                <Chip label={block.count} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
const LEGEND = [
  { category: 'conv',           color: '#2E86DE', shape: 'Flat slab',        description: 'Convolutional layer' },
  { category: 'dense',          color: '#20B2AA', shape: 'Sphere',           description: 'Fully connected layer' },
  { category: 'activation',     color: '#FFC300', shape: 'Disc',             description: 'Activation function' },
  { category: 'pooling',        color: '#E74C3C', shape: 'Cube',             description: 'Pooling layer' },
  { category: 'normalization',  color: '#9B59B6', shape: 'Torus',            description: 'Batch/Layer norm' },
  { category: 'regularization', color: '#4CAF50', shape: 'Wireframe sphere', description: 'Dropout' },
  { category: 'reshape',        color: '#FF9800', shape: 'Octahedron',       description: 'Reshape/Flatten' },
  { category: 'output',         color: '#F44336', shape: 'Cylinder',         description: 'Output layer' },
]

function VisualizationLegend() {
  return (
    <Stack spacing={0.75}>
      {LEGEND.map((item) => (
        <Stack key={item.category} direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 14, height: 14, borderRadius: '2px', backgroundColor: item.color, flexShrink: 0 }} />
          <Box>
            <Typography variant="caption" fontWeight="medium">{item.description}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">{item.shape}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}

// ─── Feature Maps Section ─────────────────────────────────────────────────────

interface FeatureMapsProps {
  modelId: string
  /** Called after a successful bulk extraction so the 3D viewer can show real activations */
  onActivationsExtracted?: (data: Record<string, number[][]>) => void
}

function FeatureMapsSection({ modelId, onActivationsExtracted }: FeatureMapsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [bulkResults, setBulkResults] = useState<Record<string, BulkActivationResult> | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<number | undefined>(undefined)

  // Fetch conv layer names
  const { data: layerInfo } = useQuery({
    queryKey: ['layers', modelId],
    queryFn: () => modelsApi.getModelLayers(modelId),
    enabled: !!modelId,
    staleTime: 10 * 60 * 1000,
  })

  const convLayers = layerInfo?.conv_layers ?? []

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreviewUrl(url)
    setBulkResults(null)
    setSelectedLayer(null)
    setError(null)
  }

  const handleExtract = async () => {
    if (!imageFile || convLayers.length === 0) return
    setLoading(true)
    setProgress(0)
    setError(null)
    setBulkResults(null)

    try {
      // Extract in batches of 4, updating progress
      const BATCH = 4
      const results: Record<string, BulkActivationResult> = {}
      let done = 0

      for (let i = 0; i < convLayers.length; i += BATCH) {
        const batch = convLayers.slice(i, i + BATCH)
        const batchResults = await inferenceApi.getBulkActivations(modelId, imageFile, batch, 16)
        Object.assign(results, batchResults)
        done += batch.length
        setProgress(Math.round((done / convLayers.length) * 100))
      }

      setBulkResults(results)
      // Auto-select first successful layer
      const firstSuccess = Object.keys(results).find((k) => results[k].success)
      if (firstSuccess) setSelectedLayer(firstSuccess)

      // Lift activation data up to VisualizationPage so ModelViewer can use it for 3D expansion.
      // Convert BulkActivationResult → Record<layerName, number[][]> (flat per-channel arrays).
      if (onActivationsExtracted) {
        const flatData: Record<string, number[][]> = {}
        for (const [layerName, result] of Object.entries(results)) {
          if (result.success && result.activation_maps) {
            flatData[layerName] = result.activation_maps.map((ch) =>
              Array.isArray(ch[0]) ? (ch as number[][]).flat() : (ch as unknown as number[])
            )
          }
        }
        onActivationsExtracted(flatData)
      }
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Extraction failed')
    } finally {
      setLoading(false)
    }
  }

  // Cleanup object URL
  useEffect(() => {
    return () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl) }
  }, [imagePreviewUrl])

  const selectedResult = selectedLayer ? bulkResults?.[selectedLayer] : null

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <FeatureMapIcon color="primary" />
        <Typography variant="h6">Feature Maps</Typography>
        <Chip
          label="Important"
          size="small"
          color="warning"
          sx={{ fontSize: '0.65rem' }}
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Upload an image to extract and visualize intermediate layer activations.
        Each channel shows what patterns the layer detects in the input.
      </Typography>

      {/* Upload area */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageChange}
      />

      {!imageFile ? (
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            mb: 2,
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="body1" color="primary" fontWeight="medium">
            Click to upload an image
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            PNG, JPG, JPEG · The image will be passed through the model
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2} mb={2}>
          {/* Image preview */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ position: 'relative' }}>
              <Box
                component="img"
                src={imagePreviewUrl ?? ''}
                alt="Input"
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  maxHeight: 200,
                  objectFit: 'contain',
                  backgroundColor: '#111',
                  display: 'block',
                }}
              />
              <IconButton
                size="small"
                onClick={() => {
                  setImageFile(null)
                  setImagePreviewUrl(null)
                  setBulkResults(null)
                  setSelectedLayer(null)
                }}
                sx={{
                  position: 'absolute', top: 4, right: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Stack direction="row" spacing={1} mt={1} alignItems="center">
              <ImageIcon fontSize="small" color="success" />
              <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                {imageFile.name}
              </Typography>
              <Button size="small" onClick={() => fileInputRef.current?.click()}>
                Change
              </Button>
            </Stack>
          </Grid>

          {/* Controls */}
          <Grid item xs={12} sm={8}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {convLayers.length} convolutional layers detected
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Feature maps will be extracted for each layer (up to 16 channels per layer)
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" variant="outlined" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {loading && (
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Extracting activations…
                    </Typography>
                    <Typography variant="caption" color="primary">
                      {progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FeatureMapIcon />}
                  onClick={handleExtract}
                  disabled={loading || convLayers.length === 0}
                  sx={{ flex: 1 }}
                >
                  {loading ? 'Extracting…' : bulkResults ? 'Re-extract' : 'Extract Feature Maps'}
                </Button>
                {bulkResults && (
                  <Tooltip title="Re-extract with current image">
                    <IconButton onClick={handleExtract} disabled={loading}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>

              {bulkResults && (
                <Alert severity="success" variant="outlined">
                  Extracted {Object.values(bulkResults).filter((r) => r.success).length} of{' '}
                  {Object.keys(bulkResults).length} layers successfully
                </Alert>
              )}
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* Results grid */}
      {bulkResults && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight="bold" mb={1.5}>
            Layer Activations
          </Typography>

          {/* Layer selector tabs */}
          <Box sx={{ overflowX: 'auto', mb: 2 }}>
            <Stack direction="row" spacing={0.75} sx={{ minWidth: 'max-content', pb: 0.5 }}>
              {Object.entries(bulkResults).map(([layerName, result]) => (
                <Chip
                  key={layerName}
                  label={layerName.split('.').slice(-2).join('.')}
                  size="small"
                  color={selectedLayer === layerName ? 'primary' : 'default'}
                  variant={selectedLayer === layerName ? 'filled' : 'outlined'}
                  onClick={() => {
                    setSelectedLayer(layerName)
                    setSelectedChannel(undefined)
                  }}
                  disabled={!result.success}
                  sx={{ cursor: 'pointer', fontSize: '0.65rem' }}
                />
              ))}
            </Stack>
          </Box>

          {/* Selected layer feature maps */}
          {selectedResult?.success && selectedResult.activation_maps ? (
            <FeatureMapPanel
              layerName={selectedLayer ?? ''}
              layerType={selectedResult.layer_type}
              channelMaps={selectedResult.activation_maps}
              stats={selectedResult.stats}
              maxCols={8}
              cellSize={72}
              selectedChannel={selectedChannel}
              onChannelSelect={setSelectedChannel}
            />
          ) : selectedResult && !selectedResult.success ? (
            <Alert severity="error" variant="outlined">
              Failed to extract activations for {selectedLayer}: {selectedResult.error}
            </Alert>
          ) : null}
        </>
      )}
    </Paper>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VisualizationPage() {
  const [searchParams] = useSearchParams()
  const [selectedModelId, setSelectedModelId] = useState<string>(
    searchParams.get('model') ?? ''
  )
  // Activation data extracted by FeatureMapsSection — passed to ModelViewer for 3D expansion
  const [extractedActivations, setExtractedActivations] = useState<Record<string, number[][]>>({})

  useEffect(() => {
    const urlModel = searchParams.get('model')
    if (urlModel && urlModel !== selectedModelId) setSelectedModelId(urlModel)
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: models = [], isLoading: modelsLoading, error: modelsError } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.getModels(),
  })

  return (
    <PageContainer
      title="3D Architecture Visualization"
      subtitle="Explore neural network architectures in interactive 3D. Click any layer to inspect its configuration and view feature maps."
    >
      <Grid container spacing={3}>
        {/* ── Left sidebar ── */}
        <Grid item xs={12} md={3}>
          {/* Model selector */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Select Model
            </Typography>
            {modelsLoading ? (
              <CircularProgress size={24} />
            ) : modelsError ? (
              <Alert severity="error" variant="outlined">
                Backend unavailable
              </Alert>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel>Model</InputLabel>
                <Select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  label="Model"
                >
                  <MenuItem value="">
                    <em>— Demo (no model) —</em>
                  </MenuItem>
                  {models.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      <Stack>
                        <Typography variant="body2">{m.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(m.total_params / 1e6).toFixed(1)}M params
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Paper>

          {/* Architecture stats */}
          {selectedModelId && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Architecture Stats
              </Typography>
              <ArchitectureStats modelId={selectedModelId} />
            </Paper>
          )}

          {/* Legend */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Layer Legend</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <VisualizationLegend />
            </AccordionDetails>
          </Accordion>

          {/* Controls help */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Controls</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={0.5}>
                {[
                  ['Left drag',   'Rotate'],
                  ['Right drag',  'Pan'],
                  ['Scroll',      'Zoom'],
                  ['Click layer', 'Inspect + feature maps'],
                  ['Layer list',  'Browse all layers'],
                  ['Feature Maps tab', 'Upload image & extract'],
                ].map(([key, action]) => (
                  <Stack key={key} direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">{key}</Typography>
                    <Typography variant="caption">{action}</Typography>
                  </Stack>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* ── Main canvas ── */}
        <Grid item xs={12} md={9}>
          <ModelViewer
            modelId={selectedModelId || undefined}
            externalActivationData={Object.keys(extractedActivations).length > 0 ? extractedActivations : undefined}
          />

          {!selectedModelId && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info">
                Select a model from the sidebar to visualize its real architecture.
                The demo shows a sample 7-layer network.
              </Alert>
            </Box>
          )}

          {/* ── Feature Maps Section ── */}
          <Box sx={{ mt: 3 }}>
            {selectedModelId ? (
              <FeatureMapsSection
                modelId={selectedModelId}
                onActivationsExtracted={setExtractedActivations}
              />
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <FeatureMapIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Feature Maps
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select a model above to upload an image and visualize per-layer feature maps.
                </Typography>
              </Paper>
            )}
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  )
}

// Made with Bob
