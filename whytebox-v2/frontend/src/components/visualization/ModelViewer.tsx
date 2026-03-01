/**
 * ModelViewer Component — Advanced 3D Neural Network Visualization
 *
 * Supports three visualization modes:
 *   - architecture: typed 3D shapes per layer category
 *   - activation:   conv layers show stacked feature-map channel slabs
 *   - gradient:     layers coloured by gradient magnitude
 *
 * Features:
 *   - Animated data-flow particles along connections
 *   - LOD (Level of Detail) for large models
 *   - Click/hover interactions with layer detail panel
 *   - Layer list drawer
 *   - Camera controls (zoom, reset, fullscreen)
 *   - Image upload → per-layer feature map extraction
 *   - Feature map panel overlay (click layer → show feature maps)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Button,
  Tabs,
  Tab,
  Badge,
  LinearProgress,
} from '@mui/material'
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as ResetIcon,
  Fullscreen as FullscreenIcon,
  Layers as LayersIcon,
  Close as CloseIcon,
  GridView as FeatureMapIcon,
  CloudUpload as UploadIcon,
  Image as ImageIcon,
} from '@mui/icons-material'
import {
  Scene,
  Color3,
  Vector3,
  ArcRotateCamera,
  HighlightLayer,
} from '@babylonjs/core'
import { useQuery } from '@tanstack/react-query'
import BabylonScene from './BabylonScene'
import CameraControls from './CameraControls'
import VisualizationModeControls, {
  type VisualizationSettings,
} from './VisualizationModeControls'
import LayerFeatureMapViewer from './LayerFeatureMapViewer'
import {
  buildAdvancedScene,
  toggleLayerExpansion,
  isLayerExpanded,
  updateAllExpandedActivations,
  type SceneObjects,
} from '@/babylon/AdvancedSceneBuilder'
import { modelsApi } from '@/services/api/models'
import type { ArchitectureLayer, ModelArchitectureResponse } from '@/types/api'

interface ModelViewerProps {
  modelId?: string
  /** Pre-computed activation data from an external source (e.g. VisualizationPage's FeatureMapsSection).
   *  Keyed by layer name (= layer id for PyTorch models). Merged with internally-fetched data,
   *  with external data taking precedence so the 3D expand shows the same activations as the
   *  Feature Maps panel below. */
  externalActivationData?: Record<string, number[][]>
}

// ─── Fallback demo architecture ───────────────────────────────────────────────
const FALLBACK_LAYERS: ArchitectureLayer[] = [
  { id: 'l0', name: 'Input', type: 'Input', category: 'reshape', color: '#FF9800', parameters: 0, trainable: false, config: {}, input_shape: [3, 224, 224], output_shape: [3, 224, 224] },
  { id: 'l1', name: 'Conv2d-64', type: 'Conv2d', category: 'conv', color: '#2196F3', parameters: 1728, trainable: true, config: { out_channels: 64, kernel_size: 3 }, input_shape: [3, 224, 224], output_shape: [64, 224, 224] },
  { id: 'l2', name: 'ReLU', type: 'ReLU', category: 'activation', color: '#FFC107', parameters: 0, trainable: false, config: {}, input_shape: [64, 224, 224], output_shape: [64, 224, 224] },
  { id: 'l3', name: 'MaxPool2d', type: 'MaxPool2d', category: 'pooling', color: '#F44336', parameters: 0, trainable: false, config: {}, input_shape: [64, 224, 224], output_shape: [64, 112, 112] },
  { id: 'l4', name: 'Conv2d-128', type: 'Conv2d', category: 'conv', color: '#2196F3', parameters: 73728, trainable: true, config: { out_channels: 128, kernel_size: 3 }, input_shape: [64, 112, 112], output_shape: [128, 112, 112] },
  { id: 'l5', name: 'BatchNorm2d', type: 'BatchNorm2d', category: 'normalization', color: '#9C27B0', parameters: 256, trainable: true, config: { num_features: 128 }, input_shape: [128, 112, 112], output_shape: [128, 112, 112] },
  { id: 'l6', name: 'Linear', type: 'Linear', category: 'dense', color: '#009688', parameters: 4096000, trainable: true, config: { out_features: 1000 }, input_shape: [25088], output_shape: [1000] },
]

