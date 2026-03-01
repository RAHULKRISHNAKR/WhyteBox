/**
 * FeatureMapPanel
 *
 * Renders a grid of per-channel activation maps for a single layer.
 * Each channel is drawn onto a <canvas> using a heatmap colour ramp.
 *
 * Props:
 *   channelMaps  – 2D arrays [channels][H*W] or [channels][H][W]
 *   layerName    – display name
 *   stats        – { mean, std, min, max, sparsity }
 *   maxCols      – max columns in the grid (default 4)
 *   cellSize     – pixel size of each cell canvas (default 64)
 *   onClose      – called when the panel is dismissed
 */

import { useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Grid,
} from '@mui/material'
import { Close as CloseIcon, Info as InfoIcon } from '@mui/icons-material'

// ─── Colour ramp: black → blue → cyan → green → yellow → red ─────────────────
function heatmapColor(t: number): [number, number, number] {
  // t in [0, 1]
  const stops: Array<[number, [number, number, number]]> = [
    [0.00, [0,   0,   0  ]],
    [0.20, [0,   0,   180]],
    [0.40, [0,   180, 220]],
    [0.60, [0,   220, 0  ]],
    [0.80, [255, 220, 0  ]],
    [1.00, [255, 0,   0  ]],
  ]

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i]
    const [t1, c1] = stops[i + 1]
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0)
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ]
    }
  }
  return [255, 0, 0]
}

// ─── Single channel canvas ────────────────────────────────────────────────────

interface ChannelCanvasProps {
  /** Flat or 2D array of values in [0, 1] */
  data: number[] | number[][]
  size: number
  channelIndex: number
  isSelected: boolean
  onClick: () => void
}

function ChannelCanvas({ data, size, channelIndex, isSelected, onClick }: ChannelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Flatten 2D → 1D
    const flat: number[] = Array.isArray(data[0])
      ? (data as number[][]).flat()
      : (data as number[])

    if (flat.length === 0) return

    // Determine grid dimensions
    const n = flat.length
    const side = Math.round(Math.sqrt(n))
    const rows = side
    const cols = Math.ceil(n / rows)

    canvas.width = size
    canvas.height = size

    const imageData = ctx.createImageData(size, size)
    const pixels = imageData.data

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        // Map pixel → data index
        const dataX = Math.floor((px / size) * cols)
        const dataY = Math.floor((py / size) * rows)
        const idx = dataY * cols + dataX
        const t = idx < flat.length ? Math.max(0, Math.min(1, flat[idx])) : 0
        const [r, g, b] = heatmapColor(t)
        const pixelIdx = (py * size + px) * 4
        pixels[pixelIdx]     = r
        pixels[pixelIdx + 1] = g
        pixels[pixelIdx + 2] = b
        pixels[pixelIdx + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [data, size])

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        border: isSelected ? '2px solid #2196F3' : '2px solid transparent',
        borderRadius: 1,
        overflow: 'hidden',
        '&:hover': { border: '2px solid rgba(33,150,243,0.6)' },
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: size, height: size }} />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          px: 0.5,
          py: 0.25,
        }}
      >
        <Typography variant="caption" sx={{ color: 'white', fontSize: '0.55rem', lineHeight: 1 }}>
          ch {channelIndex}
        </Typography>
      </Box>
    </Box>
  )
}

// ─── Colour scale legend ──────────────────────────────────────────────────────

function ColourScaleLegend({ width = 160 }: { width?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = width
    canvas.height = 12
    for (let x = 0; x < width; x++) {
      const t = x / (width - 1)
      const [r, g, b] = heatmapColor(t)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x, 0, 1, 12)
    }
  }, [width])

  return (
    <Stack spacing={0.25}>
      <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 2 }} />
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>0 (low)</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>1 (high)</Typography>
      </Stack>
    </Stack>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export interface FeatureMapStats {
  mean: number
  std: number
  min: number
  max: number
  sparsity?: number
}

export interface FeatureMapPanelProps {
  layerName: string
  layerType?: string
  channelMaps: Array<number[] | number[][]>
  stats?: FeatureMapStats
  maxCols?: number
  cellSize?: number
  onClose?: () => void
  selectedChannel?: number
  onChannelSelect?: (ch: number) => void
}

export default function FeatureMapPanel({
  layerName,
  layerType,
  channelMaps,
  stats,
  maxCols = 4,
  cellSize = 64,
  onClose,
  selectedChannel,
  onChannelSelect,
}: FeatureMapPanelProps) {
  const numChannels = channelMaps.length

  return (
    <Paper
      elevation={4}
      sx={{
        p: 2,
        backgroundColor: 'rgba(15, 15, 25, 0.97)',
        color: 'white',
        borderRadius: 2,
        maxHeight: '80vh',
        overflowY: 'auto',
        minWidth: 300,
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#90CAF9' }}>
            Feature Maps
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {layerName}
            {layerType && (
              <Chip
                label={layerType}
                size="small"
                sx={{ ml: 1, height: 16, fontSize: '0.6rem', backgroundColor: 'rgba(33,150,243,0.3)', color: 'white' }}
              />
            )}
          </Typography>
        </Box>
        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />

      {/* Stats row */}
      {stats && (
        <Stack direction="row" spacing={1.5} mb={1.5} flexWrap="wrap">
          {[
            { label: 'channels', value: numChannels },
            { label: 'mean', value: stats.mean.toFixed(3) },
            { label: 'std', value: stats.std.toFixed(3) },
            { label: 'min', value: stats.min.toFixed(3) },
            { label: 'max', value: stats.max.toFixed(3) },
            ...(stats.sparsity !== undefined
              ? [{ label: 'sparsity', value: `${(stats.sparsity * 100).toFixed(1)}%` }]
              : []),
          ].map(({ label, value }) => (
            <Box key={label}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', fontSize: '0.6rem' }}>
                {label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'white', fontFamily: 'monospace' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {/* Colour scale */}
      <Box mb={1.5}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6rem', display: 'block', mb: 0.5 }}>
          ACTIVATION INTENSITY
        </Typography>
        <ColourScaleLegend width={Math.min(maxCols * (cellSize + 4), 240)} />
      </Box>

      {/* Channel grid */}
      {numChannels === 0 ? (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
          No activation data available
        </Typography>
      ) : (
        <Grid container spacing={0.5}>
          {channelMaps.map((chData, idx) => (
            <Grid item key={idx}>
              <ChannelCanvas
                data={chData}
                size={cellSize}
                channelIndex={idx}
                isSelected={selectedChannel === idx}
                onClick={() => onChannelSelect?.(idx)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Selected channel detail */}
      {selectedChannel !== undefined && channelMaps[selectedChannel] && (
        <Box mt={1.5}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6rem', display: 'block', mb: 0.5 }}>
            CHANNEL {selectedChannel} — ENLARGED
          </Typography>
          <ChannelCanvas
            data={channelMaps[selectedChannel]}
            size={Math.min(cellSize * 3, 192)}
            channelIndex={selectedChannel}
            isSelected={false}
            onClick={() => {}}
          />
        </Box>
      )}

      {/* Hint */}
      <Stack direction="row" spacing={0.5} alignItems="center" mt={1.5}>
        <InfoIcon sx={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
          Click a channel to enlarge · Upload an image to see real activations
        </Typography>
      </Stack>
    </Paper>
  )
}

// Made with Bob