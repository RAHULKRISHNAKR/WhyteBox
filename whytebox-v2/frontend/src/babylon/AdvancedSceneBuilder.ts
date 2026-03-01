/**
 * AdvancedSceneBuilder — Professional TensorSpace-Quality 3D Visualization
 *
 * Design principles:
 *
 * 1. ADAPTIVE LAYOUT
 *    - Small models (≤20 layers): full detail, 3.0 unit spacing along X
 *    - Medium models (21–60 layers): reduced detail, 2.0 unit spacing
 *    - Large models (>60 layers): LOD mode — only show one representative
 *      mesh per category-block, 1.5 unit spacing
 *
 * 2. DISTINCT SHAPES PER LAYER TYPE (v1 quality)
 *    Conv      → blue rectangular prism, height ∝ log(channels)
 *    Pool      → flat orange prism (50% height of conv)
 *    Linear    → tall green column, height ∝ log(units)
 *    Activation→ small red icosphere
 *    BatchNorm → thin purple transparent slab
 *    Flatten   → wireframe gray cylinder
 *    Dropout   → semi-transparent gray box
 *    Input     → bright green glowing cube
 *    Output    → bright orange glowing box
 *    Default   → gray box
 *
 * 3. FEATURE MAP EXPANSION (TensorSpace-style)
 *    - Click any Conv/Pool/Linear layer → expands into a grid of textured planes
 *    - Planes expand in the Z-direction (toward camera) so they don't overlap neighbors
 *    - Max 16 feature maps shown (performance)
 *    - Each plane: viridis colormap heatmap texture (64×64)
 *    - Animation uses scene.registerBeforeRender (BabylonJS-native, no rAF jank)
 *    - Click again → animated collapse
 *
 * 4. CONNECTIONS
 *    Sequential → thin gray line between layer edges
 *    Skip       → curved orange Bezier arc (arcs upward in Y)
 *
 * 5. CAMERA
 *    Layers along X-axis, centered at origin.
 *    Camera radius auto-scales to model width.
 */

import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  Mesh,
  HighlightLayer,
  ActionManager,
  ExecuteCodeAction,
  DynamicTexture,
} from '@babylonjs/core'
import type { ArchitectureLayer } from '@/types/api'
import type { VisualizationMode } from '@/components/visualization/VisualizationModeControls'

// ─── Public API ───────────────────────────────────────────────────────────────

export interface BuildSceneOptions {
  mode: VisualizationMode
  animateFlow: boolean
  animationSpeed: number
  lodThreshold: number
  showLabels: boolean
  gradientMagnitudes?: Record<string, number>
  activationData?: Record<string, number[][]>
  onLayerClick: (layer: ArchitectureLayer) => void
}

export interface SceneObjects {
  meshMap: Map<string, Mesh[]>
  particles: never[]
  dispose: () => void
}

// ─── Adaptive layout thresholds ───────────────────────────────────────────────
const SPACING_FULL   = 3.0   // ≤20 layers
const SPACING_MEDIUM = 2.0   // 21–60 layers
const SPACING_LOD    = 1.5   // >60 layers

// Feature map limits
const FM_MAX_MAPS    = 16    // max feature map planes shown
const FM_PLANE_SIZE  = 0.55  // size of each feature map plane (visible relative to layer mesh ~0.8 units)
const FM_GAP         = 0.08  // gap between planes
const FM_Z_OFFSET    = 3.5   // how far forward (Z) the grid expands (toward camera, away from layer mesh)

// ─── Layer colour palette ─────────────────────────────────────────────────────
const LAYER_COLORS: Record<string, string> = {
  Conv1d: '#4A90E2', Conv2d: '#4A90E2', Conv3d: '#4A90E2',
  ConvTranspose2d: '#5BA3F2', ConvTranspose1d: '#5BA3F2',
  MaxPool1d: '#F5A623', MaxPool2d: '#F5A623', MaxPool3d: '#F5A623',
  AvgPool1d: '#F5A623', AvgPool2d: '#F5A623', AvgPool3d: '#F5A623',
  AdaptiveAvgPool2d: '#F5A623', AdaptiveMaxPool2d: '#F5A623',
  Linear: '#50C878', Dense: '#50C878',
  ReLU: '#FF6B6B', ReLU6: '#FF6B6B', Sigmoid: '#FF8C8C',
  Tanh: '#FFA0A0', Softmax: '#FFB4B4', LeakyReLU: '#FF7B7B',
  ELU: '#FF9B9B', GELU: '#FF8080', SiLU: '#FF7070', Mish: '#FF6060',
  BatchNorm1d: '#BD10E0', BatchNorm2d: '#BD10E0', BatchNorm3d: '#BD10E0',
  LayerNorm: '#CD20F0', GroupNorm: '#DD30FF', InstanceNorm2d: '#CC00EE',
  Dropout: '#95A5A6', Dropout2d: '#95A5A6', Dropout3d: '#95A5A6',
  Flatten: '#7F8C8D', Reshape: '#A5B5B6',
  Input: '#27AE60', Output: '#E67E22',
}