const FALLBACK_CONNECTIONS: Array<{ from: string; to: string; weight: number }> = []

const DEFAULT_SETTINGS: VisualizationSettings = {
  mode: 'architecture',
  animateFlow: false,
  animationSpeed: 1.0,
  lodThreshold: 30,
  showLabels: true,
}

// ─── Tab panel helper ─────────────────────────────────────────────────────────
interface TabPanelProps { children?: React.ReactNode; value: number; index: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box>{children}</Box> : null
}

export default function ModelViewer({ modelId, externalActivationData }: ModelViewerProps) {
  const [scene, setScene] = useState<Scene | null>(null)
  const [camera, setCamera] = useState<ArcRotateCamera | null>(null)
  const [selectedLayer, setSelectedLayer] = useState<ArchitectureLayer | null>(null)
  const [layerPanelOpen, setLayerPanelOpen] = useState(false)
  const [settings, setSettings] = useState<VisualizationSettings>(DEFAULT_SETTINGS)
  // Track expansion state so the button label updates reactively
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null)

  // Feature map state
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [featureMapLayer, setFeatureMapLayer] = useState<ArchitectureLayer | null>(null)
  const [featureMapOpen, setFeatureMapOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState(0)

  // Real activation data fetched from backend — keyed by layer.id → channel arrays
  // Shape: Record<layerId, number[][]>  where inner array is [H*W] per channel
  const [activationData, setActivationData] = useState<Record<string, number[][]>>({})
  const [activationFetching, setActivationFetching] = useState(false)

  // Merge external activation data (from VisualizationPage's FeatureMapsSection) into
  // activationData whenever it changes. External data takes precedence so the 3D expand
  // shows the same activations as the Feature Maps panel below the viewer.
  useEffect(() => {
    if (!externalActivationData || Object.keys(externalActivationData).length === 0) return
    setActivationData((prev) => ({ ...prev, ...externalActivationData }))
    // Repaint any already-expanded layers immediately
    updateAllExpandedActivations(externalActivationData)
  }, [externalActivationData])

  const highlightLayerRef = useRef<HighlightLayer | null>(null)
  const sceneObjectsRef = useRef<SceneObjects | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch architecture from API
  const {
    data: architecture,
    isLoading,
    error,
  } = useQuery<ModelArchitectureResponse>({
    queryKey: ['architecture', modelId],
    queryFn: () => modelsApi.getModelArchitecture(modelId!),
    enabled: !!modelId,
    staleTime: 5 * 60 * 1000,
  })

  const layers = architecture?.layers ?? (modelId ? [] : FALLBACK_LAYERS)
  const connections = architecture?.connections ?? FALLBACK_CONNECTIONS

  // ── Rebuild scene whenever layers or settings change ──────────────────────
  const rebuildScene = useCallback(() => {
    if (!scene || layers.length === 0) return

    sceneObjectsRef.current?.dispose()

    // Reuse the HighlightLayer created in handleSceneReady — never create a second one
    const hl = highlightLayerRef.current!
    hl.removeAllMeshes()

    const objects = buildAdvancedScene(scene, layers, connections, hl, {
      mode: settings.mode,
      animateFlow: settings.animateFlow,
      animationSpeed: settings.animationSpeed,
      lodThreshold: settings.lodThreshold,
      showLabels: settings.showLabels,
      onLayerClick: (layer: ArchitectureLayer) => {
        setSelectedLayer(layer)
      },
    })

    sceneObjectsRef.current = objects

    // Adaptive spacing mirrors AdvancedSceneBuilder constants:
    //   ≤20 layers → 3.0,  21–60 → 2.0,  >60 → 1.5
    const n = layers.length
    const spacing = n <= 20 ? 3.0 : n <= 60 ? 2.0 : 1.5
    const chainLength = (n - 1) * spacing

    const cam = scene.activeCamera as ArcRotateCamera | null
    if (cam) {
      // Radius: enough to see the full chain from a 3/4 angle
      cam.radius = Math.max(chainLength * 1.2, 25)
      cam.target = new Vector3(0, 0, 0)
    }
  }, [scene, layers, connections, settings])

  useEffect(() => {
    rebuildScene()
  }, [rebuildScene])

  const handleSceneReady = useCallback((readyScene: Scene) => {
    setScene(readyScene)
    setCamera(readyScene.activeCamera as ArcRotateCamera)
    // Create HighlightLayer once here — rebuildScene reuses it via highlightLayerRef
    // (do NOT create a second one in rebuildScene or BabylonJS will warn about duplicate names)
    highlightLayerRef.current = new HighlightLayer('hl', readyScene)
  }, [])

  const handleSettingsChange = (next: Partial<VisualizationSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }))
  }

  const handleZoomIn = () => {
    const cam = scene?.activeCamera as ArcRotateCamera | null
    if (cam?.radius !== undefined) cam.radius = Math.max(cam.radius * 0.8, cam.lowerRadiusLimit ?? 2)
  }

  const handleZoomOut = () => {
    const cam = scene?.activeCamera as ArcRotateCamera | null
    if (cam?.radius !== undefined) cam.radius = Math.min(cam.radius * 1.2, cam.upperRadiusLimit ?? 80)
  }

  const handleReset = () => {
    const cam = scene?.activeCamera as ArcRotateCamera | null
    if (cam) {
      const n = layers.length
      const spacing = n <= 20 ? 3.0 : n <= 60 ? 2.0 : 1.5
      const chainLength = (n - 1) * spacing
      cam.alpha = -Math.PI / 2
      cam.beta = Math.PI / 3.5
      cam.radius = Math.max(chainLength * 1.2, 25)
      cam.target = new Vector3(0, 0, 0)
    }
  }

  const handleFullscreen = () => {
    scene?.getEngine().getRenderingCanvas()?.requestFullscreen?.()
  }

  const handleLayerSelect = (layer: ArchitectureLayer) => {
    setSelectedLayer(layer)
    const hl = highlightLayerRef.current
    if (hl) {
      hl.removeAllMeshes()
      const meshes = sceneObjectsRef.current?.meshMap.get(layer.id) ?? []
      meshes.forEach((m) => hl.addMesh(m, Color3.White()))
    }
  }

  // ── Image upload + bulk activation fetch ────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedImage(file)
    setActivationData({})
    const url = URL.createObjectURL(file)
    setImagePreviewUrl(url)

    // If we have a model and conv layers, pre-fetch activations for all conv layers
    // so the 3D expansion shows real data immediately when the user clicks expand.
    if (modelId && layers.length > 0) {
      const convLayerList = layers.filter((l) => l.category === 'conv')
      if (convLayerList.length === 0) return

      setActivationFetching(true)
      try {
        const { inferenceApi } = await import('@/services/api/inference')
        const results = await inferenceApi.getBulkActivations(
          modelId,
          file,
          convLayerList.map((l) => l.name),
          16,
        )
        // Map layer name → layer id, then store channel arrays.
        // For real PyTorch models, layer.name === layer.id (both are the full module path
        // e.g. "features.0"), so nameToId is an identity map — but we keep it explicit
        // for correctness and future-proofing.
        const nameToId = new Map(convLayerList.map((l) => [l.name, l.id]))
        const newData: Record<string, number[][]> = {}
        for (const [layerName, result] of Object.entries(results)) {
          const layerId = nameToId.get(layerName) ?? layerName
          if (result.success && result.activation_maps) {
            // activation_maps is [channels][H][W] — flatten each channel to 1D
            newData[layerId] = result.activation_maps.map((ch) =>
              Array.isArray(ch[0]) ? (ch as number[][]).flat() : (ch as unknown as number[])
            )
          }
        }
        setActivationData(newData)
        // If any layers are already expanded (user expanded before fetch completed),
        // repaint their textures immediately with the real activation data.
        updateAllExpandedActivations(newData)
      } catch (err) {
        console.warn('Bulk activation fetch failed (non-fatal):', err)
      } finally {
        setActivationFetching(false)
      }
    }
  }

  const handleShowFeatureMaps = (layer: ArchitectureLayer) => {
    setFeatureMapLayer(layer)
    setFeatureMapOpen(true)
  }

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  // ── Conv layers for feature map list ───────────────────────────────────────
  const convLayers = layers.filter((l) => l.category === 'conv')

  return (
    <Paper sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <CircularProgress color="inherit" />
            <Typography color="white" variant="body2">Loading architecture…</Typography>
          </Stack>
        </Box>
      )}

      {/* Error banner */}
      {error && (
        <Box sx={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 10 }}>
          <Alert severity="warning" variant="filled">
            Could not load architecture — showing fallback visualization
          </Alert>
        </Box>
      )}

      <BabylonScene onSceneReady={handleSceneReady} height="600px" />

      {/* ── Right controls ── */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
        <Stack spacing={1}>
          <Tooltip title="Layer List & Feature Maps" placement="left">
            <IconButton
              onClick={() => setLayerPanelOpen(true)}
              sx={{ backgroundColor: 'background.paper', boxShadow: 2 }}
            >
              <Badge badgeContent={uploadedImage ? convLayers.length : 0} color="primary" max={99}>
                <LayersIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom In" placement="left">
            <IconButton onClick={handleZoomIn} sx={{ backgroundColor: 'background.paper', boxShadow: 2 }}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out" placement="left">
            <IconButton onClick={handleZoomOut} sx={{ backgroundColor: 'background.paper', boxShadow: 2 }}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View" placement="left">
            <IconButton onClick={handleReset} sx={{ backgroundColor: 'background.paper', boxShadow: 2 }}>
              <ResetIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fullscreen" placement="left">
            <IconButton onClick={handleFullscreen} sx={{ backgroundColor: 'background.paper', boxShadow: 2 }}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Left controls — scrollable column, max 90% viewport height ── */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1,
          maxHeight: 'calc(100% - 32px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          // Hide scrollbar visually but keep it functional
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
        }}
      >
        <Stack spacing={1}>
          <CameraControls camera={camera} onReset={handleReset} />
          <VisualizationModeControls settings={settings} onChange={handleSettingsChange} />
        </Stack>
      </Box>

      {/* ── Selected layer info panel ── */}
      {selectedLayer && (
        <Box
          sx={{
            position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1,
            backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 2, p: 2, color: 'white',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedLayer.name}
              </Typography>
              <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                <Chip
                  label={selectedLayer.type}
                  size="small"
                  sx={{ backgroundColor: selectedLayer.color, color: 'white' }}
                />
                <Chip
                  label={selectedLayer.category}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white' }}
                />
                {selectedLayer.trainable && (
                  <Chip label="trainable" size="small" color="success" />
                )}
              </Stack>
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {/* 3D expand/collapse button — for Conv/Pool/Linear layers */}
              {(() => {
                const canExpand =
                  !!scene &&
                  !!sceneObjectsRef.current &&
                  (selectedLayer.type.startsWith('Conv') ||
                   selectedLayer.type.includes('Pool') ||
                   selectedLayer.type === 'Linear' ||
                   selectedLayer.type === 'Dense')
                if (!canExpand) return null
                const isExpanded = expandedLayerId === selectedLayer.id
                const hasRealData = !!activationData[selectedLayer.id]
                return (
                  <Tooltip title={
                    isExpanded
                      ? 'Collapse 3D feature maps'
                      : hasRealData
                        ? 'Expand 3D feature maps (real activations)'
                        : 'Expand 3D feature maps (synthetic — upload image for real data)'
                  }>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!scene || !sceneObjectsRef.current) return
                        // Pass real activation data so planes show actual convolution outputs
                        toggleLayerExpansion(
                          scene,
                          selectedLayer,
                          sceneObjectsRef.current.meshMap,
                          activationData,
                        )
                        setExpandedLayerId((prev) =>
                          prev === selectedLayer.id ? null : selectedLayer.id
                        )
                      }}
                      sx={{ color: isExpanded ? '#FFD54F' : hasRealData ? '#A5D6A7' : '#90CAF9' }}
                    >
                      <FeatureMapIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )
              })()}
              {/* Feature map panel button — only for conv layers with an uploaded image */}
              {selectedLayer.category === 'conv' && modelId && uploadedImage && (
                <Tooltip title="View Feature Map Panel">
                  <IconButton
                    size="small"
                    onClick={() => handleShowFeatureMaps(selectedLayer)}
                    sx={{ color: '#80CBC4' }}
                  >
                    <FeatureMapIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton size="small" onClick={() => setSelectedLayer(null)} sx={{ color: 'white' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />

          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">Parameters</Typography>
              <Typography variant="body2">{selectedLayer.parameters.toLocaleString()}</Typography>
            </Box>
            {selectedLayer.input_shape && (
              <Box>
                <Typography variant="caption" color="rgba(255,255,255,0.6)">Input Shape</Typography>
                <Typography variant="body2">[{selectedLayer.input_shape.join(', ')}]</Typography>
              </Box>
            )}
            {selectedLayer.output_shape && (
              <Box>
                <Typography variant="caption" color="rgba(255,255,255,0.6)">Output Shape</Typography>
                <Typography variant="body2">[{selectedLayer.output_shape.join(', ')}]</Typography>
              </Box>
            )}
            {Object.entries(selectedLayer.config)
              .filter(([, v]) => v !== undefined && v !== null)
              .slice(0, 4)
              .map(([k, v]) => (
                <Box key={k}>
                  <Typography variant="caption" color="rgba(255,255,255,0.6)">{k}</Typography>
                  <Typography variant="body2">{JSON.stringify(v)}</Typography>
                </Box>
              ))}
          </Stack>

          {/* Upload prompt if no image */}
          {selectedLayer.category === 'conv' && modelId && !uploadedImage && (
            <Box mt={1}>
              <Button
                size="small"
                startIcon={<UploadIcon />}
                variant="outlined"
                onClick={() => { setLayerPanelOpen(true); setDrawerTab(1) }}
                sx={{ borderColor: 'rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}
              >
                Upload image to view feature maps
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* ── Feature map overlay ── */}
      {featureMapOpen && featureMapLayer && modelId && uploadedImage && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            maxWidth: 380,
            width: '90%',
          }}
        >
          <LayerFeatureMapViewer
            modelId={modelId}
            layerName={featureMapLayer.name}
            layerType={featureMapLayer.type}
            imageFile={uploadedImage}
            onClose={() => setFeatureMapOpen(false)}
            maxChannels={16}
            cellSize={60}
          />
        </Box>
      )}

      {/* ── Layer list drawer ── */}
      <Drawer
        anchor="right"
        open={layerPanelOpen}
        onClose={() => setLayerPanelOpen(false)}
        PaperProps={{ sx: { width: 340 } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Layers</Typography>
            <IconButton onClick={() => setLayerPanelOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          {architecture && (
            <Typography variant="caption" color="text.secondary">
              {architecture.stats.total_layers} layers ·{' '}
              {(architecture.stats.total_params / 1e6).toFixed(1)}M params
            </Typography>
          )}
        </Box>

        <Tabs
          value={drawerTab}
          onChange={(_, v) => setDrawerTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All Layers" />
          <Tab
            label={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <span>Feature Maps</span>
                {uploadedImage && (
                  <Chip label={convLayers.length} size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />
                )}
              </Stack>
            }
          />
        </Tabs>

        {/* Tab 0: All layers */}
        <TabPanel value={drawerTab} index={0}>
          <Divider />
          <List dense sx={{ overflow: 'auto' }}>
            {layers.map((layer) => (
              <ListItem key={layer.id} disablePadding>
                <ListItemButton
                  selected={selectedLayer?.id === layer.id}
                  onClick={() => {
                    handleLayerSelect(layer)
                    setLayerPanelOpen(false)
                  }}
                >
                  <Box
                    sx={{
                      width: 12, height: 12, borderRadius: '50%',
                      backgroundColor: layer.color, mr: 1.5, flexShrink: 0,
                    }}
                  />
                  <ListItemText
                    primary={layer.name}
                    secondary={`${layer.type} · ${layer.parameters.toLocaleString()} params`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  {layer.category === 'conv' && uploadedImage && modelId && (
                    <Tooltip title="View feature maps">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleShowFeatureMaps(layer)
                          setLayerPanelOpen(false)
                        }}
                      >
                        <FeatureMapIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Tab 1: Feature maps */}
        <TabPanel value={drawerTab} index={1}>
          <Box sx={{ p: 2 }}>
            {/* Image upload area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />

            {!uploadedImage ? (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <UploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="primary">
                  Click to upload an image
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  PNG, JPG, JPEG supported
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  Feature maps will be extracted for each conv layer
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {/* Preview */}
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={imagePreviewUrl ?? ''}
                    alt="Uploaded"
                    sx={{ width: '100%', borderRadius: 1, maxHeight: 160, objectFit: 'contain', backgroundColor: '#111' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      setUploadedImage(null)
                      setImagePreviewUrl(null)
                      setFeatureMapOpen(false)
                    }}
                    sx={{
                      position: 'absolute', top: 4, right: 4,
                      backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <ImageIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {uploadedImage.name}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ ml: 'auto', flexShrink: 0 }}
                  >
                    Change
                  </Button>
                </Stack>

                {/* Activation fetch progress */}
                {activationFetching && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <CircularProgress size={12} />
                      <Typography variant="caption" color="text.secondary">
                        Extracting activations from {convLayers.length} conv layers…
                      </Typography>
                    </Stack>
                    <LinearProgress variant="indeterminate" sx={{ borderRadius: 1 }} />
                  </Box>
                )}

                {/* Real data loaded indicator */}
                {!activationFetching && Object.keys(activationData).length > 0 && (
                  <Alert severity="success" variant="outlined" sx={{ py: 0.5 }}>
                    <Typography variant="caption">
                      Real activations loaded for {Object.keys(activationData).length} layers.
                      Click a conv layer in the 3D view and press the expand icon (🟢) to see them.
                    </Typography>
                  </Alert>
                )}

                <Divider />

                {/* Conv layer list for feature maps */}
                {!modelId ? (
                  <Alert severity="info" variant="outlined">
                    Select a model to view feature maps
                  </Alert>
                ) : convLayers.length === 0 ? (
                  <Alert severity="info" variant="outlined">
                    No convolutional layers found
                  </Alert>
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      Click a layer to view its feature maps ({convLayers.length} conv layers)
                    </Typography>
                    <List dense disablePadding>
                      {convLayers.map((layer) => {
                        const hasData = !!activationData[layer.id]
                        return (
                          <ListItem key={layer.id} disablePadding>
                            <ListItemButton
                              selected={featureMapLayer?.id === layer.id && featureMapOpen}
                              onClick={() => {
                                handleShowFeatureMaps(layer)
                                setLayerPanelOpen(false)
                              }}
                              sx={{ borderRadius: 1 }}
                            >
                              <Box
                                sx={{
                                  width: 10, height: 10, borderRadius: '50%',
                                  backgroundColor: layer.color, mr: 1.5, flexShrink: 0,
                                }}
                              />
                              <ListItemText
                                primary={layer.name}
                                secondary={
                                  layer.output_shape
                                    ? `${layer.output_shape[0]} ch · ${layer.output_shape.slice(1).join('×')}`
                                    : layer.type
                                }
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                              <Tooltip title={hasData ? 'Real activations ready' : 'No activation data yet'}>
                                <FeatureMapIcon
                                  fontSize="small"
                                  sx={{ ml: 1, color: hasData ? '#A5D6A7' : 'primary.main' }}
                                />
                              </Tooltip>
                            </ListItemButton>
                          </ListItem>
                        )
                      })}
                    </List>
                  </>
                )}
              </Stack>
            )}
          </Box>
        </TabPanel>
      </Drawer>
    </Paper>
  )
}

// Made with Bob
