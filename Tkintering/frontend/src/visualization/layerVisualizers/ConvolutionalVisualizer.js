/**
 * ConvolutionalVisualizer
 * Visualizes convolutional layers (Conv1d, Conv2d, Conv3d) as rectangular prisms
 */

const ConvolutionalVisualizer = {
    /**
     * Visualize a Conv2d layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeConv2d(layer, scene, position, options = {}) {
        // Calculate dimensions based on output shape
        const dimensions = GeometryUtils.calculateConvDimensions(layer);

        // Get color from layer visualization data or use default
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

        // Add layer information as metadata
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

    /**
     * Visualize a Conv1d layer
     * Similar to Conv2d but thinner in depth
     */
    visualizeConv1d(layer, scene, position, options = {}) {
        const result = this.visualizeConv2d(layer, scene, position, options);

        // Make it thinner for 1D convolution
        if (result && result.mesh) {
            result.mesh.scaling.z = 0.5;
            result.bounds.depth *= 0.5;
        }

        return result;
    },

    /**
     * Visualize a Conv3d layer
     * Similar to Conv2d but larger
     */
    visualizeConv3d(layer, scene, position, options = {}) {
        const result = this.visualizeConv2d(layer, scene, position, options);

        // Make it slightly larger for 3D convolution
        if (result && result.mesh) {
            result.mesh.scaling.z = 1.2;
            result.bounds.depth *= 1.2;
        }

        return result;
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConvolutionalVisualizer;
}