function hexToColor3(hex: string): Color3 {
  const h = hex.replace('#', '')
  return new Color3(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  )
}

function getLayerColor(layer: ArchitectureLayer): Color3 {
  if (layer.color && layer.color !== '#CCCCCC' && layer.color !== '#cccccc') {
    return hexToColor3(layer.color)
  }
  return hexToColor3(LAYER_COLORS[layer.type] ?? '#AAAAAA')
}

// ─── Dimension calculators ────────────────────────────────────────────────────

interface Dims { width: number; height: number; depth: number }

function calcConvDims(layer: ArchitectureLayer): Dims {
  const out = layer.output_shape ?? []
  let channels = 1, spatialH = 1, spatialW = 1
  if (out.length >= 4) {
    channels = out[1] ?? 1; spatialH = out[2] ?? 1; spatialW = out[3] ?? 1
  } else if (out.length === 3) {
    channels = out[0] ?? 1; spatialH = out[1] ?? 1; spatialW = out[2] ?? 1
  }
  const chScale  = Math.log10(channels + 1) * 0.5 + 0.8
  const spScale  = Math.log10(Math.max(spatialH, spatialW) + 1) * 0.25
  return { width: 0.9 + spScale, height: chScale, depth: 0.7 + spScale * 0.7 }
}

function calcDenseDims(layer: ArchitectureLayer): Dims {
  const out = layer.output_shape ?? []
  const cfg = layer.config as Record<string, unknown>
  let units = (cfg.out_features as number | undefined) ?? 1
  if (out.length >= 1) units = out[out.length - 1] ?? units
  const height = Math.log10(units + 1) * 1.2 + 0.8
  return { width: 0.6, height, depth: 0.6 }
}

function getDims(layer: ArchitectureLayer): Dims {
  const t = layer.type
  if (t.startsWith('Conv'))                                         return calcConvDims(layer)
  if (t.includes('Pool'))                                           return { ...calcConvDims(layer), height: calcConvDims(layer).height * 0.5 }
  if (t === 'Linear' || t === 'Dense')                              return calcDenseDims(layer)
  if (t.includes('Norm') || t.includes('norm'))                     return { width: 1.0, height: 0.25, depth: 1.0 }
  if (t === 'ReLU' || t === 'ReLU6' || t === 'Sigmoid' ||
      t === 'Tanh' || t === 'Softmax' || t === 'LeakyReLU' ||
      t === 'ELU' || t === 'GELU' || t === 'SiLU' || t === 'Mish') return { width: 0.5, height: 0.5, depth: 0.5 }
  if (t === 'Flatten')                                              return { width: 0.35, height: 0.7, depth: 0.35 }
  if (t.includes('Dropout'))                                        return { width: 0.7, height: 0.7, depth: 0.7 }
  if (t === 'Input')                                                return { width: 1.2, height: 1.2, depth: 1.2 }
  if (t === 'Output' || t === 'Output1d') {
    const out = layer.output_shape ?? []
    const n = out.length >= 1 ? (out[out.length - 1] ?? 1) : 1
    return { width: 0.8, height: Math.log10(n + 1) * 0.8 + 0.8, depth: 0.8 }
  }
  return { width: 0.8, height: 0.8, depth: 0.8 }
}

// ─── Viridis colormap ─────────────────────────────────────────────────────────
function viridisRGB(t: number): [number, number, number] {
  const stops: Array<[number, number, number]> = [
    [68,  1,   84],
    [59,  82,  139],
    [33,  145, 140],
    [94,  201, 98],
    [253, 231, 37],
  ]
  const s = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const lo = Math.floor(s), hi = Math.min(lo + 1, stops.length - 1)
  const f = s - lo
  const a = stops[lo], b = stops[hi]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ]
}

/**
 * Paint a viridis heatmap directly into a BabylonJS DynamicTexture.
 *
 * Why DynamicTexture instead of new Texture(dataURL)?
 * BabylonJS 6+ Texture constructor treats the first arg as a URL and
 * schedules an async XHR/fetch load. Data URLs work in some browsers but
 * fail silently in others (CORS, mipmap generation, timing). DynamicTexture
 * is the correct BabylonJS API for programmatically-generated pixel data:
 * it creates a WebGL texture synchronously and exposes a real
 * CanvasRenderingContext2D via getContext().
 *
 * Robustness: if DynamicTexture.getContext() returns null (can happen in
 * some BabylonJS 6 builds before the texture is fully initialised), we fall
 * back to a standalone HTMLCanvasElement and drawImage() the result in.
 */
