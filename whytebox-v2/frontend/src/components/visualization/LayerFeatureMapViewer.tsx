/**
 * LayerFeatureMapViewer
 *
 * Fetches activation maps for a specific layer + image and renders
 * a FeatureMapPanel. Handles loading / error states.
 *
 * Usage:
 *   <LayerFeatureMapViewer
 *     modelId="resnet50"
 *     layerName="layer4.1.conv2"
 *     layerType="Conv2d"
 *     imageFile={file}
 *     onClose={() => setOpen(false)}
 *   />
 */

import { useState, useEffect } from 'react'
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  Stack,
} from '@mui/material'
import FeatureMapPanel from './FeatureMapPanel'
import { inferenceApi } from '@/services/api/inference'
import type { ActivationResponse } from '@/types/api'

interface LayerFeatureMapViewerProps {
  modelId: string
  layerName: string
  layerType?: string
  imageFile: File
  onClose?: () => void
  maxChannels?: number
  cellSize?: number
}

export default function LayerFeatureMapViewer({
  modelId,
  layerName,
  layerType,
  imageFile,
  onClose,
  maxChannels = 16,
  cellSize = 64,
}: LayerFeatureMapViewerProps) {
  const [data, setData] = useState<ActivationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)

    inferenceApi.getActivations(modelId, imageFile, layerName)
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to fetch activations')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [modelId, layerName, imageFile])

  if (loading) {
    return (
      <Box
        sx={{
          p: 3,
          backgroundColor: 'rgba(15,15,25,0.97)',
          borderRadius: 2,
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <CircularProgress size={32} sx={{ color: '#90CAF9' }} />
        <Stack alignItems="center" spacing={0.5}>
          <Typography variant="body2" sx={{ color: 'white' }}>
            Extracting activations…
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {layerName}
          </Typography>
        </Stack>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2, minWidth: 280 }}>
        <Alert
          severity="error"
          onClose={onClose}
          sx={{ backgroundColor: 'rgba(211,47,47,0.15)', color: 'white' }}
        >
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    )
  }

  if (!data) return null

  // activation_maps is [channels][H][W] from the backend
  const channelMaps = data.activation_maps ?? []

  return (
    <FeatureMapPanel
      layerName={layerName}
      layerType={layerType}
      channelMaps={channelMaps}
      stats={data.stats}
      maxCols={4}
      cellSize={cellSize}
      onClose={onClose}
      selectedChannel={selectedChannel}
      onChannelSelect={setSelectedChannel}
    />
  )
}

// Made with Bob