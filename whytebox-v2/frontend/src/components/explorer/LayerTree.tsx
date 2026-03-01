/**
 * Layer Tree Component
 * 
 * Hierarchical tree view of model layers with expand/collapse
 */

import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  ExpandMore,
  ChevronRight,
  Layers,
  Info,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'

export interface LayerNode {
  id: string
  name: string
  type: string
  params: number
  inputShape: string
  outputShape: string
  children?: LayerNode[]
  metadata?: Record<string, any>
}

interface LayerTreeProps {
  layers: LayerNode[]
  selectedLayer?: string
  onLayerSelect?: (layerId: string) => void
  onLayerToggle?: (layerId: string, visible: boolean) => void
}

export default function LayerTree({
  layers,
  selectedLayer,
  onLayerSelect,
  onLayerToggle,
}: LayerTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState<Set<string>>(new Set(layers.map(l => l.id)))

  const handleExpand = (layerId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(layerId)) {
        next.delete(layerId)
      } else {
        next.add(layerId)
      }
      return next
    })
  }

  const handleVisibilityToggle = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const isVisible = !visible.has(layerId)
    setVisible(prev => {
      const next = new Set(prev)
      if (isVisible) {
        next.add(layerId)
      } else {
        next.delete(layerId)
      }
      return next
    })
    onLayerToggle?.(layerId, isVisible)
  }

  const renderLayer = (layer: LayerNode, depth: number = 0) => {
    const isExpanded = expanded.has(layer.id)
    const isSelected = selectedLayer === layer.id
    const isVisible = visible.has(layer.id)
    const hasChildren = layer.children && layer.children.length > 0

    return (
      <Box key={layer.id}>
        <ListItem
          disablePadding
          sx={{
            pl: depth * 2,
            bgcolor: isSelected ? 'action.selected' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemButton
            onClick={() => onLayerSelect?.(layer.id)}
            sx={{ py: 0.5 }}
          >
            {hasChildren && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExpand(layer.id)
                }}
                sx={{ mr: 0.5 }}
              >
                {isExpanded ? <ExpandMore /> : <ChevronRight />}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 32 }} />}
            
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Layers fontSize="small" />
            </ListItemIcon>

            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                    {layer.name}
                  </Typography>
                  <Chip
                    label={layer.type}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {layer.inputShape} → {layer.outputShape} • {formatParams(layer.params)}
                </Typography>
              }
            />

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={isVisible ? 'Hide layer' : 'Show layer'}>
                <IconButton
                  size="small"
                  onClick={(e) => handleVisibilityToggle(layer.id, e)}
                >
                  {isVisible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Layer details">
                <IconButton size="small">
                  <Info fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {layer.children!.map(child => renderLayer(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  return (
    <Paper sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Layer Hierarchy</Typography>
        <Typography variant="caption" color="text.secondary">
          {layers.length} layers • {calculateTotalParams(layers)} parameters
        </Typography>
      </Box>
      <List disablePadding>
        {layers.map(layer => renderLayer(layer))}
      </List>
    </Paper>
  )
}

function formatParams(params: number): string {
  if (params >= 1_000_000) {
    return `${(params / 1_000_000).toFixed(1)}M`
  } else if (params >= 1_000) {
    return `${(params / 1_000).toFixed(1)}K`
  }
  return params.toString()
}

function calculateTotalParams(layers: LayerNode[]): string {
  const total = layers.reduce((sum, layer) => {
    const childParams = layer.children ? calculateTotalParamsRecursive(layer.children) : 0
    return sum + layer.params + childParams
  }, 0)
  return formatParams(total)
}

function calculateTotalParamsRecursive(layers: LayerNode[]): number {
  return layers.reduce((sum, layer) => {
    const childParams = layer.children ? calculateTotalParamsRecursive(layer.children) : 0
    return sum + layer.params + childParams
  }, 0)
}

// Made with Bob