function paintHeatmapTexture(
  scene: Scene,
  name: string,
  data: number[] | number[][] | null,
  size: number,
  phase: number,
): DynamicTexture {
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, false)
  tex.hasAlpha = false

  // ── Flatten 2D activation map → 1D if needed ──────────────────────────────
  let flat: number[] | null = null
  if (data) {
    if (data.length > 0 && Array.isArray(data[0])) {
      flat = (data as number[][]).flat()
    } else {
      flat = data as number[]
    }
  }

  // ── Build pixel data on a standalone canvas (avoids ICanvasRenderingContext
  //    abstraction issues in BabylonJS 6 where createImageData may be absent) ─
  const offscreen = document.createElement('canvas')
  offscreen.width  = size
  offscreen.height = size
  const ctx2d = offscreen.getContext('2d')!
  const img   = ctx2d.createImageData(size, size)
  const px    = img.data

  if (flat && flat.length > 0) {
    // Real activation data — map to viridis colormap
    let min = flat[0], max = flat[0]
    for (const v of flat) { if (v < min) min = v; if (v > max) max = v }
    const range = max - min || 1
    // Treat flat array as a square-ish 2D grid
    const side = Math.round(Math.sqrt(flat.length))
    const cols = Math.max(1, Math.ceil(flat.length / side))
    const rows = Math.max(1, side)
    for (let py = 0; py < size; py++) {
      for (let pxc = 0; pxc < size; pxc++) {
        const dx  = Math.floor((pxc / size) * cols)
        const dy  = Math.floor((py  / size) * rows)
        const idx = dy * cols + dx
        const t   = idx < flat.length ? (flat[idx] - min) / range : 0
        const [r, g, b] = viridisRGB(t)
        const pi = (py * size + pxc) * 4
        px[pi] = r; px[pi + 1] = g; px[pi + 2] = b; px[pi + 3] = 255
      }
    }
  } else {
    // Synthetic placeholder: sine-wave activation pattern (shown before real data arrives)
    const freq = 3.0 + phase * 2.0
    for (let py = 0; py < size; py++) {
      for (let pxc = 0; pxc < size; pxc++) {
        const nx = pxc / size
        const ny = py  / size
        const wave = Math.sin(nx * Math.PI * freq + phase * 2.5) *
                     Math.sin(ny * Math.PI * freq + phase * 1.8)
        const t = Math.max(0, Math.min(1, (wave + 1) * 0.5 * (0.3 + phase * 0.6)))
        const [r, g, b] = viridisRGB(t)
        const pi = (py * size + pxc) * 4
        px[pi] = r; px[pi + 1] = g; px[pi + 2] = b; px[pi + 3] = 255
      }
    }
  }

  // Upload pixel data to the offscreen canvas, then blit into the DynamicTexture
  ctx2d.putImageData(img, 0, 0)

  // Try the BabylonJS-native path first (getContext → putImageData → update)
  try {
    const bjsCtx = tex.getContext() as CanvasRenderingContext2D | null
    if (bjsCtx && typeof bjsCtx.putImageData === 'function') {
      bjsCtx.putImageData(img, 0, 0)
    } else {
      // Fallback: draw the offscreen canvas into the BabylonJS context
      const bjsCtx2 = tex.getContext() as CanvasRenderingContext2D | null
      if (bjsCtx2 && typeof bjsCtx2.drawImage === 'function') {
        bjsCtx2.drawImage(offscreen, 0, 0)
      }
    }
  } catch {
    // Last resort: draw offscreen canvas into BabylonJS context via drawImage
    try {
      const bjsCtx = tex.getContext() as CanvasRenderingContext2D | null
      bjsCtx?.drawImage?.(offscreen, 0, 0)
    } catch { /* ignore */ }
  }

  // update() uploads the canvas pixels to the WebGL texture — REQUIRED after any ctx paint
  tex.update()
  return tex
}

/**
 * Re-paint the heatmap textures of an already-expanded layer with new activation data.
 * Called when activations arrive asynchronously after the user has already expanded a layer.
 */
