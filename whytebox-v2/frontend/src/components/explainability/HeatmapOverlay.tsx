/**
 * Heatmap Overlay Component
 * 
 * Displays explainability heatmap overlaid on original image
 */

import { useRef, useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Slider,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Download, Refresh } from '@mui/icons-material'

interface HeatmapOverlayProps {
  originalImage: string // Base64 or URL
  heatmapData: number[][] // 2D array of values 0-1
  title?: string
  colormap?: 'jet' | 'hot' | 'viridis' | 'plasma'
}

export default function HeatmapOverlay({
  originalImage,
  heatmapData,
  title = 'Heatmap',
  colormap = 'jet',
}: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [opacity, setOpacity] = useState(0.5)
  const [showOriginal, setShowOriginal] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !heatmapData || heatmapData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw original image if enabled
      if (showOriginal) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

      // Draw heatmap overlay
      drawHeatmap(ctx, heatmapData, canvas.width, canvas.height, opacity, colormap)
      setImageLoaded(true)
    }
    img.src = originalImage
  }, [originalImage, heatmapData, opacity, showOriginal, colormap])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const handleReset = () => {
    setOpacity(0.5)
    setShowOriginal(true)
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Box>
          <Tooltip title="Reset">
            <IconButton onClick={handleReset} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton onClick={handleDownload} size="small" disabled={!imageLoaded}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Canvas */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          bgcolor: 'background.default',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </Box>

      {/* Controls */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" gutterBottom>
          Overlay Opacity: {(opacity * 100).toFixed(0)}%
        </Typography>
        <Slider
          value={opacity}
          onChange={(_, value) => setOpacity(value as number)}
          min={0}
          max={1}
          step={0.05}
          marks={[
            { value: 0, label: '0%' },
            { value: 0.5, label: '50%' },
            { value: 1, label: '100%' },
          ]}
        />

        <FormControlLabel
          control={
            <Switch
              checked={showOriginal}
              onChange={(e) => setShowOriginal(e.target.checked)}
            />
          }
          label="Show Original Image"
        />
      </Box>
    </Paper>
  )
}

/**
 * Draw heatmap on canvas
 */
function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  data: number[][],
  width: number,
  height: number,
  opacity: number,
  colormap: string
) {
  const rows = data.length
  const cols = data[0]?.length || 0
  if (rows === 0 || cols === 0) return

  const cellWidth = width / cols
  const cellHeight = height / rows

  // Create temporary canvas for heatmap
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return

  // Draw heatmap cells
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const value = data[i][j]
      const color = getColor(value, colormap)
      tempCtx.fillStyle = color
      tempCtx.fillRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight)
    }
  }

  // Apply opacity and draw on main canvas
  ctx.globalAlpha = opacity
  ctx.drawImage(tempCanvas, 0, 0)
  ctx.globalAlpha = 1.0
}

/**
 * Get color for value based on colormap
 */
function getColor(value: number, colormap: string): string {
  // Clamp value between 0 and 1
  value = Math.max(0, Math.min(1, value))

  switch (colormap) {
    case 'jet':
      return getJetColor(value)
    case 'hot':
      return getHotColor(value)
    case 'viridis':
      return getViridisColor(value)
    case 'plasma':
      return getPlasmaColor(value)
    default:
      return getJetColor(value)
  }
}

function getJetColor(value: number): string {
  const r = Math.max(0, Math.min(255, Math.floor(255 * (1.5 - 4 * Math.abs(value - 0.75)))))
  const g = Math.max(0, Math.min(255, Math.floor(255 * (1.5 - 4 * Math.abs(value - 0.5)))))
  const b = Math.max(0, Math.min(255, Math.floor(255 * (1.5 - 4 * Math.abs(value - 0.25)))))
  return `rgb(${r}, ${g}, ${b})`
}

function getHotColor(value: number): string {
  const r = Math.min(255, Math.floor(255 * value * 3))
  const g = Math.max(0, Math.min(255, Math.floor(255 * (value * 3 - 1))))
  const b = Math.max(0, Math.min(255, Math.floor(255 * (value * 3 - 2))))
  return `rgb(${r}, ${g}, ${b})`
}

function getViridisColor(value: number): string {
  // Simplified viridis approximation
  const r = Math.floor(255 * (0.267 + 0.005 * value))
  const g = Math.floor(255 * (0.005 + 0.5 * value))
  const b = Math.floor(255 * (0.329 + 0.5 * value))
  return `rgb(${r}, ${g}, ${b})`
}

function getPlasmaColor(value: number): string {
  // Simplified plasma approximation
  const r = Math.floor(255 * (0.05 + 0.9 * value))
  const g = Math.floor(255 * (0.03 + 0.4 * value * (1 - value)))
  const b = Math.floor(255 * (0.53 - 0.5 * value))
  return `rgb(${r}, ${g}, ${b})`
}

// Made with Bob
