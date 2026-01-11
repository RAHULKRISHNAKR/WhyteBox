/**
 * EmbeddingVisualizer
 * Visualizes embedding layers (token embeddings, positional encodings)
 * Renders as a grid of token boxes or wave pattern for positional encoding
 */

const EmbeddingVisualizer = {
    // Default configuration
    config: {
        maxTokensToShow: 16,        // Max tokens to visualize
        tokenBoxSize: 0.3,          // Size of individual token boxes
        tokenSpacing: 0.1,          // Gap between token boxes
        embeddingDepth: 0.5,        // Depth of embedding representation
        positionalWaveAmplitude: 0.2 // Wave amplitude for positional encoding
    },

    /**
     * Visualize a token embedding layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizeEmbedding(layer, scene, position, options = {}) {
        const params = layer.parameters || {};
        const vocabSize = params.num_embeddings || params.vocab_size || 30000;
        const embeddingDim = params.embedding_dim || params.hidden_size || 768;

        // Calculate dimensions based on embedding size
        const dimensions = this._calculateEmbeddingDimensions(vocabSize, embeddingDim);

        // Get color
        const colorHex = layer.visualization?.color || '#9B59B6'; // Purple for embeddings
        const color = ColorUtils ? ColorUtils.parseColor(colorHex) : new BABYLON.Color3(0.6, 0.35, 0.71);

        // Create container mesh (main representation)
        const containerMesh = this._createEmbeddingContainer(layer.id, dimensions, color, scene);
        containerMesh.position = position.clone();

        // Add grid pattern to show token structure
        this._addTokenGrid(containerMesh, dimensions, scene);

        // Metadata
        containerMesh.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions,
            vocabSize: vocabSize,
            embeddingDim: embeddingDim
        };

        // Enable hover effects
        if (typeof GeometryUtils !== 'undefined') {
            GeometryUtils.enableHoverEffect(containerMesh, scene);
        }

        // Connection points (vertical for transformer layout)
        const connectionPoints = this._getConnectionPoints(containerMesh, dimensions);

        return {
            mesh: containerMesh,
            bounds: dimensions,
            connectionPoints: connectionPoints
        };
    },

    /**
     * Visualize positional encoding layer
     * @param {Object} layer - Layer data
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    visualizePositionalEncoding(layer, scene, position, options = {}) {
        const params = layer.parameters || {};
        const maxLen = params.max_len || params.max_position_embeddings || 512;
        const dim = params.d_model || params.hidden_size || 768;

        // Create wave-like representation
        const dimensions = {
            width: 2.5,
            height: 0.6,
            depth: 1.0
        };

        // Create base plane
        const plane = BABYLON.MeshBuilder.CreatePlane(
            layer.id,
            { width: dimensions.width, height: dimensions.height },
            scene
        );
        plane.position = position.clone();
        plane.rotation.x = -Math.PI / 6; // Slight tilt for visibility

        // Create wave pattern material using DynamicTexture
        const texture = new BABYLON.DynamicTexture(
            `${layer.id}_texture`,
            { width: 256, height: 64 },
            scene,
            false
        );

        const ctx = texture.getContext();
        this._drawWavePattern(ctx, 256, 64);
        texture.update();

        const material = new BABYLON.StandardMaterial(`${layer.id}_mat`, scene);
        material.diffuseTexture = texture;
        material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        material.backFaceCulling = false;
        plane.material = material;

        // Metadata
        plane.metadata = {
            layerId: layer.id,
            layerName: layer.name,
            layerType: layer.type,
            dimensions: dimensions,
            maxLength: maxLen,
            dimension: dim,
            isPositionalEncoding: true
        };

        return {
            mesh: plane,
            bounds: dimensions,
            connectionPoints: this._getConnectionPoints(plane, dimensions)
        };
    },

    /**
     * Calculate dimensions for embedding visualization
     * @private
     */
    _calculateEmbeddingDimensions(vocabSize, embeddingDim) {
        // Scale based on embedding dimension
        const dimScale = Math.log10(embeddingDim + 1) * 0.4;
        const vocabScale = Math.log10(vocabSize + 1) * 0.2;

        return {
            width: 2.0 + dimScale,
            height: 0.8 + vocabScale,
            depth: 0.6
        };
    },

    /**
     * Create the main embedding container mesh
     * @private
     */
    _createEmbeddingContainer(id, dimensions, color, scene) {
        const box = BABYLON.MeshBuilder.CreateBox(id, {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth
        }, scene);

        const material = new BABYLON.StandardMaterial(`${id}_mat`, scene);
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        material.alpha = 0.85;
        box.material = material;

        // Add edges
        box.enableEdgesRendering();
        box.edgesWidth = 2.0;
        box.edgesColor = new BABYLON.Color4(0.4, 0.2, 0.5, 1.0);

        return box;
    },

    /**
     * Add grid pattern to show token structure
     * @private
     */
    _addTokenGrid(parentMesh, dimensions, scene) {
        const gridCount = 8;
        const spacing = dimensions.width / gridCount;

        // Create vertical grid lines on the front face
        for (let i = 1; i < gridCount; i++) {
            const lineX = -dimensions.width / 2 + i * spacing;

            const line = BABYLON.MeshBuilder.CreateLines(
                `${parentMesh.name}_grid_${i}`,
                {
                    points: [
                        new BABYLON.Vector3(lineX, -dimensions.height / 2, dimensions.depth / 2 + 0.01),
                        new BABYLON.Vector3(lineX, dimensions.height / 2, dimensions.depth / 2 + 0.01)
                    ]
                },
                scene
            );
            line.color = new BABYLON.Color3(0.3, 0.15, 0.35);
            line.alpha = 0.5;
            line.parent = parentMesh;
        }
    },

    /**
     * Draw sinusoidal wave pattern for positional encoding
     * @private
     */
    _drawWavePattern(ctx, width, height) {
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw multiple sine waves (representing different frequencies)
        const frequencies = [1, 2, 4, 8];
        const colors = ['#e94560', '#f39c12', '#3498db', '#2ecc71'];

        frequencies.forEach((freq, idx) => {
            ctx.beginPath();
            ctx.strokeStyle = colors[idx];
            ctx.lineWidth = 2;

            for (let x = 0; x < width; x++) {
                const y = height / 2 + Math.sin((x / width) * Math.PI * 2 * freq) * (height / 4);
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        });
    },

    /**
     * Get connection points (vertical orientation for transformers)
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
    module.exports = EmbeddingVisualizer;
}