function repaintExpansionTextures(
  layerId: string,
  activationData: Record<string, number[][]>,
): void {
  const state = expansionMap.get(layerId)
  if (!state) return
  const channels = activationData[layerId]
  if (!channels) return

  state.fmEntries.forEach((fm, i) => {
    const mat = fm.mesh.material as StandardMaterial | null
    if (!mat) return
    const oldTex = mat.emissiveTexture as DynamicTexture | null
    if (!oldTex) return

    const channelData = channels[i] ?? null
    const size = oldTex.getSize().width || 64
    const phase = i / Math.max(state.fmEntries.length - 1, 1)

    // Re-paint in-place: flatten, paint offscreen, blit into existing DynamicTexture
    let flat: number[] | null = null
    if (channelData) {
      flat = Array.isArray(channelData[0])
        ? (channelData as unknown as number[][]).flat()
        : (channelData as number[])
    }

    const offscreen = document.createElement('canvas')
    offscreen.width  = size
    offscreen.height = size
    const ctx2d = offscreen.getContext('2d')!
    const imgData = ctx2d.createImageData(size, size)
    const px = imgData.data

    if (flat && flat.length > 0) {
      let min = flat[0], max = flat[0]
      for (const v of flat) { if (v < min) min = v; if (v > max) max = v }
      const range = max - min || 1
      const side = Math.round(Math.sqrt(flat.length))
      const cols = Math.max(1, Math.ceil(flat.length / side))
      const rows = Math.max(1, side)
      for (let py = 0; py < size; py++) {
        for (let pxc = 0; pxc < size; pxc++) {
          const dx  = Math.floor((pxc / size) * cols)
          const dy  = Math.floor((py  / size) * rows)
          const idx = dy * cols + dx
          const t   = idx < flat.length ? (flat[idx] - min) / range : 0
          const [r, g, b] = viridisRGB(t)
          const pi = (py * size + pxc) * 4
          px[pi] = r; px[pi + 1] = g; px[pi + 2] = b; px[pi + 3] = 255
        }
      }
    } else {
      const freq = 3.0 + phase * 2.0
      for (let py = 0; py < size; py++) {
        for (let pxc = 0; pxc < size; pxc++) {
          const nx = pxc / size
          const ny = py  / size
          const wave = Math.sin(nx * Math.PI * freq + phase * 2.5) *
                       Math.sin(ny * Math.PI * freq + phase * 1.8)
          const t = Math.max(0, Math.min(1, (wave + 1) * 0.5 * (0.3 + phase * 0.6)))
          const [r, g, b] = viridisRGB(t)
          const pi = (py * size + pxc) * 4
          px[pi] = r; px[pi + 1] = g; px[pi + 2] = b; px[pi + 3] = 255
        }
      }
    }

    ctx2d.putImageData(imgData, 0, 0)
    try {
      const bjsCtx = oldTex.getContext() as CanvasRenderingContext2D | null
      if (bjsCtx && typeof bjsCtx.putImageData === 'function') {
        bjsCtx.putImageData(imgData, 0, 0)
      } else if (bjsCtx && typeof bjsCtx.drawImage === 'function') {
        bjsCtx.drawImage(offscreen, 0, 0)
      }
    } catch { /* ignore */ }
    oldTex.update()
  })
}

// ─── Mesh factory ─────────────────────────────────────────────────────────────

