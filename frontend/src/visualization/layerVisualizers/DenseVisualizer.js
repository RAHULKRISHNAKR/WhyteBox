/**
 * DenseVisualizer
 * Visualizes dense/linear layers as tall rectangular prisms or columns
 */

const DenseVisualizer = {
    /**
     * Visualize a Dense/Linear layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeDense(layer, scene, position, options = {}) {
        // Calculate dimensions based on number of units
        const dimensions = GeometryUtils.calculateDenseDimensions(layer);

        // Get color
        const colorHex = layer.visualization?.color || null;
        const color = colorHex
            ? ColorUtils.parseColor(colorHex)
            : ColorUtils.getDefaultLayerColor(layer.type);

        // Create the box mesh
        const mesh = GeometryUtils.createLabeledBox(
            layer.id,
            dimensions,
            color,
            scene
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

        // Calculate connection points
        const connectionPoints = GeometryUtils.getConnectionPoints(mesh, dimensions);

        return {
            mesh: mesh,
            bounds: dimensions,
            connectionPoints: connectionPoints
        };
    },

    // Alias for Linear layer (PyTorch naming)
    visualizeLinear(layer, scene, position, options = {}) {
        return this.visualizeDense(layer, scene, position, options);
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DenseVisualizer;
}
