/**
 * Model Explorer Page
 * 
 * Interactive exploration of model architecture with multiple views
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Grid,
  Paper,
  Tabs,
  Tab,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material'
import PageContainer from '@/components/common/PageContainer'
import LayerTree, { LayerNode } from '@/components/explorer/LayerTree'
import LayerDetail from '@/components/explorer/LayerDetail'
import NodeGraph from '@/components/explorer/NodeGraph'
import ModelViewer from '@/components/visualization/ModelViewer'
import { modelsApi } from '@/services/api/models'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} role="tabpanel" style={{ height: '100%' }}>
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  )
}

export default function ModelExplorer() {
  const { id } = useParams<{ id: string }>()
  const [tabValue, setTabValue] = useState(0)
  const [selectedLayer, setSelectedLayer] = useState<string>()
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())

  // Fetch model details
  const { data: model, isLoading, error } = useQuery({
    queryKey: ['model', id],
    queryFn: () => modelsApi.getModel(id!),
    enabled: !!id,
  })

  // Generate sample layer data (will be replaced with real data from backend)
  const sampleLayers: LayerNode[] = [
    {
      id: 'input',
      name: 'Input Layer',
      type: 'InputLayer',
      params: 0,
      inputShape: '(None, 224, 224, 3)',
      outputShape: '(None, 224, 224, 3)',
      metadata: {
        dtype: 'float32',
      },
    },
    {
      id: 'conv1',
      name: 'Conv2D_1',
      type: 'Conv2D',
      params: 1792,
      inputShape: '(None, 224, 224, 3)',
      outputShape: '(None, 224, 224, 64)',
      metadata: {
        filters: 64,
        kernel_size: '(3, 3)',
        strides: '(1, 1)',
        padding: 'same',
        activation: 'relu',
      },
    },
    {
      id: 'pool1',
      name: 'MaxPooling2D_1',
      type: 'MaxPooling2D',
      params: 0,
      inputShape: '(None, 224, 224, 64)',
      outputShape: '(None, 112, 112, 64)',
      metadata: {
        pool_size: '(2, 2)',
        strides: '(2, 2)',
      },
    },
    {
      id: 'conv2',
      name: 'Conv2D_2',
      type: 'Conv2D',
      params: 36928,
      inputShape: '(None, 112, 112, 64)',
      outputShape: '(None, 112, 112, 128)',
      metadata: {
        filters: 128,
        kernel_size: '(3, 3)',
        strides: '(1, 1)',
        padding: 'same',
        activation: 'relu',
      },
    },
    {
      id: 'pool2',
      name: 'MaxPooling2D_2',
      type: 'MaxPooling2D',
      params: 0,
      inputShape: '(None, 112, 112, 128)',
      outputShape: '(None, 56, 56, 128)',
      metadata: {
        pool_size: '(2, 2)',
        strides: '(2, 2)',
      },
    },
    {
      id: 'flatten',
      name: 'Flatten',
      type: 'Flatten',
      params: 0,
      inputShape: '(None, 56, 56, 128)',
      outputShape: '(None, 401408)',
    },
    {
      id: 'dense1',
      name: 'Dense_1',
      type: 'Dense',
      params: 205705216,
      inputShape: '(None, 401408)',
      outputShape: '(None, 512)',
      metadata: {
        units: 512,
        activation: 'relu',
      },
    },
    {
      id: 'dropout',
      name: 'Dropout',
      type: 'Dropout',
      params: 0,
      inputShape: '(None, 512)',
      outputShape: '(None, 512)',
      metadata: {
        rate: 0.5,
      },
    },
    {
      id: 'output',
      name: 'Output Layer',
      type: 'Dense',
      params: 5130,
      inputShape: '(None, 512)',
      outputShape: '(None, 10)',
      metadata: {
        units: 10,
        activation: 'softmax',
      },
    },
  ]

  const handleLayerSelect = (layerId: string) => {
    setSelectedLayer(layerId)
  }

  const handleLayerToggle = (layerId: string, visible: boolean) => {
    setVisibleLayers(prev => {
      const next = new Set(prev)
      if (visible) {
        next.add(layerId)
      } else {
        next.delete(layerId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    )
  }

  if (error || !model) {
    return (
      <PageContainer>
        <Alert severity="error">
          Failed to load model. Please try again.
        </Alert>
      </PageContainer>
    )
  }

  const selectedLayerData = sampleLayers.find(l => l.id === selectedLayer) || null

  return (
    <PageContainer
      title={`Explore: ${model.name}`}
      subtitle="Interactive model architecture exploration"
    >
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Chip label={model.framework.toUpperCase()} color="primary" />
        <Typography variant="body2" color="text.secondary">
          {sampleLayers.length} layers • {calculateTotalParams(sampleLayers)} parameters
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 280px)' }}>
        {/* Left Panel - Layer Tree */}
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <LayerTree
            layers={sampleLayers}
            selectedLayer={selectedLayer}
            onLayerSelect={handleLayerSelect}
            onLayerToggle={handleLayerToggle}
          />
        </Grid>

        {/* Center Panel - Visualization */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
              <Tab label="3D View" />
              <Tab label="Node Graph" />
            </Tabs>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              <TabPanel value={tabValue} index={0}>
                <ModelViewer modelId={model?.id} />
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <NodeGraph
                  layers={sampleLayers}
                  selectedLayer={selectedLayer}
                  onLayerSelect={handleLayerSelect}
                />
              </TabPanel>
            </Box>
          </Paper>
        </Grid>

        {/* Right Panel - Layer Details */}
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <LayerDetail layer={selectedLayerData} />
        </Grid>
      </Grid>
    </PageContainer>
  )
}

function calculateTotalParams(layers: LayerNode[]): string {
  const total = layers.reduce((sum, layer) => sum + layer.params, 0)
  if (total >= 1_000_000) {
    return `${(total / 1_000_000).toFixed(2)}M`
  } else if (total >= 1_000) {
    return `${(total / 1_000).toFixed(2)}K`
  }
  return total.toString()
}

// Made with Bob
