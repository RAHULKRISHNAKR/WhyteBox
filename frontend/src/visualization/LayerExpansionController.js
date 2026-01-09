/**
 * LayerExpansionController
 * Manages layer expansion/collapse with feature map visualization
 */

class LayerExpansionController {
    constructor(scene) {
        this.scene = scene;
        this.expandedLayers = new Map(); // layerId -> expansion data
        this.animationDuration = 800; // ms
    }

    /**
     * Check if a layer is expanded
     * @param {string} layerId - Layer ID
     * @returns {boolean}
     */
    isExpanded(layerId) {
        return this.expandedLayers.has(layerId);
    }

    /**
     * Toggle layer expansion
     * @param {string} layerId - Layer ID
     * @param {Object} meshData - Mesh data from visualizer
     * @param {Object} layerData - Layer data from backend
     */
    async toggleExpansion(layerId, meshData, layerData) {
        const isCurrentlyExpanded = this.expandedLayers.has(layerId);
        console.log(`🔄 Toggle expansion for ${layerId}: currently ${isCurrentlyExpanded ? 'EXPANDED' : 'COLLAPSED'}`);

        if (isCurrentlyExpanded) {
            // Layer is expanded, collapse it
            console.log(`⬇️ Collapsing layer ${layerId}...`);
            await this.collapseLayer(layerId);
        } else {
            // Layer is collapsed, expand it
            console.log(`⬆️ Expanding layer ${layerId}...`);
            await this.expandLayer(layerId, meshData, layerData);
        }
    }

    /**
     * Expand a layer to show feature maps
     * @param {string} layerId - Layer ID
     * @param {Object} meshData - Mesh data
     * @param {Object} layerData - Layer data
     * @param {Object} activationData - Optional activation data from inference
     */
    async expandLayer(layerId, meshData, layerData, activationData = null) {
        // Check if layer type supports expansion
        if (!this._supportsExpansion(layerData.type)) {
            console.log(`Layer type ${layerData.type} does not support expansion`);
            return;
        }

        const originalMesh = meshData.mesh;
        const originalPosition = originalMesh.position.clone();

        // Generate feature maps (with optional activation data)
        const featureMaps = this._generateFeatureMaps(layerData, originalPosition, activationData);

        if (!featureMaps || featureMaps.length === 0) {
            console.warn('No feature maps generated');
            return;
        }

        // Store expansion data
        this.expandedLayers.set(layerId, {
            originalMesh: originalMesh,
            featureMaps: featureMaps,
            layerData: layerData,
            hasActivations: !!activationData
        });

        // Make original mesh semi-transparent
        if (originalMesh.material) {
            originalMesh.material.alpha = 0.2;
        }

        // Animate feature maps expanding outward
        await this._animateExpansion(featureMaps, originalPosition);

        console.log(`Expanded layer ${layerId} with ${featureMaps.length} feature maps${activationData ? ' (with activations)' : ''}`);
    }

    /**
     * Collapse an expanded layer
     * @param {string} layerId - Layer ID
     */
    async collapseLayer(layerId) {
        const expansionData = this.expandedLayers.get(layerId);
        if (!expansionData) return;

        const { originalMesh, featureMaps } = expansionData;

        // Restore original mesh opacity
        if (originalMesh.material) {
            originalMesh.material.alpha = 0.9;
        }

        // Animate feature maps collapsing
        await this._animateCollapse(featureMaps, originalMesh.position);

        // Dispose feature maps
        featureMaps.forEach(fm => {
            if (fm.mesh) {
                fm.mesh.dispose();
            }
        });

        this.expandedLayers.delete(layerId);
        console.log(`Collapsed layer ${layerId}`);
    }

    /**
     * Check if layer type supports expansion
     * @private
     */
    _supportsExpansion(layerType) {
        const supportedTypes = [
            'Conv1d', 'Conv2d', 'Conv3d',
            'MaxPool2d', 'AvgPool2d',
            'Dense', 'Linear'
        ];
        return supportedTypes.includes(layerType);
    }

