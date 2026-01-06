/**
 * HierarchicalLayout
 * Arranges layers in levels/tiers based on topology
 * Used for models with skip connections like ResNet
 */

class HierarchicalLayout {
    /**
     * Calculate positions for layers in a hierarchical arrangement
     * @param {Array} layers - Array of layer objects
     * @param {Array} connections - Array of connection objects
     * @param {Object} topology - Topology data from backend
     * @param {Object} hints - Visualization hints
     * @returns {Map} Map of layer IDs to Vector3 positions
     */
    static calculatePositions(layers, connections, topology = {}, hints = {}) {
        const positions = new Map();

        // Build dependency graph
        const levelMap = this._assignLevels(layers, connections, topology);

        // Group layers by level
        const levelGroups = new Map();
        levelMap.forEach((level, layerId) => {
            if (!levelGroups.has(level)) {
                levelGroups.set(level, []);
            }
            const layer = layers.find(l => l.id === layerId);
            if (layer) {
                levelGroups.get(level).push(layer);
            }
        });

        // Get spacing from hints
        const layerSpacing = hints.layer_spacing || 2.5;
        const levelSpacing = hints.vertical_spacing || 3.0;

        // Position each level
        let currentX = 0;
        const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

        sortedLevels.forEach(level => {
            const layersInLevel = levelGroups.get(level);
            const numLayersInLevel = layersInLevel.length;

            // Calculate Y positions for layers in this level
            const startY = -(numLayersInLevel - 1) * layerSpacing / 2;

            layersInLevel.forEach((layer, index) => {
                const position = new BABYLON.Vector3(
                    currentX,
                    startY + index * layerSpacing,
                    0
                );

                positions.set(layer.id, position);
            });

            currentX += levelSpacing;
        });

        // Center the layout
        this._centerLayout(positions);

        return positions;
    }

    /**
     * Assign levels to layers based on dependencies
     * @private
     */
    static _assignLevels(layers, connections, topology) {
        const levelMap = new Map();

        // Use topology data if available
        const inputLayers = topology.input_layers || [];
        const outputLayers = topology.output_layers || [];

        // Build adjacency list
        const adjacency = new Map();
        const inDegree = new Map();

        layers.forEach(layer => {
            adjacency.set(layer.id, []);
            inDegree.set(layer.id, 0);
        });

        connections.forEach(conn => {
            const sourceId = conn.source_layer || conn.from_layer;
            const targetId = conn.target_layer || conn.to_layer;

            if (adjacency.has(sourceId)) {
                adjacency.get(sourceId).push(targetId);
            }

            if (inDegree.has(targetId)) {
                inDegree.set(targetId, inDegree.get(targetId) + 1);
            }
        });

        // BFS to assign levels
        const queue = [];

        // Start with input layers or layers with no dependencies
        if (inputLayers.length > 0) {
            inputLayers.forEach(layerId => {
                levelMap.set(layerId, 0);
                queue.push(layerId);
            });
        } else {
            // Find layers with no incoming connections
            inDegree.forEach((degree, layerId) => {
                if (degree === 0) {
                    levelMap.set(layerId, 0);
                    queue.push(layerId);
                }
            });
        }

        // BFS traversal
        while (queue.length > 0) {
            const currentId = queue.shift();
            const currentLevel = levelMap.get(currentId);

            const neighbors = adjacency.get(currentId) || [];
            neighbors.forEach(neighborId => {
                const newLevel = currentLevel + 1;

                // Update level if not set or if new level is greater
                if (!levelMap.has(neighborId) || levelMap.get(neighborId) < newLevel) {
                    levelMap.set(neighborId, newLevel);
                }

                // Decrease in-degree and add to queue if all dependencies processed
                const newInDegree = inDegree.get(neighborId) - 1;
                inDegree.set(neighborId, newInDegree);

                if (newInDegree === 0) {
                    queue.push(neighborId);
                }
            });
        }

        // Assign level 0 to any remaining layers (shouldn't happen in valid graphs)
        layers.forEach(layer => {
            if (!levelMap.has(layer.id)) {
                levelMap.set(layer.id, 0);
                console.warn(`Layer ${layer.id} not assigned a level, defaulting to 0`);
            }
        });

        return levelMap;
    }

    /**
     * Center the layout around origin
     * @private
     */
    static _centerLayout(positions) {
        if (positions.size === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        positions.forEach(pos => {
            if (pos.x < minX) minX = pos.x;
            if (pos.x > maxX) maxX = pos.x;
            if (pos.y < minY) minY = pos.y;
            if (pos.y > maxY) maxY = pos.y;
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        positions.forEach(pos => {
            pos.x -= centerX;
            pos.y -= centerY;
        });
    }

    /**
     * Get recommended camera position for this layout
     * @param {Array} layers - Array of layer objects
     * @param {Object} hints - Visualization hints
     * @returns {Array} [x, y, z] camera position
     */
    static getRecommendedCameraPosition(layers, hints = {}) {
        // Use hints if available
        if (hints.camera_position && hints.camera_position.length === 3) {
            return hints.camera_position;
        }

        // For hierarchical layouts, use a wider view
        const numLayers = layers.length;
        const distance = Math.max(20, numLayers * 1.0);
        return [0, 0, distance];
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HierarchicalLayout;
}
