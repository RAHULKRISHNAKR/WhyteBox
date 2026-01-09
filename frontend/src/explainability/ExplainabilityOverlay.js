/**
 * ExplainabilityOverlay
 * Renders explainability heatmaps as overlays on input images
 */

class ExplainabilityOverlay {
    constructor(containerElement) {
        this.container = containerElement;
        this.canvas = null;
        this.ctx = null;
        this.currentHeatmap = null;
        this.currentImage = null;
        this.opacity = 0.6;
        this.colormap = 'jet'; // 'jet' or 'viridis'
    }

    /**
     * Initialize canvas overlay
     */
    initialize() {
        // Create canvas if doesn't exist
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.pointerEvents = 'none';
            this.container.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
        }
    }

    /**
     * Render heatmap overlay on image
     * @param {HTMLImageElement} imageElement - Source image
     * @param {Array} heatmapData - 2D array of heatmap values [0, 1]
     * @param {Object} options - Rendering options
     */
    renderOverlay(imageElement, heatmapData, options = {}) {
        this.initialize();

        const {
            opacity = this.opacity,
            colormap = this.colormap,
            width = imageElement.naturalWidth,
            height = imageElement.naturalHeight
        } = options;

        // Set canvas size to match image
        this.canvas.width = width;
        this.canvas.height = height;

        // Draw original image
        this.ctx.drawImage(imageElement, 0, 0, width, height);

        // Create heatmap overlay
        const imageData = this.ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Apply heatmap
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Get heatmap value (may need resizing if dimensions don't match)
                const heatmapY = Math.floor((y / height) * heatmapData.length);
                const heatmapX = Math.floor((x / width) * heatmapData[0].length);
                const heatValue = heatmapData[heatmapY][heatmapX];

                // Get heatmap color
                const heatColor = this.applyColormap(heatValue, colormap);

                // Blend with original image
                const pixelIndex = (y * width + x) * 4;
                pixels[pixelIndex] = Math.round(pixels[pixelIndex] * (1 - opacity) + heatColor.r * opacity);
                pixels[pixelIndex + 1] = Math.round(pixels[pixelIndex + 1] * (1 - opacity) + heatColor.g * opacity);
                pixels[pixelIndex + 2] = Math.round(pixels[pixelIndex + 2] * (1 - opacity) + heatColor.b * opacity);
            }
        }

        this.ctx.putImageData(imageData, 0, 0);

        // Store current state
        this.currentHeatmap = heatmapData;
        this.currentImage = imageElement;
        this.opacity = opacity;
        this.colormap = colormap;
    }

    /**
     * Apply colormap to value
     * @param {number} value - Value in range [0, 1]
     * @param {string} colormapName - 'jet' or 'viridis'
     * @returns {Object} RGB color {r, g, b}
     */
    applyColormap(value, colormapName) {
        // Clamp value to [0, 1]
        value = Math.max(0, Math.min(1, value));

        if (colormapName === 'jet') {
            return this.jetColormap(value);
        } else if (colormapName === 'viridis') {
            return this.viridisColormap(value);
        } else {
            return { r: value * 255, g: 0, b: 0 }; // Fallback to red scale
        }
    }

    /**
     * Jet colormap (blue -> cyan -> yellow -> red)
     */
    jetColormap(value) {
        let r, g, b;

        if (value < 0.125) {
            r = 0;
            g = 0;
            b = 4 * value + 0.5;
        } else if (value < 0.375) {
            r = 0;
            g = 4 * (value - 0.125);
            b = 1;
        } else if (value < 0.625) {
            r = 4 * (value - 0.375);
            g = 1;
            b = 1 - 4 * (value - 0.375);
        } else if (value < 0.875) {
            r = 1;
            g = 1 - 4 * (value - 0.625);
            b = 0;
        } else {
            r = 1 - 4 * (value - 0.875);
            g = 0;
            b = 0;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * Viridis colormap (purple -> blue -> green -> yellow)
     */
    viridisColormap(value) {
        // Simplified viridis - interpolate between key colors
        const colors = [
            { r: 68, g: 1, b: 84 },      // Dark purple
            { r: 59, g: 82, b: 139 },     // Blue
            { r: 33, g: 145, b: 140 },    // Teal
            { r: 94, g: 201, b: 98 },     // Green
            { r: 253, g: 231, b: 37 }     // Yellow
        ];

        const segment = value * (colors.length - 1);
        const index = Math.floor(segment);
        const t = segment - index;

        if (index >= colors.length - 1) {
            return colors[colors.length - 1];
        }

        const c1 = colors[index];
        const c2 = colors[index + 1];

        return {
            r: Math.round(c1.r + (c2.r - c1.r) * t),
            g: Math.round(c1.g + (c2.g - c1.g) * t),
            b: Math.round(c1.b + (c2.b - c1.b) * t)
        };
    }

    /**
     * Update opacity and re-render
     * @param {number} newOpacity - Opacity value [0, 1]
     */
    setOpacity(newOpacity) {
        if (this.currentHeatmap && this.currentImage) {
            this.renderOverlay(this.currentImage, this.currentHeatmap, {
                opacity: newOpacity,
                colormap: this.colormap
            });
        }
    }

    /**
     * Change colormap and re-render
     * @param {string} newColormap - 'jet' or 'viridis'
     */
    setColormap(newColormap) {
        if (this.currentHeatmap && this.currentImage) {
            this.renderOverlay(this.currentImage, this.currentHeatmap, {
                opacity: this.opacity,
                colormap: newColormap
            });
        }
    }

    /**
     * Clear overlay
     */
    clear() {
        if (this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.currentHeatmap = null;
        this.currentImage = null;
    }

    /**
     * Show/hide overlay
     * @param {boolean} visible
     */
    setVisible(visible) {
        if (this.canvas) {
            this.canvas.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Dispose resources
     */
    dispose() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas = null;
        this.ctx = null;
        this.currentHeatmap = null;
        this.currentImage = null;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExplainabilityOverlay;
}