function createLayerMesh(scene: Scene, layer: ArchitectureLayer, pos: Vector3): Mesh {
  const t = layer.type
  const color = getLayerColor(layer)
  const dims = getDims(layer)

  // Activation → icosphere
  if (t === 'ReLU' || t === 'ReLU6' || t === 'Sigmoid' || t === 'Tanh' ||
      t === 'Softmax' || t === 'LeakyReLU' || t === 'ELU' ||
      t === 'GELU' || t === 'SiLU' || t === 'Mish') {
    const mesh = MeshBuilder.CreateIcoSphere(`layer_${layer.id}`, { radius: 0.28, subdivisions: 2 }, scene)
    mesh.position = pos.clone()
    const mat = new StandardMaterial(`mat_${layer.id}`, scene)
    mat.diffuseColor = color
    mat.emissiveColor = color.scale(0.15)
    mat.alpha = 0.95
    mesh.material = mat
    return mesh
  }

  // Flatten → wireframe cylinder
  if (t === 'Flatten') {
    const mesh = MeshBuilder.CreateCylinder(`layer_${layer.id}`, { height: 0.7, diameter: 0.35, tessellation: 10 }, scene)
    mesh.position = pos.clone()
    const mat = new StandardMaterial(`mat_${layer.id}`, scene)
    mat.diffuseColor = color
    mat.wireframe = true
    mat.alpha = 0.8
    mesh.material = mat
    return mesh
  }

  // Normalization → thin transparent slab
  if (t.includes('Norm') || t.includes('norm')) {
    const mesh = MeshBuilder.CreateBox(`layer_${layer.id}`, { width: dims.width, height: dims.height, depth: dims.depth }, scene)
    mesh.position = pos.clone()
    const mat = new StandardMaterial(`mat_${layer.id}`, scene)
    mat.diffuseColor = color
    mat.alpha = 0.5
    mesh.material = mat
    mesh.enableEdgesRendering()
    mesh.edgesWidth = 1.5
    mesh.edgesColor = new Color4(color.r, color.g, color.b, 0.9)
    return mesh
  }

  // Dropout → semi-transparent box
  if (t.includes('Dropout')) {
    const mesh = MeshBuilder.CreateBox(`layer_${layer.id}`, { width: dims.width, height: dims.height, depth: dims.depth }, scene)
    mesh.position = pos.clone()
    const mat = new StandardMaterial(`mat_${layer.id}`, scene)
    mat.diffuseColor = color
    mat.alpha = 0.3
    mesh.material = mat
    return mesh
  }

  // Input → green glowing cube
  if (t === 'Input') {
    const mesh = MeshBuilder.CreateBox(`layer_${layer.id}`, { width: dims.width, height: dims.height, depth: dims.depth }, scene)
    mesh.position = pos.clone()
    const mat = new StandardMaterial(`mat_${layer.id}`, scene)
    mat.diffuseColor = new Color3(0.2, 0.85, 0.35)
    mat.emissiveColor = new Color3(0.05, 0.25, 0.08)
    mat.alpha = 0.92
    mesh.material = mat
    mesh.enableEdgesRendering()
    mesh.edgesWidth = 3.0
    mesh.edgesColor = new Color4(0.2, 1.0, 0.3, 1.0)
    return mesh
  }

  // Output → orange glowing box
  if (t === 'Output' || t === 'Output1d') {
    const mesh = MeshBuilder.CreateBox(`layer_${layer.id}`, { width: dims.width, height: dims.height, depth: dims.depth }, scene)
    mesh.position = pos.clone()
    const mat = new StandardMaterial(`mat_${layer.id}`, scene)
    mat.diffuseColor = new Color3(0.95, 0.5, 0.15)
    mat.emissiveColor = new Color3(0.3, 0.12, 0.02)
    mat.alpha = 0.95
    mesh.material = mat
    mesh.enableEdgesRendering()
    mesh.edgesWidth = 3.0
    mesh.edgesColor = new Color4(1.0, 0.6, 0.15, 1.0)
    return mesh
  }

  // All others (Conv, Pool, Dense, etc.) → solid box with edges
  const mesh = MeshBuilder.CreateBox(`layer_${layer.id}`, { width: dims.width, height: dims.height, depth: dims.depth }, scene)
  mesh.position = pos.clone()
  const mat = new StandardMaterial(`mat_${layer.id}`, scene)
  mat.diffuseColor = color
  mat.specularColor = new Color3(0.15, 0.15, 0.15)
  mat.emissiveColor = color.scale(0.04)
  mat.alpha = 0.92
  mesh.material = mat
  mesh.enableEdgesRendering()
  mesh.edgesWidth = 1.8
  mesh.edgesColor = new Color4(0, 0, 0, 0.85)
  return mesh
}

// ─── Text label ───────────────────────────────────────────────────────────────

function createTextLabel(scene: Scene, layer: ArchitectureLayer, pos: Vector3): Mesh {
  const dims = getDims(layer)
  const plane = MeshBuilder.CreatePlane(`label_${layer.id}`, { width: 2.0, height: 0.5 }, scene)
  plane.position = new Vector3(pos.x, pos.y - dims.height / 2 - 0.45, pos.z)
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL
  plane.isPickable = false

  const dynTex = new DynamicTexture(`ltex_${layer.id}`, { width: 256, height: 64 }, scene, false)
  dynTex.hasAlpha = true
  const ctx = dynTex.getContext() as CanvasRenderingContext2D
  ctx.clearRect(0, 0, 256, 64)
  ctx.font = 'bold 17px Arial'
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const name = layer.name.length > 22 ? layer.name.slice(0, 20) + '…' : layer.name
  ctx.fillText(name, 128, 22)
  ctx.font = '12px Arial'
  ctx.fillStyle = 'rgba(160,200,255,0.8)'
  ctx.fillText(layer.type, 128, 44)
  dynTex.update()

  const mat = new StandardMaterial(`lmat_${layer.id}`, scene)
  mat.diffuseTexture = dynTex
  mat.emissiveColor = Color3.White()
  mat.disableLighting = true
  mat.backFaceCulling = false
  plane.material = mat
  return plane
}

// ─── Hover effect ─────────────────────────────────────────────────────────────

function enableHoverEffect(mesh: Mesh, scene: Scene): void {
  const mat = mesh.material as StandardMaterial | null
  if (!mat || mat.wireframe) return
  const origEmissive = mat.emissiveColor?.clone() ?? new Color3(0, 0, 0)
  const hoverEmissive = (mat.diffuseColor ?? new Color3(0.5, 0.5, 0.5)).scale(0.35)

  if (!mesh.actionManager) mesh.actionManager = new ActionManager(scene)
  mesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
      ;(mesh.material as StandardMaterial).emissiveColor = hoverEmissive
      scene.hoverCursor = 'pointer'
    })
  )
  mesh.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
      ;(mesh.material as StandardMaterial).emissiveColor = origEmissive.clone()
      scene.hoverCursor = 'default'
    })
  )
}

