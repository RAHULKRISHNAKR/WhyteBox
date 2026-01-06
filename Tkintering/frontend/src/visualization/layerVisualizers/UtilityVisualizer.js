/**
 * UtilityVisualizer
 * Visualizes utility layers (Flatten, Dropout, etc.) as minimal representations
 */

const UtilityVisualizer = {
    /**
     * Visualize a Flatten layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeFlatten(layer, scene, position, options = {}) {
        // Flatten is a thin cylinder (transition marker)
        const height = 0.8;
        const diameter = 0.4;

        const mesh = GeometryUtils.createCylinder(
            layer.id,
            height,
            diameter,
            scene
        );

        // Get color
        const color = ColorUtils.getDefaultLayerColor(layer.type);

        // Create material
        const material = new BABYLON.StandardMaterial(`${layer.id}_mat`, scene);
        material.diffuseColor = color;
        material.alpha = 0.7;
        material.wireframe = true; // Wire frame for minimal look
        mesh.material = material;

        // Set position
        mesh.position = position.clone();

        // Add metadata
        const dimensions = { width: diameter, height: height, depth: diameter };
        mesh.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions
        };

        // Connection points
        const connectionPoints = GeometryUtils.getConnectionPoints(mesh, dimensions);

        return {
            mesh: mesh,
            bounds: dimensions,
            connectionPoints: connectionPoints
        };
    },

    /**
     * Visualize a Dropout layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeDropout(layer, scene, position, options = {}) {
        // Dropout is a semi-transparent small box
        const dimensions = {
            width: 0.8,
            height: 0.8,
            depth: 0.8
        };

        const mesh = GeometryUtils.createBox(layer.id, dimensions, scene);

        // Get color
        const color = ColorUtils.getDefaultLayerColor(layer.type);

        // Create semi-transparent material
        const material = new BABYLON.StandardMaterial(`${layer.id}_mat`, scene);
        material.diffuseColor = color;
        material.alpha = 0.4; // Very transparent
        mesh.material = material;

        // Set position
        mesh.position = position.clone();

        // Add metadata
        mesh.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions
        };

        // Connection points
        const connectionPoints = GeometryUtils.getConnectionPoints(mesh, dimensions);

        return {
            mesh: mesh,
            bounds: dimensions,
            connectionPoints: connectionPoints
        };
    },

    // Alias for Dropout variants
    visualizeDropout2d(layer, scene, position, options = {}) {
        return this.visualizeDropout(layer, scene, position, options);
    },

    visualizeDropout3d(layer, scene, position, options = {}) {
        return this.visualizeDropout(layer, scene, position, options);
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UtilityVisualizer;
}
