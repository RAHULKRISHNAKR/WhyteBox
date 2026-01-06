/**
 * PoolingVisualizer
 * Visualizes pooling layers (MaxPool, AvgPool) as flatter rectangular prisms
 */

const PoolingVisualizer = {
    /**
     * Visualize a pooling layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizePooling(layer, scene, position, options = {}) {
        // Calculate dimensions (similar to conv but flatter)
        const convDimensions = GeometryUtils.calculateConvDimensions(layer);

        // Make pooling layers flatter (50% height)
        const dimensions = {
            width: convDimensions.width,
            height: convDimensions.height * 0.5,
            depth: convDimensions.depth
        };

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

    // Specific pooling layer visualizers
    visualizeMaxPool2d(layer, scene, position, options = {}) {
        return this.visualizePooling(layer, scene, position, options);
    },

    visualizeAvgPool2d(layer, scene, position, options = {}) {
        return this.visualizePooling(layer, scene, position, options);
    },

    visualizeAdaptiveAvgPool2d(layer, scene, position, options = {}) {
        return this.visualizePooling(layer, scene, position, options);
    },

    visualizeMaxPool1d(layer, scene, position, options = {}) {
        const result = this.visualizePooling(layer, scene, position, options);
        if (result && result.mesh) {
            result.mesh.scaling.z = 0.5;
            result.bounds.depth *= 0.5;
        }
        return result;
    },

    visualizeAvgPool1d(layer, scene, position, options = {}) {
        return this.visualizeMaxPool1d(layer, scene, position, options);
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoolingVisualizer;
}