// ─── Feature map expansion ────────────────────────────────────────────────────
// Expands in Z-direction (toward camera) so it doesn't overlap neighboring layers.
// Uses scene.registerBeforeRender for smooth BabylonJS-native animation.

interface FMEntry {
  mesh: Mesh
  targetPos: Vector3
  startPos: Vector3
}

interface ExpansionState {
  originalMesh: Mesh
  fmEntries: FMEntry[]
  originalAlpha: number
  animStartTime: number
  animDuration: number
  animating: boolean
  collapsing: boolean
  observer: (() => void) | null
}

// Module-level expansion map (persists across rebuilds until dispose is called)
const expansionMap = new Map<string, ExpansionState>()

function supportsExpansion(layerType: string): boolean {
  return layerType.startsWith('Conv') ||
         layerType.includes('Pool') ||
         layerType === 'Linear' ||
         layerType === 'Dense'
}

function buildFeatureMaps(
  scene: Scene,
  layer: ArchitectureLayer,
  centerPos: Vector3,
  activationData?: Record<string, number[][]>,
): FMEntry[] {
  const out = layer.output_shape ?? []
  const t = layer.type
  let numMaps = 0

  if (t.startsWith('Conv') || t.includes('Pool')) {
    // output_shape: [batch, C, H, W] or [C, H, W]
    if (out.length >= 4)       numMaps = out[1] ?? 0
    else if (out.length === 3) numMaps = out[0] ?? 0
    else if (out.length === 2) numMaps = out[0] ?? 0
  } else if (t === 'Linear' || t === 'Dense') {
    numMaps = Math.min(out[out.length - 1] ?? 8, FM_MAX_MAPS)
  }

  numMaps = Math.min(numMaps, FM_MAX_MAPS)

  // If output_shape didn't give us a channel count, use the actual activation data length
  // (this happens when shape inference fails for the model)
  if (numMaps === 0 && activationData?.[layer.id]) {
    numMaps = Math.min(activationData[layer.id].length, FM_MAX_MAPS)
  }

  // Always show at least 4 maps (placeholder pattern when no real data)
  if (numMaps === 0) numMaps = 4

  const color = getLayerColor(layer)
  const cols = Math.ceil(Math.sqrt(numMaps))
  const rows = Math.ceil(numMaps / cols)
  const step = FM_PLANE_SIZE + FM_GAP

  const entries: FMEntry[] = []

  for (let i = 0; i < numMaps; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    // Center the grid in X/Y, offset in Z
    const localX = (col - (cols - 1) / 2) * step
    const localY = (row - (rows - 1) / 2) * step

    const targetPos = new Vector3(
      centerPos.x + localX,
      centerPos.y + localY,
      centerPos.z + FM_Z_OFFSET,
    )

    const plane = MeshBuilder.CreatePlane(`fm_${layer.id}_${i}`, {
      width: FM_PLANE_SIZE,
      height: FM_PLANE_SIZE,
    }, scene)
    plane.position = centerPos.clone()
    plane.scaling = new Vector3(0.01, 0.01, 0.01)
    plane.isPickable = false

    // Build texture via DynamicTexture (synchronous WebGL upload — no async URL loading)
    const texSize = 64
    const channelData = activationData?.[layer.id]?.[i] ?? null
    const tex = paintHeatmapTexture(
      scene,
      `fmtex_${layer.id}_${i}`,
      channelData,
      texSize,
      i / Math.max(numMaps - 1, 1),
    )

    const mat = new StandardMaterial(`fmmat_${layer.id}_${i}`, scene)
    // emissiveTexture renders the texture color directly without lighting wash-out.
    // diffuseColor=Black prevents the default grey diffuse from tinting the texture.
    mat.emissiveTexture = tex
    mat.emissiveColor = Color3.Black()
    mat.diffuseColor = Color3.Black()
    mat.specularColor = Color3.Black()
    mat.disableLighting = true
    mat.backFaceCulling = false
    // Start fully transparent — animation fades in
    mat.alpha = 0.0
    plane.material = mat

    // Thin colored border
    plane.enableEdgesRendering()
    plane.edgesWidth = 1.2
    plane.edgesColor = new Color4(color.r, color.g, color.b, 0.9)

    entries.push({ mesh: plane, targetPos, startPos: centerPos.clone() })
  }

  return entries
}

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3) }
function easeInCubic(t: number):  number { return t * t * t }

