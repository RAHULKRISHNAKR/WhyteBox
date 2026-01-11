/**
 * TransformerLayout
 * Arranges transformer layers vertically (top to bottom)
 * Groups sub-layers into encoder/decoder blocks
 * Handles residual connection routing
 */

class TransformerLayout {
    // =====================================================
    // SPACING CONSTANTS
    // =====================================================
    static BLOCK_SPACING = 4.0;        // Gap between encoder/decoder blocks
    static SUBLAYER_SPACING = 1.8;     // Gap between layers within a block
    static RESIDUAL_ARC_OFFSET = 2.5;  // Curve offset for skip connections
    static BLOCK_PADDING = 0.5;        // Padding inside block bounds

    // Block type identifiers (for grouping)
    static BLOCK_TYPES = {
        ENCODER: 'encoder',
        DECODER: 'decoder',
        EMBEDDING: 'embedding',
        OUTPUT: 'output'
    };

    /**
     * Calculate positions for layers in a vertical transformer arrangement
     * @param {Array} layers - Array of layer objects
     * @param {Object} hints - Visualization hints from backend
     * @returns {Map} Map of layer IDs to Vector3 positions
     */
    static calculatePositions(layers, hints = {}) {
        const positions = new Map();

        // Get spacing from hints or use defaults
        const blockSpacing = hints.block_spacing || this.BLOCK_SPACING;
        const sublayerSpacing = hints.sublayer_spacing || this.SUBLAYER_SPACING;

        // Group layers into blocks
        const blocks = this._groupIntoBlocks(layers, hints);

        // Starting Y position (top of the model)
        let currentY = 0;

        // Position each block
        blocks.forEach((block, blockIndex) => {
            // Position all layers within this block
            this._positionBlock(block, currentY, sublayerSpacing, positions);

            // Calculate block height
            const blockHeight = block.layers.length * sublayerSpacing;

            // Move to next block position
            currentY -= blockHeight + blockSpacing;
        });

        // Center the entire layout
        this._centerLayout(positions);

        return positions;
    }

    /**
     * Group layers into logical blocks (encoder, decoder, etc.)
     * @private
     * @param {Array} layers - All layers
     * @param {Object} hints - Visualization hints
     * @returns {Array} Array of block objects { type, layers, name }
     */
    static _groupIntoBlocks(layers, hints = {}) {
        const blocks = [];
        let currentBlock = null;

        layers.forEach((layer, index) => {
            const blockType = this._inferBlockType(layer);

            // Check if we need to start a new block
            if (!currentBlock || this._shouldStartNewBlock(currentBlock, layer, blockType)) {
                // Save previous block if exists
                if (currentBlock && currentBlock.layers.length > 0) {
                    blocks.push(currentBlock);
                }

                // Start new block
                currentBlock = {
                    type: blockType,
                    name: this._getBlockName(blockType, blocks.length),
                    layers: [],
                    startIndex: index
                };
            }

            // Add layer to current block
            currentBlock.layers.push(layer);
        });

        // Don't forget the last block
        if (currentBlock && currentBlock.layers.length > 0) {
            blocks.push(currentBlock);
        }

        return blocks;
    }

    /**
     * Infer the block type based on layer properties
     * @private
     */
    static _inferBlockType(layer) {
        const type = layer.type?.toLowerCase() || '';
        const name = layer.name?.toLowerCase() || '';

        // Check for embedding layers
        if (type.includes('embedding') || name.includes('embed')) {
            return this.BLOCK_TYPES.EMBEDDING;
        }

        // Check for decoder layers
        if (type.includes('decoder') || name.includes('decoder')) {
            return this.BLOCK_TYPES.DECODER;
        }

        // Check for encoder layers
        if (type.includes('encoder') || name.includes('encoder') ||
            type.includes('attention') || type.includes('transformer')) {
            return this.BLOCK_TYPES.ENCODER;
        }

        // Check for output layers (classifier, lm_head, etc.)
        if (type.includes('linear') && (name.includes('classifier') || 
            name.includes('head') || name.includes('output'))) {
            return this.BLOCK_TYPES.OUTPUT;
        }

        // Default to encoder for unknown transformer layers
        return this.BLOCK_TYPES.ENCODER;
    }

