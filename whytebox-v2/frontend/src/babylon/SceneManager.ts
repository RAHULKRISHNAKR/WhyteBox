import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  AbstractMesh,
} from '@babylonjs/core';
import type { Layer, VisualizationConfig } from '@/types';

export class SceneManager {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private light: HemisphericLight;
  private layerMeshes: Map<string, AbstractMesh> = new Map();
  private connectionLines: Mesh[] = [];

  constructor(canvas: HTMLCanvasElement) {
    // Initialize engine
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: import.meta.env.VITE_BABYLON_ANTIALIAS === 'true',
      adaptToDeviceRatio: import.meta.env.VITE_BABYLON_ADAPTIVE_DEVICE_RATIO === 'true',
    });

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.95, 0.95, 0.97, 1);

    // Setup camera
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 50;
    this.camera.wheelPrecision = 50;

    // Setup lighting
    this.light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    this.light.intensity = 0.8;

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  /**
   * Visualize neural network layers
   */
  visualizeLayers(layers: Layer[], config: VisualizationConfig): void {
    // Clear existing meshes
    this.clearScene();

    // Create layer meshes
    layers.forEach((layer, index) => {
      const mesh = this.createLayerMesh(layer, index, config);
      this.layerMeshes.set(layer.id, mesh);
    });

    // Create connections between layers
    if (config.showConnections) {
      this.createConnections(layers, config);
    }

    // Adjust camera to fit all layers
    this.fitCameraToLayers(layers);
  }

  /**
   * Create a mesh for a single layer
   */
  private createLayerMesh(layer: Layer, index: number, config: VisualizationConfig): AbstractMesh {
    const { nodeSize, layerSpacing } = config;

    // Determine layer dimensions based on output shape
    const [height, width, depth] = this.getLayerDimensions(layer.outputShape);

    // Create box mesh
    const box = MeshBuilder.CreateBox(
      layer.id,
      {
        height: height * nodeSize,
        width: width * nodeSize,
        depth: depth * nodeSize,
      },
      this.scene
    );

    // Position layer
    box.position = new Vector3(
      layer.position?.x ?? index * layerSpacing,
      layer.position?.y ?? 0,
      layer.position?.z ?? 0
    );

    // Apply material
    const material = new StandardMaterial(`mat-${layer.id}`, this.scene);
    material.diffuseColor = this.getLayerColor(layer.type, config.colorScheme);
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    material.alpha = 0.8;
    box.material = material;

    // Add hover interaction
    box.actionManager = this.createLayerActions(layer);

    return box;
  }

  /**
   * Create connections between layers
   */
  private createConnections(layers: Layer[], config: VisualizationConfig): void {
    for (let i = 0; i < layers.length - 1; i++) {
      const currentMesh = this.layerMeshes.get(layers[i].id);
      const nextMesh = this.layerMeshes.get(layers[i + 1].id);

      if (currentMesh && nextMesh) {
        const line = MeshBuilder.CreateLines(
          `connection-${i}`,
          {
            points: [currentMesh.position, nextMesh.position],
          },
          this.scene
        );

        const material = new StandardMaterial(`line-mat-${i}`, this.scene);
        material.emissiveColor = new Color3(0.5, 0.5, 0.5);
        line.color = new Color3(0.5, 0.5, 0.5);

        this.connectionLines.push(line);
      }
    }
  }

  /**
   * Get layer dimensions from output shape
   */
  private getLayerDimensions(outputShape: number[]): [number, number, number] {
    if (outputShape.length === 1) {
      return [1, 1, Math.min(outputShape[0], 10)];
    } else if (outputShape.length === 2) {
      return [1, Math.min(outputShape[0], 10), Math.min(outputShape[1], 10)];
    } else if (outputShape.length === 3) {
      return [
        Math.min(outputShape[0], 10),
        Math.min(outputShape[1], 10),
        Math.min(outputShape[2], 10),
      ];
    }
    return [1, 1, 1];
  }

  /**
   * Get color for layer type
   */
  private getLayerColor(layerType: string, colorScheme: string): Color3 {
    const colorMap: Record<string, Color3> = {
      conv: new Color3(0.2, 0.6, 0.9),
      pool: new Color3(0.9, 0.5, 0.2),
      dense: new Color3(0.5, 0.9, 0.3),
      dropout: new Color3(0.9, 0.3, 0.5),
      batch_norm: new Color3(0.7, 0.3, 0.9),
      activation: new Color3(0.9, 0.9, 0.3),
      default: new Color3(0.6, 0.6, 0.6),
    };

    return colorMap[layerType.toLowerCase()] || colorMap.default;
  }

  /**
   * Create action manager for layer interactions
   */
  private createLayerActions(layer: Layer): any {
    // This will be implemented with proper action manager
    // For now, return null
    return null;
  }

  /**
   * Fit camera to view all layers
   */
  private fitCameraToLayers(layers: Layer[]): void {
    if (layers.length === 0) return;

    const positions = Array.from(this.layerMeshes.values()).map((mesh) => mesh.position);
    const center = positions.reduce(
      (acc, pos) => acc.add(pos),
      Vector3.Zero()
    ).scale(1 / positions.length);

    this.camera.setTarget(center);
    this.camera.radius = Math.max(10, layers.length * 2);
  }

  /**
   * Highlight a specific layer
   */
  highlightLayer(layerId: string): void {
    const mesh = this.layerMeshes.get(layerId);
    if (mesh && mesh.material instanceof StandardMaterial) {
      mesh.material.emissiveColor = new Color3(0.3, 0.3, 0.3);
    }
  }

  /**
   * Remove highlight from a layer
   */
  unhighlightLayer(layerId: string): void {
    const mesh = this.layerMeshes.get(layerId);
    if (mesh && mesh.material instanceof StandardMaterial) {
      mesh.material.emissiveColor = new Color3(0, 0, 0);
    }
  }

  /**
   * Clear all meshes from scene
   */
  private clearScene(): void {
    this.layerMeshes.forEach((mesh) => mesh.dispose());
    this.layerMeshes.clear();

    this.connectionLines.forEach((line) => line.dispose());
    this.connectionLines = [];
  }

  /**
   * Update visualization config
   */
  updateConfig(config: Partial<VisualizationConfig>): void {
    // This will be implemented to update visualization settings
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(): Promise<string> {
    return new Promise((resolve) => {
      this.engine.onEndFrameObservable.addOnce(() => {
        const screenshot = this.scene.getEngine().getRenderingCanvas()?.toDataURL();
        resolve(screenshot || '');
      });
    });
  }

  /**
   * Dispose scene and engine
   */
  dispose(): void {
    this.clearScene();
    this.scene.dispose();
    this.engine.dispose();
  }

  /**
   * Get scene instance
   */
  getScene(): Scene {
    return this.scene;
  }

  /**
   * Get engine instance
   */
  getEngine(): Engine {
    return this.engine;
  }
}

// Made with Bob
