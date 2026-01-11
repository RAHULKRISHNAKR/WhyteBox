/**
 * AttentionLayerVisualizer
 * Visualizes multi-head attention layers
 * Shows individual attention heads as separate boxes
 */

const AttentionLayerVisualizer = {
    // Configuration
    config: {
        headBoxSize: 0.4,           // Size of each attention head box
        headSpacing: 0.15,          // Gap between head boxes
        maxHeadsPerRow: 6,          // Maximum heads in one row
        containerPadding: 0.3       // Padding around heads
    },

    /**
     * Visualize a multi-head attention layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints, headMeshes }
     */
    visualizeMultiHeadAttention(layer, scene, position, options = {}) {
        const params = layer.parameters || {};
        const numHeads = params.num_heads || params.num_attention_heads || 12;
        const headDim = params.head_dim || params.attention_head_size || 64;
        const hiddenSize = params.hidden_size || params.embed_dim || 768;

        // Calculate layout
        const layout = this._calculateHeadLayout(numHeads);
        const dimensions = this._calculateContainerDimensions(layout);

        // Create container mesh
        const container = this._createContainer(layer.id, dimensions, scene);
        container.position = position.clone();

        // Create individual head meshes
        const headMeshes = this._createHeadMeshes(
            layer.id, numHeads, layout, container, scene
        );

        // Metadata
        container.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions,
            numHeads: numHeads,
            headDim: headDim,
            hiddenSize: hiddenSize,
            headMeshes: headMeshes.map(m => m.name)
        };

        // Enable hover on container
        if (typeof GeometryUtils !== 'undefined') {
            GeometryUtils.enableHoverEffect(container, scene);
        }

        // Connection points
        const connectionPoints = this._getConnectionPoints(container, dimensions);

        return {
            mesh: container,
            bounds: dimensions,
            connectionPoints: connectionPoints,
            headMeshes: headMeshes
        };
    },

    /**
     * Visualize self-attention (same as multi-head but with different color)
     */
    visualizeSelfAttention(layer, scene, position, options = {}) {
        const result = this.visualizeMultiHeadAttention(layer, scene, position, options);

        // Change color to indicate self-attention
        if (result.mesh.material) {
            result.mesh.material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.8);
        }

        return result;
    },

    /**
     * Visualize cross-attention (encoder-decoder attention)
     */
    visualizeCrossAttention(layer, scene, position, options = {}) {
        const result = this.visualizeMultiHeadAttention(layer, scene, position, options);

        // Change color to indicate cross-attention
        if (result.mesh.material) {
            result.mesh.material.diffuseColor = new BABYLON.Color3(0.8, 0.5, 0.2);
        }

        return result;
    },

    /**
     * Calculate head layout (rows and columns)
     * @private
     */
    _calculateHeadLayout(numHeads) {
        const maxPerRow = this.config.maxHeadsPerRow;
        const cols = Math.min(numHeads, maxPerRow);
        const rows = Math.ceil(numHeads / maxPerRow);

        return { rows, cols, numHeads };
    },

    /**
     * Calculate container dimensions based on head layout
     * @private
     */
    _calculateContainerDimensions(layout) {
        const { headBoxSize, headSpacing, containerPadding } = this.config;

        const width = layout.cols * (headBoxSize + headSpacing) - headSpacing + containerPadding * 2;
        const height = layout.rows * (headBoxSize + headSpacing) - headSpacing + containerPadding * 2;

        return {
            width: width,
            height: Math.max(height, 1.0),
            depth: 0.5
        };
    },

    /**
     * Create the container mesh
     * @private
     */
    _createContainer(id, dimensions, scene) {
        const box = BABYLON.MeshBuilder.CreateBox(id, {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth
        }, scene);

        const material = new BABYLON.StandardMaterial(`${id}_mat`, scene);
        material.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.7); // Blue-ish
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.alpha = 0.4; // Semi-transparent to see heads inside
        box.material = material;

        // Edges
        box.enableEdgesRendering();
        box.edgesWidth = 1.5;
        box.edgesColor = new BABYLON.Color4(0.2, 0.3, 0.5, 1.0);

        return box;
    },

    /**
     * Create individual attention head meshes
     * @private
     */
    _createHeadMeshes(layerId, numHeads, layout, container, scene) {
        const { headBoxSize, headSpacing, containerPadding } = this.config;
        const headMeshes = [];

        // Calculate starting position (top-left of grid)
        const startX = -(layout.cols * (headBoxSize + headSpacing) - headSpacing) / 2;
        const startY = (layout.rows * (headBoxSize + headSpacing) - headSpacing) / 2;

        for (let i = 0; i < numHeads; i++) {
            const row = Math.floor(i / layout.cols);
            const col = i % layout.cols;

            // Create head box
            const headMesh = BABYLON.MeshBuilder.CreateBox(
                `${layerId}_head_${i}`,
                { width: headBoxSize, height: headBoxSize, depth: headBoxSize * 0.8 },
                scene
            );

            // Position relative to container center
            headMesh.position.x = startX + col * (headBoxSize + headSpacing) + headBoxSize / 2;
            headMesh.position.y = startY - row * (headBoxSize + headSpacing) - headBoxSize / 2;
            headMesh.position.z = 0;

            // Parent to container
            headMesh.parent = container;

            // Color gradient based on head index
            const hue = (i / numHeads) * 0.8; // 0-0.8 hue range (red to purple)
            const color = this._hslToRgb(hue, 0.7, 0.5);

            const material = new BABYLON.StandardMaterial(`${layerId}_head_${i}_mat`, scene);
            material.diffuseColor = color;
            material.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
            headMesh.material = material;

            // Edges
            headMesh.enableEdgesRendering();
            headMesh.edgesWidth = 1.0;
            headMesh.edgesColor = new BABYLON.Color4(0, 0, 0, 0.5);

            // Metadata
            headMesh.metadata = {
                headIndex: i,
                layerId: layerId,
                type: 'attention_head'
            };

            headMeshes.push(headMesh);
        }

        return headMeshes;
    },

    /**
     * Convert HSL to BabylonJS Color3
     * @private
     */
    _hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return new BABYLON.Color3(r, g, b);
    },

    /**
     * Get connection points (vertical orientation)
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
    module.exports = AttentionLayerVisualizer;
}
