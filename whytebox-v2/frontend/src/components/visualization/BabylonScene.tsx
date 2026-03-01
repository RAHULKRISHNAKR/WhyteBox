/**
 * BabylonJS Scene Component
 * 
 * Core 3D scene setup with camera, lighting, and controls
 */

import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color3,
  Color4,
} from '@babylonjs/core'

interface BabylonSceneProps {
  onSceneReady?: (scene: Scene) => void
  onRender?: (scene: Scene) => void
  width?: string | number
  height?: string | number
}

export default function BabylonScene({
  onSceneReady,
  onRender,
  width = '100%',
  height = '600px',
}: BabylonSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  const engineRef = useRef<Engine | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Create engine
    const engine = new Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    })
    engineRef.current = engine

    // Create scene
    const scene = new Scene(engine)
    sceneRef.current = scene

    // Set background color
    scene.clearColor = new Color4(0.1, 0.1, 0.15, 1.0)

    // Create camera — positioned to view the X-axis layer chain from a 3/4 angle.
    // Layers are spaced ~2.5 units apart along X; for a 7-layer demo that's ~-7.5 to +7.5.
    // We target the origin (center of the chain) and orbit from a comfortable distance.
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,    // Alpha: look straight down the X-axis
      Math.PI / 3.5,   // Beta: ~51° from top — good 3/4 view
      30,              // Radius: enough to see all layers
      new Vector3(0, 0, 0), // Target: center of the chain
      scene
    )

    // Camera controls
    camera.attachControl(canvasRef.current, true)
    camera.wheelPrecision = 20  // Zoom sensitivity (lower = faster zoom)
    camera.minZ = 0.1           // Near clipping plane
    camera.maxZ = 2000          // Far clipping plane
    camera.lowerRadiusLimit = 5 // Min zoom distance
    camera.upperRadiusLimit = 200 // Max zoom distance — supports large models
    camera.panningSensibility = 30 // Pan sensitivity

    // Create lighting
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
    light.intensity = 0.7
    light.groundColor = new Color3(0.2, 0.2, 0.3)

    // Additional directional light for better depth perception
    const dirLight = new HemisphericLight('dirLight', new Vector3(1, 1, 1), scene)
    dirLight.intensity = 0.5

    // Call onSceneReady callback
    if (onSceneReady) {
      onSceneReady(scene)
    }

    // Render loop
    engine.runRenderLoop(() => {
      if (onRender) {
        onRender(scene)
      }
      scene.render()
    })

    // Handle window resize
    const handleResize = () => {
      engine.resize()
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      scene.dispose()
      engine.dispose()
    }
  }, [onSceneReady, onRender])

  return (
    <Box
      sx={{
        width,
        height,
        position: 'relative',
        '& canvas': {
          width: '100%',
          height: '100%',
          outline: 'none',
          touchAction: 'none',
        },
      }}
    >
      <canvas ref={canvasRef} />
    </Box>
  )
}

// Made with Bob