    /**
     * Generate feature map meshes
     * @private
     * @param {Object} activationData - Optional activation data
     */
    _generateFeatureMaps(layerData, centerPosition, activationData = null) {
        const featureMaps = [];
        const outputShape = layerData.output_shape || [];

        // Determine number of feature maps based on layer type
        let numMaps = 0;
        let mapSize = { width: 1, height: 1 };

        if (layerData.type.includes('Conv') || layerData.type.includes('Pool')) {
            // For Conv/Pool: output_shape is [batch, channels, height, width]
            if (outputShape.length >= 4) {
                numMaps = outputShape[1]; // Number of channels
                mapSize.width = Math.log10(outputShape[3] + 1) * 0.15 + 0.5;
                mapSize.height = Math.log10(outputShape[2] + 1) * 0.15 + 0.5;
            } else if (outputShape.length === 3) {
                numMaps = outputShape[0];
                mapSize.width = 0.8;
                mapSize.height = 0.8;
            }
        } else if (layerData.type === 'Dense' || layerData.type === 'Linear') {
            // For Dense: show individual neurons as small cubes
            const units = outputShape[outputShape.length - 1] || 10;
            numMaps = Math.min(units, 32); // Limit to 32 for performance
            mapSize.width = 0.3;
            mapSize.height = 0.3;
        }

        // Limit number of maps for performance
        numMaps = Math.min(numMaps, 64);

        // Create feature map planes
        const color = ColorUtils.parseColor(
            layerData.visualization?.color || ColorUtils.getDefaultLayerColor(layerData.type)
        );

        for (let i = 0; i < numMaps; i++) {
            const plane = BABYLON.MeshBuilder.CreatePlane(
                `featuremap_${layerData.id}_${i}`,
                {
                    width: mapSize.width,
                    height: mapSize.height
                },
                this.scene
            );

            // Make feature maps non-pickable so they don't interfere with layer picking
            plane.isPickable = false;

            // Create material
            const material = new BABYLON.StandardMaterial(
                `fmmat_${layerData.id}_${i}`,
                this.scene
            );
            material.diffuseColor = ColorUtils.lighten(color, 0.1 * (i / numMaps));
            material.emissiveColor = color.scale(0.2);
            material.alpha = 0.85;
            material.backFaceCulling = false; // Show both sides
            plane.material = material;

            // Add thin border
            plane.enableEdgesRendering();
            plane.edgesWidth = 1.5;
            plane.edgesColor = new BABYLON.Color4(color.r, color.g, color.b, 1);

            // Start at center position (will be animated)
            plane.position = centerPosition.clone();
            plane.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01); // Start tiny

            // Store target position
            const targetPosition = this._calculateFeatureMapPosition(
                i,
                numMaps,
                centerPosition,
                mapSize
            );

            featureMaps.push({
                mesh: plane,
                targetPosition: targetPosition,
                index: i,
                channelIndex: i  // For activation mapping
            });
        }

        return featureMaps;
    }

    /**
     * Calculate position for a feature map in the expansion
     * @private
     */
    _calculateFeatureMapPosition(index, totalMaps, centerPosition, mapSize) {
        // Arrange in a grid
        const cols = Math.ceil(Math.sqrt(totalMaps));
        const rows = Math.ceil(totalMaps / cols);

        const row = Math.floor(index / cols);
        const col = index % cols;

        const spacing = 0.3;
        const gridWidth = cols * (mapSize.width + spacing);
        const gridHeight = rows * (mapSize.height + spacing);

        const offsetX = (col - (cols - 1) / 2) * (mapSize.width + spacing);
        const offsetY = (row - (rows - 1) / 2) * (mapSize.height + spacing);
        const offsetZ = 2.0; // Move forward from layer

        return new BABYLON.Vector3(
            centerPosition.x + offsetX,
            centerPosition.y + offsetY,
            centerPosition.z + offsetZ
        );
    }

    /**
     * Animate feature maps expanding
     * @private
     */
    async _animateExpansion(featureMaps, centerPosition) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const duration = this.animationDuration;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                const eased = this._easeOutCubic(progress);

                featureMaps.forEach((fm, index) => {
                    // Stagger animation slightly
                    const staggerDelay = (index / featureMaps.length) * 0.3;
                    const adjustedProgress = Math.max(0, Math.min(1, (progress - staggerDelay) / 0.7));
                    const staggerEased = this._easeOutCubic(adjustedProgress);

                    // Position interpolation
                    fm.mesh.position = BABYLON.Vector3.Lerp(
                        centerPosition,
                        fm.targetPosition,
                        staggerEased
                    );

                    // Scale interpolation
                    const scale = staggerEased;
                    fm.mesh.scaling = new BABYLON.Vector3(scale, scale, scale);

                    // Fade in
                    if (fm.mesh.material) {
                        fm.mesh.material.alpha = 0.85 * staggerEased;
                    }
                });

                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Animate feature maps collapsing
     * @private
     */
    async _animateCollapse(featureMaps, centerPosition) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const duration = this.animationDuration * 0.7; // Faster collapse

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                const eased = this._easeInCubic(progress);

                featureMaps.forEach((fm) => {
                    // Position interpolation (back to center)
                    fm.mesh.position = BABYLON.Vector3.Lerp(
                        fm.targetPosition,
                        centerPosition,
                        eased
                    );

                    // Scale down
                    const scale = 1.0 - eased;
                    fm.mesh.scaling = new BABYLON.Vector3(scale, scale, scale);

                    // Fade out
                    if (fm.mesh.material) {
                        fm.mesh.material.alpha = 0.85 * (1.0 - eased);
                    }
                });

                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Easing functions
     * @private
     */
    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    _easeInCubic(t) {
        return t * t * t;
    }

    /**
     * Check if layer is expanded
     * @param {string} layerId - Layer ID
     * @returns {boolean}
     */
    isExpanded(layerId) {
        return this.expandedLayers.has(layerId);
    }

    /**
     * Collapse all expanded layers
     */
    async collapseAll() {
        const layerIds = Array.from(this.expandedLayers.keys());
        for (const layerId of layerIds) {
            await this.collapseLayer(layerId);
        }
    }

    /**
     * Dispose all resources
     */
    dispose() {
        this.collapseAll();
        this.expandedLayers.clear();
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayerExpansionController;
}
