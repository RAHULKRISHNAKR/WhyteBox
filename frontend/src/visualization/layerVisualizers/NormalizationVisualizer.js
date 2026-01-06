/**
 * NormalizationVisualizer
 * Visualizes normalization layers (BatchNorm, LayerNorm) as thin transparent layers
 */

const NormalizationVisualizer = {
    /**
     * Visualize a normalization layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeNormalization(layer, scene, position, options = {}) {
        // Normalization layers are thin, wide planes
        const dimensions = {
            width: 1.2,
            height: 0.3, // Thin layer
            depth: 1.2
        };

        // Get color
        const colorHex = layer.visualization?.color || null;
        const color = colorHex
            ? ColorUtils.parseColor(colorHex)
            : ColorUtils.getDefaultLayerColor(layer.type);

        // Create the box mesh
        const mesh = GeometryUtils.createBox(layer.id, dimensions, scene);

        // Create semi-transparent material
        const material = new BABYLON.StandardMaterial(`${layer.id}_mat`, scene);
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.alpha = 0.6; // More transparent
        mesh.material = material;

        // Add thin edges
        mesh.enableEdgesRendering();
        mesh.edgesWidth = 1.5;
        mesh.edgesColor = new BABYLON.Color4(
            color.r, color.g, color.b, 0.8
        );

        // Set position
        mesh.position = position.clone();

        // Add metadata
        mesh.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions
        };

        // Enable hover effects
        GeometryUtils.enableHoverEffect(mesh, scene);

        // Connection points
        const connectionPoints = GeometryUtils.getConnectionPoints(mesh, dimensions);

        return {
            mesh: mesh,
            bounds: dimensions,
            connectionPoints: connectionPoints
        };
    },

    // Specific normalization layer visualizers
    visualizeBatchNorm2d(layer, scene, position, options = {}) {
        return this.visualizeNormalization(layer, scene, position, options);
    },

    visualizeBatchNorm1d(layer, scene, position, options = {}) {
        return this.visualizeNormalization(layer, scene, position, options);
    },

    visualizeLayerNorm(layer, scene, position, options = {}) {
        return this.visualizeNormalization(layer, scene, position, options);
    },

    visualizeGroupNorm(layer, scene, position, options = {}) {
        return this.visualizeNormalization(layer, scene, position, options);
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NormalizationVisualizer;
}
