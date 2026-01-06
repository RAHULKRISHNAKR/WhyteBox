/**
 * InferenceController
 * Handles image upload, API communication, and inference state management
 */

class InferenceController {
    constructor(apiBaseUrl = 'http://localhost:5000') {
        this.apiBaseUrl = apiBaseUrl;
        this.state = 'idle'; // idle, uploading, inferencing, displaying
        this.currentImage = null;
        this.currentResults = null;
        this.listeners = [];
    }

    /**
     * Add state change listener
     * @param {Function} callback - Called when state changes
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    _notifyListeners() {
        this.listeners.forEach(cb => {
            try {
                cb(this.state, this.currentResults);
            } catch (e) {
                console.error('Listener error:', e);
            }
        });
    }

    /**
     * Set state and notify listeners
     * @private
     */
    _setState(newState) {
        this.state = newState;
        this._notifyListeners();
    }

    /**
     * Run inference on an image
     * @param {File} imageFile - Image file from input
     * @param {string} modelPath - Path to model file
     * @param {string} framework - 'pytorch' or 'keras'
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Inference results
     */
    async runInference(imageFile, modelPath, framework, options = {}) {
        try {
            this._setState('uploading');

            // Validate inputs
            if (!imageFile) {
                throw new Error('No image file provided');
            }

            if (!modelPath) {
                throw new Error('No model path provided');
            }

            // Create form data
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('model_path', modelPath);
            formData.append('framework', framework);

            // Add optional parameters
            if (options.input_shape) {
                formData.append('input_shape', options.input_shape);
            }

            formData.append('include_activations', options.include_activations !== false ? 'true' : 'false');

            if (options.max_features) {
                formData.append('max_features', options.max_features.toString());
            }

            if (options.layers && Array.isArray(options.layers)) {
                formData.append('layers', options.layers.join(','));
            }

            // Store image for display
            this.currentImage = URL.createObjectURL(imageFile);

            this._setState('inferencing');

            // Call API
            const response = await fetch(`${this.apiBaseUrl}/api/inference`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Inference failed');
            }

            const results = await response.json();

            if (!results.success) {
                throw new Error('Inference failed: ' + (results.error || 'Unknown error'));
            }

            // Store results
            this.currentResults = results;
            this._setState('displaying');

            console.log('Inference complete:', results);
            return results;

        } catch (error) {
            console.error('Inference error:', error);
            this._setState('idle');
            throw error;
        }
    }

    /**
     * Get activation data for a specific layer
     * @param {string} layerId - Layer ID to get activation for
     * @returns {Object|null} Activation data
     */
    getActivationForLayer(layerId) {
        if (!this.currentResults || !this.currentResults.activations) {
            return null;
        }

        // Try direct match
        if (this.currentResults.activations[layerId]) {
            return this.currentResults.activations[layerId];
        }

        // Try matching by layer name (backend might use different naming)
        for (const [key, value] of Object.entries(this.currentResults.activations)) {
            if (key.includes(layerId) || layerId.includes(key)) {
                return value;
            }
        }

        return null;
    }

    /**
     * Get current predictions
     * @returns {Array|null} Prediction array
     */
    getPredictions() {
        return this.currentResults?.predictions || null;
    }

    /**
     * Get current uploaded image URL
     * @returns {string|null}
     */
    getImageUrl() {
        return this.currentImage;
    }

    /**
     * Clear current inference results
     */
    clear() {
        if (this.currentImage) {
            URL.revokeObjectURL(this.currentImage);
        }

        this.currentImage = null;
        this.currentResults = null;
        this._setState('idle');
    }

    /**
     * Get current state
     * @returns {string}
     */
    getState() {
        return this.state;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InferenceController;
}
