/**
 * ModelLoader
 * Loads and validates backend JSON metadata for neural network models
 */

class ModelLoader {
    constructor() {
        this.data = null;
    }

    /**
     * Load model data from URL
     * @param {string} url - URL to JSON file
     * @returns {Promise<Object>} Model data
     */
    async loadFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.loadFromObject(data);
        } catch (error) {
            console.error('Failed to load model from URL:', error);
            throw error;
        }
    }

    /**
     * Load model data from object
     * @param {Object} data - Model data object
     * @returns {Promise<Object>} Validated model data
     */
    async loadFromObject(data) {
        const validationResult = this.validate(data);

        if (!validationResult.valid) {
            throw new Error(`Model validation failed: ${validationResult.errors.join(', ')}`);
        }

        this.data = data;
        console.log(`Model loaded: ${data.metadata.model_name} with ${data.layers.length} layers`);
        return data;
    }

    /**
     * Validate model data structure
     * @param {Object} data - Model data to validate
     * @returns {Object} Validation result { valid: boolean, errors: string[] }
     */
    validate(data) {
        const errors = [];

        // Check required top-level fields
        if (!data) {
            errors.push('Model data is null or undefined');
            return { valid: false, errors };
        }

        if (!data.metadata) {
            errors.push('Missing metadata field');
        }

        if (!data.layers || !Array.isArray(data.layers)) {
            errors.push('Missing or invalid layers field (must be array)');
        }

        if (!data.connections || !Array.isArray(data.connections)) {
            errors.push('Missing or invalid connections field (must be array)');
        }

        // Validate metadata
        if (data.metadata) {
            const requiredMetadataFields = ['model_name', 'framework', 'total_layers', 'total_parameters'];
            requiredMetadataFields.forEach(field => {
                if (!(field in data.metadata)) {
                    errors.push(`Missing metadata.${field}`);
                }
            });
        }

        // Validate layers
        if (data.layers && Array.isArray(data.layers)) {
            if (data.layers.length === 0) {
                errors.push('Layers array is empty');
            }

            data.layers.forEach((layer, index) => {
                const requiredLayerFields = ['id', 'name', 'type', 'index'];
                requiredLayerFields.forEach(field => {
                    if (!(field in layer)) {
                        errors.push(`Layer ${index} missing field: ${field}`);
                    }
                });
            });

            // Check for duplicate layer IDs
            const layerIds = new Set();
            data.layers.forEach((layer, index) => {
                if (layer.id) {
                    if (layerIds.has(layer.id)) {
                        errors.push(`Duplicate layer ID: ${layer.id}`);
                    }
                    layerIds.add(layer.id);
                }
            });
        }

        // Validate connections
        if (data.connections && Array.isArray(data.connections)) {
            const layerIds = new Set(data.layers?.map(l => l.id) || []);

            data.connections.forEach((conn, index) => {
                // Support both source_layer/target_layer and from_layer/to_layer
                const sourceId = conn.source_layer || conn.from_layer;
                const targetId = conn.target_layer || conn.to_layer;

                if (!sourceId) {
                    errors.push(`Connection ${index} missing source layer`);
                }
                if (!targetId) {
                    errors.push(`Connection ${index} missing target layer`);
                }

                if (sourceId && !layerIds.has(sourceId)) {
                    errors.push(`Connection ${index} references unknown source layer: ${sourceId}`);
                }
                if (targetId && !layerIds.has(targetId)) {
                    errors.push(`Connection ${index} references unknown target layer: ${targetId}`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get model metadata
     * @returns {Object} Metadata
     */
    getMetadata() {
        return this.data?.metadata || null;
    }

    /**
     * Get all layers
     * @returns {Array} Layers
     */
    getLayers() {
        return this.data?.layers || [];
    }

    /**
     * Get layer by ID
     * @param {string} layerId - Layer ID
     * @returns {Object|null} Layer object
     */
    getLayerById(layerId) {
        return this.getLayers().find(layer => layer.id === layerId) || null;
    }

    /**
     * Get all connections
     * @returns {Array} Connections
     */
    getConnections() {
        return this.data?.connections || [];
    }

    /**
     * Get visualization hints
     * @returns {Object} Visualization hints
     */
    getVisualizationHints() {
        return this.data?.visualization_hints || this._getDefaultHints();
    }

    /**
     * Get topology information
     * @returns {Object} Topology data
     */
    getTopology() {
        return this.data?.topology || {};
    }

    /**
     * Get architecture information
     * @returns {Object} Architecture data
     */
    getArchitecture() {
        return this.data?.architecture || {};
    }

    /**
     * Get default visualization hints
     * @private
     * @returns {Object} Default hints
     */
    _getDefaultHints() {
        return {
            suggested_layout: 'linear',
            camera_position: [0, 10, 30],
            layer_spacing: 2.0,
            vertical_spacing: 1.5,
            color_scheme: 'layer_type',
            show_connections: true,
            show_parameters: true,
            animation_speed: 1.0
        };
    }

    /**
     * Get the complete loaded data
     * @returns {Object} Complete model data
     */
    getData() {
        return this.data;
    }

    /**
     * Clear loaded data
     */
    clear() {
        this.data = null;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelLoader;
}
