/**
 * Node Graph Component
 * 
 * Interactive node-based visualization of model architecture
 */

import { useEffect, useRef, useState } from 'react'
import { Box, Paper, Typography, IconButton, Tooltip, ButtonGroup, Button } from '@mui/material'
import { ZoomIn, ZoomOut, CenterFocusStrong, GridOn } from '@mui/icons-material'
import { LayerNode } from './LayerTree'

interface NodeGraphProps {
  layers: LayerNode[]
  selectedLayer?: string
  onLayerSelect?: (layerId: string) => void
}

interface GraphNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  layer: LayerNode
}

interface GraphEdge {
  from: string
  to: string
}

export default function NodeGraph({ layers, selectedLayer, onLayerSelect }: NodeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])

  // Layout nodes
  useEffect(() => {
    const layoutNodes: GraphNode[] = []
    const layoutEdges: GraphEdge[] = []
    
    const nodeWidth = 180
    const nodeHeight = 80
    const horizontalSpacing = 250
    const verticalSpacing = 120

    // Simple vertical layout
    layers.forEach((layer, index) => {
      layoutNodes.push({
        id: layer.id,
        x: 400,
        y: 100 + index * verticalSpacing,
        width: nodeWidth,
        height: nodeHeight,
        layer,
      })

      // Create edge to next layer
      if (index < layers.length - 1) {
        layoutEdges.push({
          from: layer.id,
          to: layers[index + 1].id,
        })
      }
    })

    setNodes(layoutNodes)
    setEdges(layoutEdges)
  }, [layers])

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply transformations
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height)
    }

    // Draw edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from)
      const toNode = nodes.find(n => n.id === edge.to)
      if (fromNode && toNode) {
        drawEdge(ctx, fromNode, toNode)
      }
    })

    // Draw nodes
    nodes.forEach(node => {
      const isSelected = node.id === selectedLayer
      drawNode(ctx, node, isSelected)
    })

    ctx.restore()
  }, [nodes, edges, zoom, pan, showGrid, selectedLayer])

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    // Check if clicking on a node
    const clickedNode = nodes.find(node =>
      x >= node.x && x <= node.x + node.width &&
      y >= node.y && y <= node.y + node.height
    )

    if (clickedNode) {
      onLayerSelect?.(clickedNode.id)
    } else {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3))
  }

  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <Paper sx={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Computational Graph</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ButtonGroup size="small">
            <Tooltip title="Zoom In">
              <Button onClick={handleZoomIn}>
                <ZoomIn fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <Button onClick={handleZoomOut}>
                <ZoomOut fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Reset View">
              <Button onClick={handleReset}>
                <CenterFocusStrong fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Toggle Grid">
              <Button onClick={() => setShowGrid(!showGrid)} variant={showGrid ? 'contained' : 'outlined'}>
                <GridOn fontSize="small" />
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Box>
      </Box>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: '100%',
          height: 'calc(100% - 64px)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />
    </Paper>
  )
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1

  const gridSize = 50
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function drawNode(ctx: CanvasRenderingContext2D, node: GraphNode, isSelected: boolean) {
  const { x, y, width, height, layer } = node

  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2

  // Draw node background
  ctx.fillStyle = isSelected ? '#1976d2' : '#ffffff'
  ctx.strokeStyle = isSelected ? '#1565c0' : '#bdbdbd'
  ctx.lineWidth = isSelected ? 3 : 2
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 8)
  ctx.fill()
  ctx.stroke()

  // Reset shadow
  ctx.shadowColor = 'transparent'

  // Draw text
  ctx.fillStyle = isSelected ? '#ffffff' : '#000000'
  ctx.font = 'bold 14px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(layer.name, x + width / 2, y + 25)

  ctx.font = '12px Arial'
  ctx.fillStyle = isSelected ? '#e3f2fd' : '#666666'
  ctx.fillText(layer.type, x + width / 2, y + 45)
  ctx.fillText(`${layer.params.toLocaleString()} params`, x + width / 2, y + 65)
}

function drawEdge(ctx: CanvasRenderingContext2D, from: GraphNode, to: GraphNode) {
  ctx.strokeStyle = '#9e9e9e'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])

  const fromX = from.x + from.width / 2
  const fromY = from.y + from.height
  const toX = to.x + to.width / 2
  const toY = to.y

  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  // Draw arrow
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const arrowSize = 10
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(
    toX - arrowSize * Math.cos(angle - Math.PI / 6),
    toY - arrowSize * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    toX - arrowSize * Math.cos(angle + Math.PI / 6),
    toY - arrowSize * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fillStyle = '#9e9e9e'
  ctx.fill()
}

// Made with Bob
