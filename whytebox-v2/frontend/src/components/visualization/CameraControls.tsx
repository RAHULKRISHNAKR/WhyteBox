/**
 * Camera Controls Component
 * 
 * Provides preset camera positions and advanced camera controls
 */

import { Box, Paper, Typography, Button, ButtonGroup, Slider, Stack } from '@mui/material'
import {
  ViewInAr,
  ThreeDRotation,
  CameraAlt,
  Refresh,
} from '@mui/icons-material'
import { ArcRotateCamera, Vector3 } from '@babylonjs/core'

interface CameraControlsProps {
  camera: ArcRotateCamera | null
  onReset?: () => void
}

interface CameraPreset {
  name: string
  icon: React.ReactNode
  alpha: number
  beta: number
  radius: number
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: 'Front',
    icon: <ViewInAr />,
    alpha: 0,
    beta: Math.PI / 2,
    radius: 15,
  },
  {
    name: 'Top',
    icon: <CameraAlt />,
    alpha: 0,
    beta: 0.1,
    radius: 20,
  },
  {
    name: 'Side',
    icon: <ThreeDRotation />,
    alpha: Math.PI / 2,
    beta: Math.PI / 2,
    radius: 15,
  },
  {
    name: 'Isometric',
    icon: <ViewInAr />,
    alpha: Math.PI / 4,
    beta: Math.PI / 3,
    radius: 15,
  },
]

export default function CameraControls({ camera, onReset }: CameraControlsProps) {
  const applyPreset = (preset: CameraPreset) => {
    if (!camera) return

    // Smoothly animate to preset position
    camera.alpha = preset.alpha
    camera.beta = preset.beta
    camera.radius = preset.radius
  }

  const handleFOVChange = (_: Event, value: number | number[]) => {
    if (!camera) return
    camera.fov = (value as number) * (Math.PI / 180)
  }

  const handleRadiusChange = (_: Event, value: number | number[]) => {
    if (!camera) return
    camera.radius = value as number
  }

  return (
    <Paper sx={{ p: 1.5, minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={1}>
        CAMERA
      </Typography>

      {/* Camera Presets — 2×2 grid of small icon buttons */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1.5 }}>
        {CAMERA_PRESETS.map((preset) => (
          <Button
            key={preset.name}
            variant="outlined"
            startIcon={preset.icon}
            onClick={() => applyPreset(preset)}
            size="small"
            sx={{ fontSize: '0.65rem', py: 0.4, px: 0.5, minWidth: 0 }}
          >
            {preset.name}
          </Button>
        ))}
      </Box>

      {/* FOV Control */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Field of View
        </Typography>
        <Slider
          defaultValue={45}
          min={30}
          max={90}
          step={5}
          size="small"
          valueLabelDisplay="auto"
          onChange={handleFOVChange}
          disabled={!camera}
        />
      </Box>

      {/* Distance Control */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Distance
        </Typography>
        <Slider
          defaultValue={15}
          min={5}
          max={200}
          step={5}
          size="small"
          valueLabelDisplay="auto"
          onChange={handleRadiusChange}
          disabled={!camera}
        />
      </Box>

      {/* Reset Button */}
      <Button
        variant="contained"
        startIcon={<Refresh />}
        onClick={onReset}
        fullWidth
        size="small"
      >
        Reset View
      </Button>
    </Paper>
  )
}

// Made with Bob
