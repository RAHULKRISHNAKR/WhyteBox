/**
 * LayerVisualizerRegistry
 * Central registry for layer visualization functions
 * Maps layer types to their corresponding 3D visualization functions
 */

class LayerVisualizerRegistry {
    constructor() {
        this.visualizers = new Map();
        this.defaultVisualizer = null;
    }

    /**
     * Register a visualizer function for a layer type
     * @param {string} layerType - Layer type identifier (e.g., 'Conv2d', 'Dense')
     * @param {Function} visualizerFn - Visualization function
     * 
     * Visualizer function signature:
     * function(layer, scene, position, options) -> { mesh, bounds, connectionPoints }
     */
    register(layerType, visualizerFn) {
        if (typeof visualizerFn !== 'function') {
            console.error(`Visualizer for ${layerType} must be a function`);
            return false;
        }

        this.visualizers.set(layerType, visualizerFn);
        console.log(`Registered visualizer for layer type: ${layerType}`);
        return true;
    }

    /**
     * Register multiple visualizers at once
     * @param {Object} visualizersMap - Object mapping layer types to functions
     */
    registerMultiple(visualizersMap) {
        Object.entries(visualizersMap).forEach(([layerType, visualizerFn]) => {
            this.register(layerType, visualizerFn);
        });
    }

    /**
     * Get visualizer function for a layer type
     * @param {string} layerType - Layer type identifier
     * @returns {Function|null} Visualizer function or null
     */
    getVisualizer(layerType) {
        // Try exact match first
        if (this.visualizers.has(layerType)) {
            return this.visualizers.get(layerType);
        }

        // Try case-insensitive match
        const lowerLayerType = layerType.toLowerCase();
        for (const [key, visualizer] of this.visualizers.entries()) {
            if (key.toLowerCase() === lowerLayerType) {
                return visualizer;
            }
        }

        // Try partial matches for common variations
        // e.g., 'Conv2D' -> 'Conv2d', 'MaxPool2d' -> 'MaxPool'
        for (const [key, visualizer] of this.visualizers.entries()) {
            if (lowerLayerType.includes(key.toLowerCase()) ||
                key.toLowerCase().includes(lowerLayerType)) {
                console.log(`Using partial match visualizer for ${layerType}: ${key}`);
                return visualizer;
            }
        }

        // Fallback to default
        console.warn(`No visualizer found for layer type: ${layerType}, using default`);
        return this.defaultVisualizer;
    }

    /**
     * Check if a visualizer exists for a layer type
     * @param {string} layerType - Layer type identifier
     * @returns {boolean}
     */
    hasVisualizer(layerType) {
        return this.visualizers.has(layerType);
    }

    /**
     * Set the default visualizer (fallback for unknown types)
     * @param {Function} visualizerFn - Default visualizer function
     */
    setDefaultVisualizer(visualizerFn) {
        if (typeof visualizerFn !== 'function') {
            console.error('Default visualizer must be a function');
            return false;
        }

        this.defaultVisualizer = visualizerFn;
        console.log('Default visualizer set');
        return true;
    }

    /**
     * Get all registered layer types
     * @returns {Array<string>} Array of registered layer types
     */
    getRegisteredTypes() {
        return Array.from(this.visualizers.keys());
    }

    /**
     * Clear all registered visualizers
     */
    clear() {
        this.visualizers.clear();
        this.defaultVisualizer = null;
    }

    /**
     * Get count of registered visualizers
     * @returns {number}
     */
    count() {
        return this.visualizers.size;
    }

    /**
     * Create a mesh using the appropriate visualizer
     * @param {Object} layer - Layer data from backend
     * @param {BABYLON.Scene} scene - BabylonJS scene
     * @param {BABYLON.Vector3} position - Position for the layer
     * @param {Object} options - Additional options
     * @returns {Object} { mesh, bounds, connectionPoints }
     */
    createLayerMesh(layer, scene, position, options = {}) {
        const visualizer = this.getVisualizer(layer.type);

        if (!visualizer) {
            console.error(`No visualizer available for layer type: ${layer.type}`);
            return null;
        }

        try {
            const result = visualizer(layer, scene, position, options);

            // Validate result structure
            if (!result || !result.mesh) {
                console.error(`Visualizer for ${layer.type} did not return a valid mesh`);
                return null;
            }

            // Add layer metadata to mesh
            result.mesh.metadata = {
                layerId: layer.id,
                layerName: layer.name,
                layerType: layer.type,
                layerIndex: layer.index,
                layerData: layer
            };

            return result;
        } catch (error) {
            console.error(`Error creating mesh for layer ${layer.id}:`, error);
            return null;
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayerVisualizerRegistry;
}
