/**
 * DefaultVisualizer
 * Fallback visualizer for unknown or custom layer types
 */

const DefaultVisualizer = {
    /**
     * Visualize an unknown layer type  
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeDefault(layer, scene, position, options = {}) {
        // Default to a simple cube
        const dimensions = {
            width: 1.0,
            height: 1.0,
            depth: 1.0
        };

        // Use a neutral color
        const color = new BABYLON.Color3(0.7, 0.7, 0.7);

        const mesh = GeometryUtils.createBox(layer.id, dimensions, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`${layer.id}_mat`, scene);
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.alpha = 0.8;
        mesh.material = material;

        // Add dashed edges to indicate unknown type
        mesh.enableEdgesRendering();
        mesh.edgesWidth = 2.0;
        mesh.edgesColor = new BABYLON.Color4(0.5, 0.5, 0.5, 1.0);

        // Set position
        mesh.position = position.clone();

        // Add metadata
        mesh.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions,
            isUnknownType: true
        };

        // Enable hover effects
        GeometryUtils.enableHoverEffect(mesh, scene);

        // Connection points
        const connectionPoints = GeometryUtils.getConnectionPoints(mesh, dimensions);

        // Log warning
        console.warn(`Using default visualizer for unknown layer type: ${layer.type}`);

        return {
            mesh: mesh,
            bounds: dimensions,
            connectionPoints: connectionPoints
        };
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DefaultVisualizer;
}