function startExpansionAnimation(scene: Scene, state: ExpansionState): void {
  state.animStartTime = performance.now()
  state.animating = true

  const observer = () => {
    if (!state.animating) return
    const elapsed = performance.now() - state.animStartTime
    const progress = Math.min(elapsed / state.animDuration, 1.0)

    if (state.collapsing) {
      const eased = easeInCubic(progress)
      state.fmEntries.forEach((fm) => {
        fm.mesh.position = Vector3.Lerp(fm.targetPos, fm.startPos, eased)
        const s = Math.max(0.001, 1.0 - eased)
        fm.mesh.scaling.set(s, s, s)
        ;(fm.mesh.material as StandardMaterial).alpha = 0.9 * (1 - eased)
      })
      if (progress >= 1.0) {
        state.animating = false
        // Dispose feature maps and restore original mesh
        state.fmEntries.forEach((fm) => fm.mesh.dispose())
        if (state.originalMesh.material) {
          ;(state.originalMesh.material as StandardMaterial).alpha = state.originalAlpha
        }
        expansionMap.delete(state.originalMesh.metadata?.layerId)
        scene.unregisterBeforeRender(observer)
        state.observer = null
      }
    } else {
      // Expanding
      state.fmEntries.forEach((fm, idx) => {
        const stagger = (idx / state.fmEntries.length) * 0.25
        const adj = Math.max(0, Math.min(1, (progress - stagger) / 0.75))
        const eased = easeOutCubic(adj)
        fm.mesh.position = Vector3.Lerp(fm.startPos, fm.targetPos, eased)
        const s = Math.max(0.001, eased)
        fm.mesh.scaling.set(s, s, s)
        ;(fm.mesh.material as StandardMaterial).alpha = 0.9 * eased
      })
      if (progress >= 1.0) {
        state.animating = false
        scene.unregisterBeforeRender(observer)
        state.observer = null
      }
    }
  }

  state.observer = observer
  scene.registerBeforeRender(observer)
}

function toggleExpansion(
  scene: Scene,
  layer: ArchitectureLayer,
  primaryMesh: Mesh,
  activationData?: Record<string, number[][]>,
): void {
  if (!supportsExpansion(layer.type)) return

  const existing = expansionMap.get(layer.id)

  if (existing) {
    // If new real activation data has arrived since the layer was expanded,
    // re-paint the textures in-place instead of collapsing.
    if (activationData?.[layer.id] && !existing.collapsing) {
      repaintExpansionTextures(layer.id, activationData)
      return
    }
    // Already expanded or expanding — start collapse
    if (existing.observer) {
      scene.unregisterBeforeRender(existing.observer)
      existing.observer = null
    }
    existing.collapsing = true
    existing.animDuration = 500
    startExpansionAnimation(scene, existing)
  } else {
    // Expand
    const origAlpha = (primaryMesh.material as StandardMaterial)?.alpha ?? 0.92
    const entries = buildFeatureMaps(scene, layer, primaryMesh.position, activationData)
    if (entries.length === 0) return

    const state: ExpansionState = {
      originalMesh: primaryMesh,
      fmEntries: entries,
      originalAlpha: origAlpha,
      animStartTime: 0,
      animDuration: 700,
      animating: false,
      collapsing: false,
      observer: null,
    }
    expansionMap.set(layer.id, state)

    // Fade original mesh
    if (primaryMesh.material) {
      ;(primaryMesh.material as StandardMaterial).alpha = 0.18
    }

    startExpansionAnimation(scene, state)
  }
}

// ─── Connection renderer ──────────────────────────────────────────────────────

function quadraticBezier(p0: Vector3, p1: Vector3, p2: Vector3, t: number): Vector3 {
  const u = 1 - t
  return new Vector3(
    u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z,
  )
}

