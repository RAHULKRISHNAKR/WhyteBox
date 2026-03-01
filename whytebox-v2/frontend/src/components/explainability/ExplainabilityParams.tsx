/**
 * ExplainabilityParams
 *
 * Per-method advanced parameter controls for explainability methods.
 *
 * Grad-CAM:
 *   - layer_name (dropdown from /explainability/layers)
 *
 * Saliency / SmoothGrad:
 *   - smooth_grad toggle
 *   - n_samples (10–100)
 *   - noise_level (0.01–0.5)
 *
 * Integrated Gradients:
 *   - num_steps (10–300)
 *   - baseline_type (zeros | blur | noise)
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Divider,
  Stack,
  Tooltip,
  Chip,
} from '@mui/material'
import { Info as InfoIcon } from '@mui/icons-material'
import { explainabilityApi } from '@/services/api/explainability'
import type { GradCAMOptions, SaliencyOptions, IntegratedGradientsOptions } from '@/services/api/explainability'

// ─── Exported param state types ───────────────────────────────────────────────

export interface GradCAMParams extends GradCAMOptions {}

export interface SaliencyParams extends SaliencyOptions {}

export interface IGParams extends IntegratedGradientsOptions {}

// ─── Default values ───────────────────────────────────────────────────────────

export const DEFAULT_GRADCAM_PARAMS: GradCAMParams = {
  layer_name: undefined,
  target_class: undefined,
}

export const DEFAULT_SALIENCY_PARAMS: SaliencyParams = {
  smooth_grad: false,
  n_samples: 25,
  noise_level: 0.1,
  target_class: undefined,
}

export const DEFAULT_IG_PARAMS: IGParams = {
  num_steps: 50,
  baseline_type: 'zeros',
  target_class: undefined,
}

// ─── Grad-CAM params ──────────────────────────────────────────────────────────

interface GradCAMParamsProps {
  modelId: string
  params: GradCAMParams
  onChange: (p: GradCAMParams) => void
}

export function GradCAMParamsPanel({ modelId, params, onChange }: GradCAMParamsProps) {
  const { data: layerData, isLoading } = useQuery({
    queryKey: ['explainability-layers', modelId],
    queryFn: () => explainabilityApi.getLayers(modelId),
    enabled: !!modelId,
    staleTime: 5 * 60 * 1000,
  })

  // Auto-select default layer when data loads
  useEffect(() => {
    if (layerData?.default_target_layer && !params.layer_name) {
      onChange({ ...params, layer_name: layerData.default_target_layer })
    }
  }, [layerData?.default_target_layer]) // eslint-disable-line react-hooks/exhaustive-deps

  const layers = layerData?.recommended_layers ?? []
  const allLayers = layerData?.conv_layers ?? []

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
        <Typography variant="subtitle2">Target Layer</Typography>
        <Tooltip title="The convolutional layer whose gradients are used to generate the heatmap. Deeper layers capture semantic features; shallower layers capture textures.">
          <InfoIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
        </Tooltip>
      </Stack>

      {isLoading ? (
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
      ) : (
        <FormControl fullWidth size="small">
          <InputLabel>Layer</InputLabel>
          <Select
            value={params.layer_name ?? ''}
            onChange={(e) => onChange({ ...params, layer_name: e.target.value || undefined })}
            label="Layer"
          >
            <MenuItem value="">
              <em>Auto (recommended)</em>
            </MenuItem>
            {layers.length > 0 && (
              <MenuItem disabled sx={{ fontSize: '0.7rem', color: 'text.disabled', py: 0 }}>
                ── Recommended ──
              </MenuItem>
            )}
            {layers.map((l) => (
              <MenuItem key={l} value={l}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" noWrap>{l}</Typography>
                  {l === layerData?.default_target_layer && (
                    <Chip label="default" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                  )}
                </Stack>
              </MenuItem>
            ))}
            {allLayers.filter((l) => !layers.includes(l)).length > 0 && (
              <MenuItem disabled sx={{ fontSize: '0.7rem', color: 'text.disabled', py: 0 }}>
                ── All Conv Layers ──
              </MenuItem>
            )}
            {allLayers
              .filter((l) => !layers.includes(l))
              .map((l) => (
                <MenuItem key={l} value={l}>
                  <Typography variant="body2" noWrap>{l}</Typography>
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      )}

      {layerData && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {layerData.conv_layers.length} conv layers available
        </Typography>
      )}
    </Box>
  )
}

// ─── Saliency params ──────────────────────────────────────────────────────────

interface SaliencyParamsProps {
  params: SaliencyParams
  onChange: (p: SaliencyParams) => void
}

export function SaliencyParamsPanel({ params, onChange }: SaliencyParamsProps) {
  return (
    <Box>
      {/* SmoothGrad toggle */}
      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={params.smooth_grad ?? false}
              onChange={(e) => onChange({ ...params, smooth_grad: e.target.checked })}
            />
          }
          label={
            <Typography variant="subtitle2">SmoothGrad</Typography>
          }
        />
        <Tooltip title="Averages gradients over N noisy copies of the input to reduce visual noise in the saliency map.">
          <InfoIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
        </Tooltip>
      </Stack>

      {params.smooth_grad && (
        <Box sx={{ pl: 1 }}>
          <Divider sx={{ mb: 1.5 }} />

          {/* n_samples */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2">Samples</Typography>
                <Tooltip title="Number of noisy copies to average. More samples = smoother map but slower.">
                  <InfoIcon fontSize="small" color="action" sx={{ fontSize: 12 }} />
                </Tooltip>
              </Stack>
              <Chip label={params.n_samples ?? 25} size="small" />
            </Stack>
            <Slider
              value={params.n_samples ?? 25}
              onChange={(_, v) => onChange({ ...params, n_samples: v as number })}
              min={5}
              max={100}
              step={5}
              marks={[
                { value: 5, label: '5' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
              size="small"
            />
          </Box>

          {/* noise_level */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2">Noise Level</Typography>
                <Tooltip title="Standard deviation of Gaussian noise added to each copy. Higher = more averaging but less precise.">
                  <InfoIcon fontSize="small" color="action" sx={{ fontSize: 12 }} />
                </Tooltip>
              </Stack>
              <Chip label={(params.noise_level ?? 0.1).toFixed(2)} size="small" />
            </Stack>
            <Slider
              value={params.noise_level ?? 0.1}
              onChange={(_, v) => onChange({ ...params, noise_level: v as number })}
              min={0.01}
              max={0.5}
              step={0.01}
              marks={[
                { value: 0.01, label: '0.01' },
                { value: 0.25, label: '0.25' },
                { value: 0.5, label: '0.5' },
              ]}
              size="small"
            />
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ─── Integrated Gradients params ──────────────────────────────────────────────

interface IGParamsProps {
  params: IGParams
  onChange: (p: IGParams) => void
}

export function IGParamsPanel({ params, onChange }: IGParamsProps) {
  return (
    <Box>
      {/* num_steps */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="subtitle2">Integration Steps</Typography>
            <Tooltip title="Number of interpolation steps between baseline and input. More steps = more accurate but slower. 50 is a good default.">
              <InfoIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
            </Tooltip>
          </Stack>
          <Chip label={params.num_steps ?? 50} size="small" />
        </Stack>
        <Slider
          value={params.num_steps ?? 50}
          onChange={(_, v) => onChange({ ...params, num_steps: v as number })}
          min={10}
          max={300}
          step={10}
          marks={[
            { value: 10, label: '10' },
            { value: 50, label: '50' },
            { value: 150, label: '150' },
            { value: 300, label: '300' },
          ]}
          size="small"
        />
        <Typography variant="caption" color="text.secondary">
          Riemann approximation of ∫ gradients · (x − x̄) dt
        </Typography>
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* baseline_type */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
          <Typography variant="subtitle2">Baseline</Typography>
          <Tooltip title="The reference input x̄ used as the starting point of integration. 'zeros' is the standard choice; 'blur' and 'noise' can reveal different attribution patterns.">
            <InfoIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
          </Tooltip>
        </Stack>
        <FormControl fullWidth size="small">
          <InputLabel>Baseline Type</InputLabel>
          <Select
            value={params.baseline_type ?? 'zeros'}
            onChange={(e) =>
              onChange({ ...params, baseline_type: e.target.value as IGParams['baseline_type'] })
            }
            label="Baseline Type"
          >
            <MenuItem value="zeros">
              <Stack>
                <Typography variant="body2">Zeros (black image)</Typography>
                <Typography variant="caption" color="text.secondary">Standard baseline — all pixels set to 0</Typography>
              </Stack>
            </MenuItem>
            <MenuItem value="blur">
              <Stack>
                <Typography variant="body2">Blur (Gaussian)</Typography>
                <Typography variant="caption" color="text.secondary">Blurred version of the input image</Typography>
              </Stack>
            </MenuItem>
            <MenuItem value="noise">
              <Stack>
                <Typography variant="body2">Noise (random)</Typography>
                <Typography variant="caption" color="text.secondary">Random Gaussian noise baseline</Typography>
              </Stack>
            </MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  )
}

// Made with Bob
