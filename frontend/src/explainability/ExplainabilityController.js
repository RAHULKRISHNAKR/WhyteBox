/**
 * ExplainabilityController
 * Manages explainability workflow and API communication
 */

class ExplainabilityController {
    constructor(apiBaseUrl = 'http://localhost:5000') {
        this.apiBaseUrl = apiBaseUrl;
        this.currentResults = null;
        this.state = 'idle'; // idle, loading, displaying
    }

    /**
     * Request explainability heatmap from backend
     * @param {File} imageFile - Image file
     * @param {string} modelPath - Path to model file
     * @param {string} framework - 'pytorch' or 'keras'
     * @param {string} method - 'gradcam' or 'saliency'
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Explainability results
     */
    async requestExplainability(imageFile, modelPath, framework, method, options = {}) {
        try {
            this._setState('loading');

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
            formData.append('method', method);

            // Add optional parameters
            if (options.target_class !== undefined) {
                formData.append('target_class', options.target_class.toString());
            }

            if (options.target_layer) {
                formData.append('target_layer', options.target_layer);
            }

            if (options.input_shape) {
                formData.append('input_shape', options.input_shape);
            }

            console.log(`🔍 Requesting ${method} explainability...`);

            // Call API
            const response = await fetch(`${this.apiBaseUrl}/api/explainability`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Explainability request failed');
            }

            const results = await response.json();

            if (!results.success) {
                throw new Error('Explainability failed: ' + (results.error || 'Unknown error'));
            }

            // Store results
            this.currentResults = results;
            this._setState('displaying');

            console.log(`✅ ${method} complete:`, results);
            return results;

        } catch (error) {
            console.error('❌ Explainability error:', error);
            this._setState('idle');
            throw error;
        }
    }

    /**
     * Get stored explainability results
     * @returns {Object|null} Current results
     */
    getStoredExplainability() {
        return this.currentResults;
    }

    /**
     * Clear stored results
     */
    clear() {
        this.currentResults = null;
        this._setState('idle');
    }

    /**
     * Get current state
     * @returns {string} Current state
     */
    getState() {
        return this.state;
    }

    /**
     * Set state and notify listeners
     * @private
     */
    _setState(newState) {
        const oldState = this.state;
        this.state = newState;

        // Dispatch custom event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('explainabilityStateChange', {
                detail: { oldState, newState }
            }));
        }
    }

    /**
     * Check if explainability is supported for given framework/method
     * @param {string} framework
     * @param {string} method
     * @returns {boolean}
     */
    isSupported(framework, method) {
        const supportedCombinations = {
            'pytorch': ['gradcam', 'saliency'],
            'keras': [] // Not yet implemented
        };

        return supportedCombinations[framework]?.includes(method) || false;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExplainabilityController;
}
