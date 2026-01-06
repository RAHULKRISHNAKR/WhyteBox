/**
 * GeometryUtils
 * Common utilities for creating geometries
 */

class GeometryUtils {
    /**
     * Create a box with specified dimensions
     * @param {string} name - Name of the mesh
     * @param {Object} dimensions - { width, height, depth }
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @returns {BABYLON.Mesh}
     */
    static createBox(name, dimensions, scene) {
        const box = BABYLON.MeshBuilder.CreateBox(name, {
            width: dimensions.width || 1,
            height: dimensions.height || 1,
            depth: dimensions.depth || 1
        }, scene);

        return box;
    }

    /**
     * Create a labeled box with edges
     * @param {string} name - Name of the mesh
     * @param {Object} dimensions - { width, height, depth }
     * @param {BABYLON.Color3} color - Box color
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @returns {BABYLON.Mesh}
     */
    static createLabeledBox(name, dimensions, color, scene) {
        const box = this.createBox(name, dimensions, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`${name}_mat`, scene);
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.alpha = 0.9;
        box.material = material;

        // Add edges for better visibility
        box.enableEdgesRendering();
        box.edgesWidth = 2.0;
        box.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

        return box;
    }

    /**
     * Create a cylinder
     * @param {string} name - Name of the mesh
     * @param {number} height - Cylinder height
     * @param {number} diameter - Cylinder diameter
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @returns {BABYLON.Mesh}
     */
    static createCylinder(name, height, diameter, scene) {
        return BABYLON.MeshBuilder.CreateCylinder(name, {
            height: height,
            diameter: diameter
        }, scene);
    }

    /**
     * Create a sphere
     * @param {string} name - Name of the mesh
     * @param {number} diameter - Sphere diameter
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @returns {BABYLON.Mesh}
     */
    static createSphere(name, diameter, scene) {
        return BABYLON.MeshBuilder.CreateSphere(name, {
            diameter: diameter
        }, scene);
    }

    /**
     * Calculate appropriate dimensions for a convolutional layer
     * @param {Object} layer - Layer data
     * @returns {Object} { width, height, depth }
     */
    static calculateConvDimensions(layer) {
        const outputShape = layer.output_shape || [];
        const params = layer.parameters || {};

        // For Conv2d: output_shape is typically [batch, channels, height, width]
        let channels = 1, spatialHeight = 1, spatialWidth = 1;

        if (outputShape.length >= 4) {
            channels = outputShape[1] || 1;
            spatialHeight = outputShape[2] || 1;
            spatialWidth = outputShape[3] || 1;
        } else if (outputShape.length === 3) {
            channels = outputShape[0] || 1;
            spatialHeight = outputShape[1] || 1;
            spatialWidth = outputShape[2] || 1;
        }

        // Scale dimensions for visualization
        const baseSize = 1.0;
        const channelScale = Math.log10(channels + 1) * 0.5 + baseSize;
        const spatialScale = Math.log10(Math.max(spatialHeight, spatialWidth) + 1) * 0.3;

        return {
            width: baseSize + spatialScale,
            height: channelScale,
            depth: baseSize + spatialScale * 0.8
        };
    }

    /**
     * Calculate appropriate dimensions for a dense layer
     * @param {Object} layer - Layer data
     * @returns {Object} { width, height, depth }
     */
    static calculateDenseDimensions(layer) {
        const outputShape = layer.output_shape || [];
        const params = layer.parameters || {};

        // Get number of output units
        let units = params.out_features || params.units || 1;

        if (outputShape.length >= 2) {
            units = outputShape[outputShape.length - 1] || units;
        }

        // Scale height based on number of units
        const height = Math.log10(units + 1) * 1.5 + 1.0;

        return {
            width: 0.8,
            height: height,
            depth: 0.8
        };
    }

    /**
     * Create connection points for a mesh
     * @param {BABYLON.Mesh} mesh - The mesh
     * @param {Object} dimensions - { width, height, depth }
     * @returns {Object} { input: Vector3, output: Vector3 }
     */
    static getConnectionPoints(mesh, dimensions) {
        const position = mesh.position;

        return {
            input: new BABYLON.Vector3(
                position.x - dimensions.width / 2,
                position.y,
                position.z
            ),
            output: new BABYLON.Vector3(
                position.x + dimensions.width / 2,
                position.y,
                position.z
            )
        };
    }

    /**
     * Apply hover behavior to a mesh
     * @param {BABYLON.Mesh} mesh - The mesh
     * @param {BABYLON.Scene} scene - The scene
     */
    static enableHoverEffect(mesh, scene) {
        const originalColor = mesh.material?.diffuseColor?.clone();

        mesh.actionManager = new BABYLON.ActionManager(scene);

        // Hover in
        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                    if (mesh.material && mesh.material.diffuseColor) {
                        mesh.material.emissiveColor = originalColor.scale(0.3);
                    }
                }
            )
        );

        // Hover out
        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    if (mesh.material) {
                        mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                    }
                }
            )
        );
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeometryUtils;
}
