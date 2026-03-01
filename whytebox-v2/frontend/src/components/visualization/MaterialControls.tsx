/**
 * Material Controls Component
 * 
 * Controls for customizing materials, colors, and lighting
 */

import { Box, Paper, Typography, Slider, Stack, Switch, FormControlLabel } from '@mui/material'
import { Scene, Color3, Color4 } from '@babylonjs/core'
import { useState } from 'react'

interface MaterialControlsProps {
  scene: Scene | null
}

export default function MaterialControls({ scene }: MaterialControlsProps) {
  const [wireframe, setWireframe] = useState(false)
  const [showEdges, setShowEdges] = useState(false)
  const [ambientIntensity, setAmbientIntensity] = useState(0.5)
  const [nodeOpacity, setNodeOpacity] = useState(0.8)

  const handleWireframeToggle = (checked: boolean) => {
    setWireframe(checked)
    if (!scene) return

    scene.meshes.forEach((mesh) => {
      if (mesh.material) {
        mesh.material.wireframe = checked
      }
    })
  }

  const handleEdgesToggle = (checked: boolean) => {
    setShowEdges(checked)
    if (!scene) return

    scene.meshes.forEach((mesh) => {
      if (checked) {
        mesh.enableEdgesRendering()
        mesh.edgesWidth = 2.0
        mesh.edgesColor = new Color4(0, 0, 0, 1)
      } else {
        mesh.disableEdgesRendering()
      }
    })
  }

  const handleAmbientChange = (_: Event, value: number | number[]) => {
    const intensity = value as number
    setAmbientIntensity(intensity)
    
    if (!scene) return

    const light = scene.lights[0]
    if (light) {
      light.intensity = intensity
    }
  }

  const handleOpacityChange = (_: Event, value: number | number[]) => {
    const opacity = value as number
    setNodeOpacity(opacity)
    
    if (!scene) return

    scene.meshes.forEach((mesh) => {
      if (mesh.material && mesh.name.includes('node')) {
        mesh.material.alpha = opacity
      }
    })
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Material & Lighting
      </Typography>

      {/* Display Options */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Display Options
        </Typography>
        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={wireframe}
                onChange={(e) => handleWireframeToggle(e.target.checked)}
                disabled={!scene}
              />
            }
            label="Wireframe Mode"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showEdges}
                onChange={(e) => handleEdgesToggle(e.target.checked)}
                disabled={!scene}
              />
            }
            label="Show Edges"
          />
        </Stack>
      </Box>

      {/* Lighting Control */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Ambient Light Intensity
        </Typography>
        <Slider
          value={ambientIntensity}
          min={0}
          max={1}
          step={0.1}
          marks
          valueLabelDisplay="auto"
          onChange={handleAmbientChange}
          disabled={!scene}
        />
      </Box>

      {/* Opacity Control */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Node Opacity
        </Typography>
        <Slider
          value={nodeOpacity}
          min={0.1}
          max={1}
          step={0.1}
          marks
          valueLabelDisplay="auto"
          onChange={handleOpacityChange}
          disabled={!scene}
        />
      </Box>

      {/* Color Presets */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Color Schemes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Color customization coming soon
        </Typography>
      </Box>
    </Paper>
  )
}

// Made with Bob
