/**
 * TransformerBlockVisualizer
 * Visualizes complete transformer blocks (encoder/decoder layers)
 * Groups sub-layers (MHA, LayerNorm, FFN) with visual boundaries
 */

const TransformerBlockVisualizer = {
    // Configuration
    config: {
        blockBorderThickness: 0.08,
        blockPadding: 0.3,
        sublayerHeight: 0.6,
        sublayerSpacing: 0.3
    },

    /**
     * Visualize a transformer encoder block
     * Contains: Self-Attention + Add&Norm + FFN + Add&Norm
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints, subLayers }
     */
    visualizeEncoderBlock(layer, scene, position, options = {}) {
        const params = layer.parameters || {};
        const numHeads = params.num_heads || 12;
        const hiddenSize = params.hidden_size || 768;
        const ffnSize = params.intermediate_size || params.dim_feedforward || 3072;

        // Define sub-layer structure
        const subLayers = [
            { type: 'self_attention', name: 'Self-Attention', color: new BABYLON.Color3(0.3, 0.5, 0.8) },
            { type: 'add_norm', name: 'Add & Norm', color: new BABYLON.Color3(0.4, 0.7, 0.4) },
            { type: 'ffn', name: 'Feed-Forward', color: new BABYLON.Color3(0.7, 0.4, 0.5) },
            { type: 'add_norm', name: 'Add & Norm', color: new BABYLON.Color3(0.4, 0.7, 0.4) }
        ];

        return this._createBlock(layer, subLayers, scene, position, 'encoder');
    },

    /**
     * Visualize a transformer decoder block
     * Contains: Masked Self-Attention + Add&Norm + Cross-Attention + Add&Norm + FFN + Add&Norm
     */
    visualizeDecoderBlock(layer, scene, position, options = {}) {
        const subLayers = [
            { type: 'masked_self_attention', name: 'Masked Self-Attention', color: new BABYLON.Color3(0.5, 0.3, 0.7) },
            { type: 'add_norm', name: 'Add & Norm', color: new BABYLON.Color3(0.4, 0.7, 0.4) },
            { type: 'cross_attention', name: 'Cross-Attention', color: new BABYLON.Color3(0.8, 0.5, 0.3) },
            { type: 'add_norm', name: 'Add & Norm', color: new BABYLON.Color3(0.4, 0.7, 0.4) },
            { type: 'ffn', name: 'Feed-Forward', color: new BABYLON.Color3(0.7, 0.4, 0.5) },
            { type: 'add_norm', name: 'Add & Norm', color: new BABYLON.Color3(0.4, 0.7, 0.4) }
        ];

        return this._createBlock(layer, subLayers, scene, position, 'decoder');
    },

    /**
     * Visualize a generic transformer layer (auto-detect encoder/decoder)
     */
    visualizeTransformerLayer(layer, scene, position, options = {}) {
        const name = layer.name?.toLowerCase() || '';
        const type = layer.type?.toLowerCase() || '';

        if (name.includes('decoder') || type.includes('decoder')) {
            return this.visualizeDecoderBlock(layer, scene, position, options);
        }
        return this.visualizeEncoderBlock(layer, scene, position, options);
    },

    /**
     * Create a block with sub-layers
     * @private
     */
    _createBlock(layer, subLayers, scene, position, blockType) {
        const { sublayerHeight, sublayerSpacing, blockPadding, blockBorderThickness } = this.config;

        // Calculate block dimensions
        const totalHeight = subLayers.length * sublayerHeight + (subLayers.length - 1) * sublayerSpacing + blockPadding * 2;
        const blockWidth = 3.0;
        const blockDepth = 0.8;

        const dimensions = {
            width: blockWidth,
            height: totalHeight,
            depth: blockDepth
        };

        // Create transparent container with border
        const container = this._createBlockContainer(layer.id, dimensions, blockType, scene);
        container.position = position.clone();

        // Create sub-layer meshes
        const sublayerMeshes = [];
        const startY = (totalHeight / 2) - blockPadding - sublayerHeight / 2;

        subLayers.forEach((sub, index) => {
            const yPos = startY - index * (sublayerHeight + sublayerSpacing);
            const mesh = this._createSubLayer(
                `${layer.id}_${sub.type}_${index}`,
                sub,
                sublayerHeight,
                blockWidth - blockPadding * 2,
                scene
            );

            mesh.position.y = yPos;
            mesh.parent = container;
            sublayerMeshes.push(mesh);
        });

        // Metadata
        container.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            blockType: blockType,
            dimensions: dimensions,
            subLayers: subLayers.map(s => s.type)
        };

        // Enable hover
        if (typeof GeometryUtils !== 'undefined') {
            GeometryUtils.enableHoverEffect(container, scene);
        }

        // Connection points
        const connectionPoints = this._getConnectionPoints(container, dimensions);

        return {
            mesh: container,
            bounds: dimensions,
            connectionPoints: connectionPoints,
            sublayerMeshes: sublayerMeshes
        };
    },

    /**
     * Create the block container with border
     * @private
     */
    _createBlockContainer(id, dimensions, blockType, scene) {
        // Create wireframe box for the block boundary
        const box = BABYLON.MeshBuilder.CreateBox(id, {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth
        }, scene);

        const material = new BABYLON.StandardMaterial(`${id}_mat`, scene);

        // Color based on block type
        if (blockType === 'encoder') {
            material.diffuseColor = new BABYLON.Color3(0.15, 0.2, 0.3);
        } else {
            material.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.15);
        }

        material.alpha = 0.2;
        material.backFaceCulling = false;
        box.material = material;

        // Add thick edges for block boundary
        box.enableEdgesRendering();
        box.edgesWidth = 3.0;

        if (blockType === 'encoder') {
            box.edgesColor = new BABYLON.Color4(0.3, 0.5, 0.8, 1.0);
        } else {
            box.edgesColor = new BABYLON.Color4(0.8, 0.5, 0.3, 1.0);
        }

        return box;
    },

    /**
     * Create a sub-layer mesh
     * @private
     */
    _createSubLayer(id, subLayerDef, height, width, scene) {
        const box = BABYLON.MeshBuilder.CreateBox(id, {
            width: width,
            height: height,
            depth: 0.4
        }, scene);

        const material = new BABYLON.StandardMaterial(`${id}_mat`, scene);
        material.diffuseColor = subLayerDef.color;
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        material.alpha = 0.85;
        box.material = material;

        // Edges
        box.enableEdgesRendering();
        box.edgesWidth = 1.5;
        box.edgesColor = new BABYLON.Color4(0, 0, 0, 0.5);

        // Metadata
        box.metadata = {
            type: subLayerDef.type,
            name: subLayerDef.name
        };

        return box;
    },

    /**
     * Get connection points (vertical)
     * @private
     */
    _getConnectionPoints(mesh, dimensions) {
        const position = mesh.position;
        const halfHeight = dimensions.height / 2;

        return {
            input: new BABYLON.Vector3(position.x, position.y + halfHeight, position.z),
            output: new BABYLON.Vector3(position.x, position.y - halfHeight, position.z)
        };
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransformerBlockVisualizer;
}