function createConnection(
  scene: Scene,
  from: Vector3,
  to: Vector3,
  isSkip: boolean,
): Mesh {
  if (isSkip) {
    const mid = Vector3.Lerp(from, to, 0.5)
    const dist = Vector3.Distance(from, to)
    const ctrl = mid.add(new Vector3(0, dist * 0.3, 0))
    const pts: Vector3[] = []
    for (let i = 0; i <= 20; i++) pts.push(quadraticBezier(from, ctrl, to, i / 20))
    const curve = MeshBuilder.CreateLines(`skipc_${Math.random().toString(36).slice(2, 8)}`, { points: pts }, scene)
    curve.color = new Color3(1.0, 0.65, 0.0)
    curve.alpha = 0.75
    curve.isPickable = false
    return curve
  } else {
    const line = MeshBuilder.CreateLines(`conn_${Math.random().toString(36).slice(2, 8)}`, { points: [from, to] }, scene)
    line.color = new Color3(0.55, 0.58, 0.65)
    line.alpha = 0.45
    line.isPickable = false
    return line
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function buildAdvancedScene(
  scene: Scene,
  layers: ArchitectureLayer[],
  connections: Array<{ from: string; to: string; weight?: number }>,
  highlightLayer: HighlightLayer,
  opts: BuildSceneOptions,
): SceneObjects {
  // Clean up any previous expansion state
  expansionMap.forEach((state) => {
    if (state.observer) scene.unregisterBeforeRender(state.observer)
    state.fmEntries.forEach((fm) => fm.mesh.dispose())
  })
  expansionMap.clear()

  const meshMap = new Map<string, Mesh[]>()
  const allDisposables: Array<{ dispose(): void }> = []

  // ── Adaptive spacing ────────────────────────────────────────────────────────
  const n = layers.length
  const spacing = n <= 20 ? SPACING_FULL : n <= 60 ? SPACING_MEDIUM : SPACING_LOD

  // ── Calculate X-axis positions (centered at origin) ─────────────────────────
  const posMap = new Map<string, Vector3>()
  let currentX = 0
  const xArr: number[] = []

  layers.forEach(() => {
    xArr.push(currentX)
    currentX += spacing
  })

  const totalWidth = currentX - spacing
  const halfW = totalWidth / 2

  layers.forEach((layer, i) => {
    posMap.set(layer.id, new Vector3(xArr[i] - halfW, 0, 0))
  })

  // ── Create layer meshes ──────────────────────────────────────────────────────
  layers.forEach((layer) => {
    const pos = posMap.get(layer.id)!
    const mesh = createLayerMesh(scene, layer, pos)

    mesh.metadata = { layerId: layer.id, layerName: layer.name, layerType: layer.type, layerData: layer }

    enableHoverEffect(mesh, scene)

    if (!mesh.actionManager) mesh.actionManager = new ActionManager(scene)
    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        // Single click: select + highlight only. No auto-expansion.
        opts.onLayerClick(layer)
        highlightLayer.removeAllMeshes()
        highlightLayer.addMesh(mesh, Color3.White())
      })
    )

    meshMap.set(layer.id, [mesh])
    allDisposables.push(mesh)

    if (opts.showLabels) {
      const label = createTextLabel(scene, layer, pos)
      allDisposables.push(label)
    }
  })

  // ── Connections ──────────────────────────────────────────────────────────────
  const effectiveConns =
    connections.length > 0
      ? connections
      : layers.slice(0, -1).map((l, i) => ({ from: l.id, to: layers[i + 1].id }))

  effectiveConns.forEach(({ from, to }) => {
    const fromPos = posMap.get(from)
    const toPos   = posMap.get(to)
    if (!fromPos || !toPos) return

    const fromLayer = layers.find((l) => l.id === from)
    const toLayer   = layers.find((l) => l.id === to)
    const fromDims  = getDims(fromLayer ?? layers[0])
    const toDims    = getDims(toLayer   ?? layers[0])

    const startPt = new Vector3(fromPos.x + fromDims.width / 2, fromPos.y, fromPos.z)
    const endPt   = new Vector3(toPos.x   - toDims.width  / 2, toPos.y,   toPos.z)

    const fromIdx = layers.findIndex((l) => l.id === from)
    const toIdx   = layers.findIndex((l) => l.id === to)
    const isSkip  = Math.abs(toIdx - fromIdx) > 1

    const connMesh = createConnection(scene, startPt, endPt, isSkip)
    allDisposables.push(connMesh)
  })

  return {
    meshMap,
    particles: [],
    dispose: () => {
      expansionMap.forEach((state) => {
        if (state.observer) scene.unregisterBeforeRender(state.observer)
        state.fmEntries.forEach((fm) => fm.mesh.dispose())
      })
      expansionMap.clear()
      allDisposables.forEach((d) => d.dispose())
    },
  }
}

// ─── Public expansion API ─────────────────────────────────────────────────────
// Called from ModelViewer when the user clicks the "Expand Feature Maps" button
// in the selected-layer info panel.

export function toggleLayerExpansion(
  scene: Scene,
  layer: ArchitectureLayer,
  meshMap: Map<string, Mesh[]>,
  activationData?: Record<string, number[][]>,
): void {
  const meshes = meshMap.get(layer.id)
  if (!meshes || meshes.length === 0) return
  toggleExpansion(scene, layer, meshes[0], activationData)
}

export function isLayerExpanded(layerId: string): boolean {
  return expansionMap.has(layerId)
}

/**
 * Update activation textures for all currently-expanded layers.
 * Call this after async activation fetch completes so expanded layers
 * immediately show real convolution outputs without requiring collapse/re-expand.
 */
export function updateAllExpandedActivations(
  activationData: Record<string, number[][]>,
): void {
  expansionMap.forEach((_state, layerId) => {
    if (activationData[layerId]) {
      repaintExpansionTextures(layerId, activationData)
    }
  })
}

// Made with Bob