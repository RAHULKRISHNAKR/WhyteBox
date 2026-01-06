/**
 * ActivationVisualizer
 * Visualizes activation layers (ReLU, Sigmoid, etc.) as small colored markers
 */

const ActivationVisualizer = {
    /**
     * Visualize an activation layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeActivation(layer, scene, position, options = {}) {
        // Activation layers are small markers
        const size = 0.6;

        // Get color
        const colorHex = layer.visualization?.color || null;
        const color = colorHex
            ? ColorUtils.parseColor(colorHex)
            : ColorUtils.getDefaultLayerColor(layer.type);

        // Create a small sphere or icosahedron
        const mesh = BABYLON.MeshBuilder.CreateIcoSphere(layer.id, {
            radius: size / 2,
            subdivisions: 1
        }, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`${layer.id}_mat`, scene);
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        material.emissiveColor = color.scale(0.1);
        material.alpha = 0.95;
        mesh.material = material;

        // Set position
        mesh.position = position.clone();

        // Add metadata
        mesh.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: { width: size, height: size, depth: size }
        };

        // Enable hover effects
        GeometryUtils.enableHoverEffect(mesh, scene);

        // Connection points
        const dimensions = { width: size, height: size, depth: size };
        const connectionPoints = GeometryUtils.getConnectionPoints(mesh, dimensions);

        return {
            mesh: mesh,
            bounds: dimensions,
            connectionPoints: connectionPoints
        };
    },

    // Specific activation function visualizers
    visualizeReLU(layer, scene, position, options = {}) {
        return this.visualizeActivation(layer, scene, position, options);
    },

    visualizeSigmoid(layer, scene, position, options = {}) {
        return this.visualizeActivation(layer, scene, position, options);
    },

    visualizeTanh(layer, scene, position, options = {}) {
        return this.visualizeActivation(layer, scene, position, options);
    },

    visualizeSoftmax(layer, scene, position, options = {}) {
        return this.visualizeActivation(layer, scene, position, options);
    },

    visualizeLeakyReLU(layer, scene, position, options = {}) {
        return this.visualizeActivation(layer, scene, position, options);
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivationVisualizer;
}
