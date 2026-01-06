/**
 * LinearLayout
 * Arranges layers sequentially in a horizontal line
 * Used for sequential models like VGG
 */

class LinearLayout {
    /**
     * Calculate positions for layers in a linear arrangement
     * @param {Array} layers - Array of layer objects
     * @param {Object} hints - Visualization hints from backend
     * @returns {Map} Map of layer IDs to Vector3 positions
     */
    static calculatePositions(layers, hints = {}) {
        const positions = new Map();

        // Get spacing from hints or use default
        const layerSpacing = hints.layer_spacing || 2.0;
        const verticalOffset = hints.vertical_spacing || 0;

        // Starting position
        let currentX = 0;

        layers.forEach((layer, index) => {
            // Calculate position
            const position = new BABYLON.Vector3(
                currentX,
                verticalOffset,
                0
            );

            positions.set(layer.id, position);

            // Move to next position
            // Use size_hint if available, otherwise use default spacing
            const sizeHint = layer.visualization?.size_hint || 1.0;
            currentX += layerSpacing * sizeHint;
        });

        // Center the entire layout
        this._centerLayout(positions, layers);

        return positions;
    }

    /**
     * Center the layout around origin
     * @private
     */
    static _centerLayout(positions, layers) {
        if (positions.size === 0) return;

        // Find min and max X
        let minX = Infinity;
        let maxX = -Infinity;

        positions.forEach(pos => {
            if (pos.x < minX) minX = pos.x;
            if (pos.x > maxX) maxX = pos.x;
        });

        // Calculate offset to center
        const centerX = (minX + maxX) / 2;

        // Apply offset
        positions.forEach(pos => {
            pos.x -= centerX;
        });
    }

    /**
     * Get recommended camera position for this layout
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

        // Calculate based on number of layers
        const distance = Math.max(15, numLayers * 0.8);
        return [0, 10, distance];
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinearLayout;
}