    /**
     * Determine if we should start a new block
     * @private
     */
    static _shouldStartNewBlock(currentBlock, layer, newBlockType) {
        // Different block type = new block
        if (currentBlock.type !== newBlockType) {
            return true;
        }

        // Check for explicit block markers in layer name/metadata
        const layerName = layer.name?.toLowerCase() || '';
        if (layerName.includes('block') || layerName.includes('layer_')) {
            // Check if this is a new numbered block
            const match = layerName.match(/(?:block|layer)[_\.]?(\d+)/);
            if (match) {
                const blockNum = parseInt(match[1]);
                // If we already have layers and this is block 0 or a different block, start new
                if (currentBlock.layers.length > 0) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get display name for a block
     * @private
     */
    static _getBlockName(blockType, blockIndex) {
        const typeNames = {
            [this.BLOCK_TYPES.ENCODER]: 'Encoder Block',
            [this.BLOCK_TYPES.DECODER]: 'Decoder Block',
            [this.BLOCK_TYPES.EMBEDDING]: 'Embeddings',
            [this.BLOCK_TYPES.OUTPUT]: 'Output Head'
        };

        const baseName = typeNames[blockType] || 'Block';
        return `${baseName} ${blockIndex + 1}`;
    }

    /**
     * Position all layers within a block
     * @private
     * @param {Object} block - Block object with layers
     * @param {number} startY - Starting Y position for this block
     * @param {number} spacing - Spacing between sub-layers
     * @param {Map} positions - Positions map to populate
     */
    static _positionBlock(block, startY, spacing, positions) {
        block.layers.forEach((layer, layerIndex) => {
            const position = new BABYLON.Vector3(
                0,                              // X: centered
                startY - (layerIndex * spacing), // Y: stack downward
                0                               // Z: flat
            );

            positions.set(layer.id, position);

            // Store block metadata on layer for reference
            layer._blockInfo = {
                blockType: block.type,
                blockName: block.name,
                indexInBlock: layerIndex,
                totalInBlock: block.layers.length
            };
        });
    }

    /**
     * Center the layout around origin
     * @private
     */
    static _centerLayout(positions) {
        if (positions.size === 0) return;

        // Find min and max Y
        let minY = Infinity;
        let maxY = -Infinity;

        positions.forEach(pos => {
            if (pos.y < minY) minY = pos.y;
            if (pos.y > maxY) maxY = pos.y;
        });

        // Calculate offset to center vertically
        const centerY = (minY + maxY) / 2;

        // Apply offset
        positions.forEach(pos => {
            pos.y -= centerY;
        });
    }

    /**
     * Get recommended camera position for vertical transformer layout
     * @param {Array} layers - Array of layer objects
     * @param {Object} hints - Visualization hints
     * @returns {Array} [x, y, z] camera position
     */
    static getRecommendedCameraPosition(layers, hints = {}) {
        const numLayers = layers.length;

        // Use hints if available
        if (hints.camera_position && hints.camera_position.length === 3) {
            return hints.camera_position;
        }

        // Calculate based on model depth
        const totalHeight = numLayers * this.SUBLAYER_SPACING;
        const distance = Math.max(20, totalHeight * 0.6);

        // Position camera to view vertically stacked layers
        // Slightly above center, looking down at an angle
        return [distance * 0.5, totalHeight * 0.3, distance];
    }

    /**
     * Create a curved residual connection path
     * @param {BABYLON.Vector3} fromPos - Start position
     * @param {BABYLON.Vector3} toPos - End position
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {Object} options - Options { color, thickness }
     * @returns {BABYLON.Mesh} The tube mesh representing the connection
     */
    static createResidualConnection(fromPos, toPos, scene, options = {}) {
        const color = options.color || new BABYLON.Color3(0.8, 0.4, 0.1); // Orange
        const thickness = options.thickness || 0.05;

        // Calculate control points for a curved arc
        // Arc curves outward to the right of the layers
        const midY = (fromPos.y + toPos.y) / 2;
        const arcOffset = this.RESIDUAL_ARC_OFFSET;

        // Create bezier-like path with multiple points
        const path = [
            fromPos.clone(),
            new BABYLON.Vector3(fromPos.x + arcOffset * 0.5, fromPos.y, fromPos.z),
            new BABYLON.Vector3(fromPos.x + arcOffset, midY + (fromPos.y - midY) * 0.3, fromPos.z),
            new BABYLON.Vector3(fromPos.x + arcOffset, midY, fromPos.z),
            new BABYLON.Vector3(fromPos.x + arcOffset, midY + (toPos.y - midY) * 0.3, fromPos.z),
            new BABYLON.Vector3(toPos.x + arcOffset * 0.5, toPos.y, toPos.z),
            toPos.clone()
        ];

        // Create smooth curve using CatmullRom spline
        const catmullRom = BABYLON.Curve3.CreateCatmullRomSpline(path, 20, false);
        const smoothPath = catmullRom.getPoints();

        // Create tube mesh for the connection
        const tube = BABYLON.MeshBuilder.CreateTube(
            `residual_${fromPos.y}_${toPos.y}`,
            {
                path: smoothPath,
                radius: thickness,
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            },
            scene
        );

        // Apply material
        const material = new BABYLON.StandardMaterial(`residual_mat_${fromPos.y}`, scene);
        material.diffuseColor = color;
        material.emissiveColor = color.scale(0.3);
        material.alpha = 0.8;
        tube.material = material;

        // Add metadata
        tube.metadata = {
            type: 'residual_connection',
            from: fromPos.clone(),
            to: toPos.clone()
        };

        return tube;
    }

    /**
     * Create an "add" connection indicator (for element-wise addition)
     * @param {BABYLON.Vector3} position - Position for the add indicator
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @returns {BABYLON.Mesh} The add indicator mesh
     */
    static createAddIndicator(position, scene) {
        // Create a small sphere with a "+" texture
        const sphere = BABYLON.MeshBuilder.CreateSphere(
            `add_indicator_${position.y}`,
            { diameter: 0.4 },
            scene
        );

        sphere.position = position.clone();

        // Material
        const material = new BABYLON.StandardMaterial(`add_mat_${position.y}`, scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green
        material.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
        sphere.material = material;

        sphere.metadata = {
            type: 'add_indicator',
            description: 'Element-wise addition (residual + layer output)'
        };

        return sphere;
    }

    /**
     * Get vertical connection points for transformer layers
     * (Top and bottom instead of left and right)
     * @param {BABYLON.Mesh} mesh - The layer mesh
     * @param {Object} dimensions - { width, height, depth }
     * @returns {Object} { input: Vector3, output: Vector3 }
     */
    static getVerticalConnectionPoints(mesh, dimensions) {
        const position = mesh.position;
        const halfHeight = (dimensions.height || 1) / 2;

        return {
            input: new BABYLON.Vector3(
                position.x,
                position.y + halfHeight,  // Top
                position.z
            ),
            output: new BABYLON.Vector3(
                position.x,
                position.y - halfHeight,  // Bottom
                position.z
            )
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransformerLayout;
}
