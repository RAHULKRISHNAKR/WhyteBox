/**
 * InputOutputVisualizer
 * Visualizes input and output layers with special highlighting
 */

const InputOutputVisualizer = {
    /**
     * Visualize an Input layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeInput(layer, scene, position, options = {}) {
        // Input layers are special bordered cubes
        const inputShape = layer.input_shape || layer.output_shape || [];

        // Calculate dimensions from input shape
        let dimensions = { width: 1.5, height: 1.5, depth: 1.5 };

        if (inputShape.length >= 3) {
            const scale = 0.8;
            dimensions = {
                width: scale,
                height: Math.log10(inputShape[1] || 1 + 1) * 0.5 + scale,
                depth: scale
            };
        }

        const mesh = GeometryUtils.createBox(layer.id, dimensions, scene);

        // Create special material with glow
        const material = new BABYLON.StandardMaterial(`${layer.id}_mat`, scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.3); // Green
        material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.1);
        material.alpha = 0.9;
        mesh.material = material;

        // Add prominent edges
        mesh.enableEdgesRendering();
        mesh.edgesWidth = 3.0;
        mesh.edgesColor = new BABYLON.Color4(0.2, 1.0, 0.3, 1.0);

        // Set position
        mesh.position = position.clone();

        // Add metadata
        mesh.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions,
            isInput: true
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
     * Visualize an Output layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeOutput(layer, scene, position, options = {}) {
        // Output layers can be an array of spheres or a special box
        const outputShape = layer.output_shape || [];
        let numOutputs = 1;

        if (outputShape.length >= 2) {
            numOutputs = outputShape[outputShape.length - 1];
        }

        // For simplicity, create a single box with special highlighting
        const dimensions = {
            width: 1.0,
            height: Math.log10(numOutputs + 1) * 1.0 + 1.0,
            depth: 1.0
        };

        const mesh = GeometryUtils.createBox(layer.id, dimensions, scene);

        // Create special material with warm glow
        const material = new BABYLON.StandardMaterial(`${layer.id}_mat`, scene);
        material.diffuseColor = new BABYLON.Color3(0.9, 0.5, 0.2); // Orange
        material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        material.emissiveColor = new BABYLON.Color3(0.3, 0.15, 0.05);
        material.alpha = 0.95;
        mesh.material = material;

        // Add prominent edges
        mesh.enableEdgesRendering();
        mesh.edgesWidth = 3.0;
        mesh.edgesColor = new BABYLON.Color4(1.0, 0.6, 0.2, 1.0);

        // Set position
        mesh.position = position.clone();

        // Add metadata
        mesh.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions,
            isOutput: true
        };

        // Connection points
        const connectionPoints = GeometryUtils.getConnectionPoints(mesh, dimensions);

        return {
            mesh: mesh,
            bounds: dimensions,
            connectionPoints: connectionPoints
        };
    },

    // Alias for Output1d (common in some frameworks)
    visualizeOutput1d(layer, scene, position, options = {}) {
        return this.visualizeOutput(layer, scene, position, options);
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputOutputVisualizer;
}
