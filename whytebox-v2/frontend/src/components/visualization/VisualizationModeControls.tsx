/**
 * VisualizationModeControls
 *
 * Toolbar for switching between visualization modes:
 *   - architecture: static layer shapes (existing)
 *   - activation:   conv layers show stacked feature-map slabs
 *   - gradient:     layers coloured by gradient magnitude
 *
 * Also controls animation speed and LOD threshold.
 */

import {
  Paper,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Typography,
  Slider,
  Divider,
  Box,
} from '@mui/material'
import {
  AccountTree as ArchIcon,
  Whatshot as ActivationIcon,
  Gradient as GradientIcon,
  Animation as AnimIcon,
} from '@mui/icons-material'

export type VisualizationMode = 'architecture' | 'activation' | 'gradient'

export interface VisualizationSettings {
  mode: VisualizationMode
  animateFlow: boolean
  animationSpeed: number   // 0.5 – 3.0
  lodThreshold: number     // layer count above which LOD kicks in (default 30)
  showLabels: boolean
}

interface Props {
  settings: VisualizationSettings
  onChange: (next: Partial<VisualizationSettings>) => void
}

export default function VisualizationModeControls({ settings, onChange }: Props) {
  return (
    <Paper sx={{ p: 1.5, minWidth: 220 }}>
      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={1}>
        VISUALIZATION MODE
      </Typography>

      <ToggleButtonGroup
        value={settings.mode}
        exclusive
        onChange={(_, v) => v && onChange({ mode: v as VisualizationMode })}
        size="small"
        fullWidth
      >
        <Tooltip title="Architecture — layer shapes">
          <ToggleButton value="architecture">
            <ArchIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Activation — feature maps">
          <ToggleButton value="activation">
            <ActivationIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Gradient — attribution heatmap">
          <ToggleButton value="gradient">
            <GradientIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>

      <Divider sx={{ my: 1.5 }} />

      {/* Animated data flow toggle */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <AnimIcon fontSize="small" color={settings.animateFlow ? 'primary' : 'disabled'} />
          <Typography variant="caption">Data Flow</Typography>
        </Stack>
        <ToggleButtonGroup
          value={settings.animateFlow ? 'on' : 'off'}
          exclusive
          onChange={(_, v) => v && onChange({ animateFlow: v === 'on' })}
          size="small"
        >
          <ToggleButton value="on" sx={{ px: 1, py: 0.25, fontSize: '0.65rem' }}>ON</ToggleButton>
          <ToggleButton value="off" sx={{ px: 1, py: 0.25, fontSize: '0.65rem' }}>OFF</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Animation speed */}
      {settings.animateFlow && (
        <Box mb={1}>
          <Typography variant="caption" color="text.secondary">
            Speed: {settings.animationSpeed.toFixed(1)}×
          </Typography>
          <Slider
            value={settings.animationSpeed}
            min={0.25}
            max={3}
            step={0.25}
            size="small"
            onChange={(_, v) => onChange({ animationSpeed: v as number })}
          />
        </Box>
      )}

      {/* LOD threshold */}
      <Box>
        <Typography variant="caption" color="text.secondary">
          LOD threshold: {settings.lodThreshold} layers
        </Typography>
        <Slider
          value={settings.lodThreshold}
          min={10}
          max={100}
          step={5}
          size="small"
          onChange={(_, v) => onChange({ lodThreshold: v as number })}
        />
      </Box>
    </Paper>
  )
}

// Made with Bob