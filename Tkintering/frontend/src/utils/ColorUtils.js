/**
 * ColorUtils
 * Utilities for color management and conversion
 */

class ColorUtils {
    /**
     * Parse color from various formats to BABYLON.Color3
     * @param {string|number|Object} color - Color in hex string, number, or RGB object
     * @returns {BABYLON.Color3}
     */
    static parseColor(color) {
        if (!color) {
            return new BABYLON.Color3(0.8, 0.8, 0.8); // Default gray
        }

        // If already a BABYLON.Color3
        if (color instanceof BABYLON.Color3) {
            return color;
        }

        // If hex string
        if (typeof color === 'string') {
            return this.hexToColor3(color);
        }

        // If hex number
        if (typeof color === 'number') {
            return BABYLON.Color3.FromHexString(`#${color.toString(16).padStart(6, '0')}`);
        }

        // If RGB object
        if (typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color) {
            return new BABYLON.Color3(color.r, color.g, color.b);
        }

        return new BABYLON.Color3(0.8, 0.8, 0.8); // Default gray
    }

    /**
     * Convert hex string to BABYLON.Color3
     * @param {string} hex - Hex color string (e.g., '#FF0000' or 'FF0000')
     * @returns {BABYLON.Color3}
     */
    static hexToColor3(hex) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse hex string
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        return new BABYLON.Color3(r, g, b);
    }

    /**
     * Get default color for a layer type
     * @param {string} layerType - Layer type
     * @returns {BABYLON.Color3}
     */
    static getDefaultLayerColor(layerType) {
        const colorMap = {
            // Convolutional layers
            'Conv1d': '#4A90E2',
            'Conv2d': '#4A90E2',
            'Conv3d': '#4A90E2',
            'ConvTranspose2d': '#5BA3F2',

            // Pooling layers
            'MaxPool1d': '#F5A623',
            'MaxPool2d': '#F5A623',
            'MaxPool3d': '#F5A623',
            'AvgPool1d': '#F5A623',
            'AvgPool2d': '#F5A623',
            'AvgPool3d': '#F5A623',
            'AdaptiveAvgPool2d': '#F5A623',
            'AdaptiveMaxPool2d': '#F5A623',

            // Dense/Linear layers
            'Linear': '#50C878',
            'Dense': '#50C878',

            // Activation layers
            'ReLU': '#FF6B6B',
            'Sigmoid': '#FF8C8C',
            'Tanh': '#FFA0A0',
            'Softmax': '#FFB4B4',
            'LeakyReLU': '#FF7B7B',
            'ELU': '#FF9B9B',

            // Normalization layers
            'BatchNorm1d': '#BD10E0',
            'BatchNorm2d': '#BD10E0',
            'BatchNorm3d': '#BD10E0',
            'LayerNorm': '#CD20F0',
            'GroupNorm': '#DD30FF',

            // Dropout layers
            'Dropout': '#95A5A6',
            'Dropout2d': '#95A5A6',
            'Dropout3d': '#95A5A6',

            // Utility layers
            'Flatten': '#95A5A6',
            'Reshape': '#A5B5B6',
            'Permute': '#B5C5C6',

            // Recurrent layers
            'LSTM': '#3498DB',
            'GRU': '#2980B9',
            'RNN': '#1F618D'
        };

        const hexColor = colorMap[layerType] || '#CCCCCC';
        return this.hexToColor3(hexColor);
    }

    /**
     * Create a lighter version of a color
     * @param {BABYLON.Color3} color - Base color
     * @param {number} factor - Lightening factor (0-1)
     * @returns {BABYLON.Color3}
     */
    static lighten(color, factor = 0.3) {
        return new BABYLON.Color3(
            Math.min(1, color.r + factor),
            Math.min(1, color.g + factor),
            Math.min(1, color.b + factor)
        );
    }

    /**
     * Create a darker version of a color
     * @param {BABYLON.Color3} color - Base color
     * @param {number} factor - Darkening factor (0-1)
     * @returns {BABYLON.Color3}
     */
    static darken(color, factor = 0.3) {
        return new BABYLON.Color3(
            Math.max(0, color.r - factor),
            Math.max(0, color.g - factor),
            Math.max(0, color.b - factor)
        );
    }

    /**
     * Interpolate between two colors
     * @param {BABYLON.Color3} color1 - Start color
     * @param {BABYLON.Color3} color2 - End color
     * @param {number} t - Interpolation factor (0-1)
     * @returns {BABYLON.Color3}
     */
    static lerp(color1, color2, t) {
        return new BABYLON.Color3(
            color1.r + (color2.r - color1.r) * t,
            color1.g + (color2.g - color1.g) * t,
            color1.b + (color2.b - color1.b) * t
        );
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorUtils;
}
