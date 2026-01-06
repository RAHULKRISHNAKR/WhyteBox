/**
 * FeatureMapTexturer
 * Applies real activation data as textures to feature map meshes
 */

class FeatureMapTexturer {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Deserialize activation data from backend
     * @param {Object} serializedData - Serialized activation data
     * @returns {Float32Array} Activation array
     */
    deserializeActivation(serializedData) {
        const encoding = serializedData.encoding || 'direct';
        console.log(`Deserializing activation data with encoding: ${encoding}`);

        if (encoding === 'direct') {
            // Data is directly in array format
            const flat = this._flattenArray(serializedData.data);
            console.log(`Deserialized ${flat.length} values from direct encoding`);
            return new Float32Array(flat);
        } else if (encoding === 'base64_npy_float16') {
            // Need to decode base64 and convert from float16
            console.warn('Base64 numpy decoding not fully implemented in browser');
            console.warn('This would require a numpy.js library or custom decoder');
            // For now, return empty array - would need proper numpy.js or similar
            return new Float32Array(0);
        } else {
            console.error('Unknown encoding:', encoding);
            console.error('Supported encodings: direct, base64_npy_float16');
            return new Float32Array(0);
        }
    }

    /**
     * Flatten nested array to 1D
     * @private
     */
    _flattenArray(arr) {
        if (!Array.isArray(arr)) {
            return [arr];
        }

        return arr.reduce((flat, item) => {
            return flat.concat(Array.isArray(item) ? this._flattenArray(item) : item);
        }, []);
    }

    /**
     * Create texture from activation data
     * @param {Float32Array} activations - Activation values
     * @param {Array} shape - Shape [batch, channels, height, width] or similar
     * @param {number} channelIndex - Which channel to visualize
     * @returns {BABYLON.Texture} Dynamic texture
     */
    createActivationTexture(activations, shape, channelIndex = 0) {
        console.log(`Creating activation texture for channel ${channelIndex}`, { shape, dataLength: activations.length });

        // Extract dimensions based on shape
        let width, height, numChannels;

        if (shape.length === 4) {
            // 4D tensor: [batch, channels, height, width] (PyTorch)
            // or [batch, height, width, channels] (Keras/TF)
            // Detect format based on dimension sizes
            if (shape[1] < shape[3]) {
                // PyTorch format: [batch, channels, height, width]
                numChannels = shape[1];
                height = shape[2];
                width = shape[3];
                console.log('Detected PyTorch format (NCHW)');
            } else {
                // Keras/TF format: [batch, height, width, channels]
                height = shape[1];
                width = shape[2];
                numChannels = shape[3];
                console.log('Detected Keras/TF format (NHWC)');
            }
        } else if (shape.length === 3) {
            // 3D tensor (batch dimension removed): [channels, height, width] (PyTorch)
            // or [height, width, channels] (Keras/TF)
            if (shape[0] < shape[2]) {
                // PyTorch format: [channels, height, width]
                numChannels = shape[0];
                height = shape[1];
                width = shape[2];
                console.log('Detected PyTorch 3D format (CHW)');
            } else {
                // Keras/TF format: [height, width, channels]
                height = shape[0];
                width = shape[1];
                numChannels = shape[2];
                console.log('Detected Keras/TF 3D format (HWC)');
            }
        } else if (shape.length === 2) {
            // Dense layer: [batch, units] or just [units]
            // Create a 1D visualization
            width = shape[shape.length - 1];
            height = 1;
            numChannels = 1;
            console.log('Detected dense layer output');
        } else {
            console.warn('Unsupported shape:', shape);
            width = height = 16; // Fallback
            numChannels = 1;
        }

        // Validate dimensions
        if (width <= 0 || height <= 0) {
            console.error('Invalid dimensions:', { width, height, shape });
            width = height = 16; // Fallback
        }

        // Create dynamic texture
        const textureName = `activation_${Date.now()}_${channelIndex}`;
        const dynamicTexture = new BABYLON.DynamicTexture(
            textureName,
            { width: width, height: height },
            this.scene,
            false
        );

        // Get texture context
        const ctx = dynamicTexture.getContext();
        const imageData = ctx.createImageData(width, height);

        // Extract channel data and normalize
        const channelData = this._extractChannel(activations, shape, channelIndex);

        if (channelData.length === 0) {
            console.error('Channel extraction failed - no data extracted');
            return dynamicTexture;
        }

        console.log(`Extracted channel ${channelIndex}: ${channelData.length} values, expected: ${width * height}`);

        const normalized = this._normalizeActivations(channelData);

        // Apply colormap and fill image data
        const pixelCount = Math.min(normalized.length, width * height);
        for (let i = 0; i < pixelCount; i++) {
            const color = this._applyColormap(normalized[i]);
            const idx = i * 4;
            imageData.data[idx] = color.r;
            imageData.data[idx + 1] = color.g;
            imageData.data[idx + 2] = color.b;
            imageData.data[idx + 3] = 255; // Alpha
        }

        // Update texture
        ctx.putImageData(imageData, 0, 0);
        dynamicTexture.update();

        console.log(`✓ Created activation texture: ${width}x${height}`);
        return dynamicTexture;
    }

    /**
     * Extract single channel from activation array
     * @private
     */
    _extractChannel(activations, shape, channelIndex) {
        console.log(`Extracting channel ${channelIndex} from shape:`, shape);

        if (shape.length === 4) {
            // 4D tensor
            const [batch, dim1, dim2, dim3] = shape;

            // Detect PyTorch vs Keras/TF format
            if (dim1 < dim3) {
                // PyTorch format: [batch, channels, height, width]
                const numChannels = dim1;
                const height = dim2;
                const width = dim3;

                if (channelIndex >= numChannels) {
                    console.warn(`Channel index ${channelIndex} out of range (0-${numChannels - 1}), using 0`);
                    channelIndex = 0;
                }

                const channelSize = height * width;
                const batchOffset = 0; // Assuming batch 0
                const channelStart = batchOffset * (numChannels * channelSize) + channelIndex * channelSize;
                const channelEnd = channelStart + channelSize;

                console.log(`PyTorch 4D extraction: channel ${channelIndex}, range [${channelStart}:${channelEnd}], size ${channelSize}`);
                return activations.slice(channelStart, channelEnd);
            } else {
                // Keras/TF format: [batch, height, width, channels]
                const height = dim1;
                const width = dim2;
                const numChannels = dim3;

                if (channelIndex >= numChannels) {
                    console.warn(`Channel index ${channelIndex} out of range (0-${numChannels - 1}), using 0`);
                    channelIndex = 0;
                }

                // For NHWC, need to extract every Nth element
                const channelSize = height * width;
                const result = new Float32Array(channelSize);
                const batchOffset = 0; // Assuming batch 0

                for (let i = 0; i < channelSize; i++) {
                    const idx = batchOffset * (height * width * numChannels) + i * numChannels + channelIndex;
                    result[i] = activations[idx];
                }

                console.log(`Keras 4D extraction: channel ${channelIndex}, extracted ${result.length} values`);
                return result;
            }
        } else if (shape.length === 3) {
            // 3D tensor (batch dimension removed or squeezed)
            const [dim0, dim1, dim2] = shape;

            // Detect PyTorch vs Keras/TF format
            if (dim0 < dim2) {
                // PyTorch format: [channels, height, width]
                const numChannels = dim0;
                const height = dim1;
                const width = dim2;

                if (channelIndex >= numChannels) {
                    console.warn(`Channel index ${channelIndex} out of range (0-${numChannels - 1}), using 0`);
                    channelIndex = 0;
                }

                const channelSize = height * width;
                const channelStart = channelIndex * channelSize;
                const channelEnd = channelStart + channelSize;

                console.log(`PyTorch 3D extraction: channel ${channelIndex}, range [${channelStart}:${channelEnd}], size ${channelSize}`);
                return activations.slice(channelStart, channelEnd);
            } else {
                // Keras/TF format: [height, width, channels]
                const height = dim0;
                const width = dim1;
                const numChannels = dim2;

                if (channelIndex >= numChannels) {
                    console.warn(`Channel index ${channelIndex} out of range (0-${numChannels - 1}), using 0`);
                    channelIndex = 0;
                }

                // Extract every Nth element
                const channelSize = height * width;
                const result = new Float32Array(channelSize);

                for (let i = 0; i < channelSize; i++) {
                    const idx = i * numChannels + channelIndex;
                    result[i] = activations[idx];
                }

                console.log(`Keras 3D extraction: channel ${channelIndex}, extracted ${result.length} values`);
                return result;
            }
        } else if (shape.length === 2) {
            // Dense layer: [batch, units] - return all values
            console.log(`Dense layer extraction: returning all ${activations.length} values`);
            return activations;
        }

        console.warn('Unsupported shape for channel extraction, returning all activations');
        return activations;
    }

    /**
     * Normalize activation values to [0, 1]
     * @private
     */
    _normalizeActivations(activations) {
        if (activations.length === 0) return [];

        const min = Math.min(...activations);
        const max = Math.max(...activations);
        const range = max - min;

        if (range === 0) {
            // All values are the same
            return new Array(activations.length).fill(0.5);
        }

        return activations.map(v => (v - min) / range);
    }

    /**
     * Apply viridis colormap to normalized value
     * @private
     * @param {number} value - Normalized value [0, 1]
     * @returns {Object} RGB color {r, g, b}
     */
    _applyColormap(value) {
        // Viridis colormap approximation
        // Maps 0 (dark blue/purple) to 1 (yellow)

        if (value < 0.25) {
            // Dark purple to blue
            const t = value / 0.25;
            return {
                r: Math.floor(68 + (39 - 68) * t),
                g: Math.floor(1 + (75 - 1) * t),
                b: Math.floor(84 + (145 - 84) * t)
            };
        } else if (value < 0.5) {
            // Blue to cyan
            const t = (value - 0.25) / 0.25;
            return {
                r: Math.floor(39 + (31 - 39) * t),
                g: Math.floor(75 + (130 - 75) * t),
                b: Math.floor(145 + (142 - 145) * t)
            };
        } else if (value < 0.75) {
            // Cyan to green
            const t = (value - 0.5) / 0.25;
            return {
                r: Math.floor(31 + (122 - 31) * t),
                g: Math.floor(130 + (176 - 130) * t),
                b: Math.floor(142 + (88 - 142) * t)
            };
        } else {
            // Green to yellow
            const t = (value - 0.75) / 0.25;
            return {
                r: Math.floor(122 + (253 - 122) * t),
                g: Math.floor(176 + (231 - 176) * t),
                b: Math.floor(88 + (37 - 88) * t)
            };
        }
    }

    /**
     * Apply activation texture to a feature map mesh
     * @param {BABYLON.Mesh} mesh - Feature map mesh
     * @param {Object} activationData - Activation data from backend
     * @param {number} channelIndex - Channel index for this feature map
     */
    applyActivationToMesh(mesh, activationData, channelIndex = 0) {
        console.log(`Applying activation to mesh for channel ${channelIndex}`, {
            meshName: mesh?.name,
            hasActivationData: !!activationData,
            hasMaterial: !!mesh?.material
        });

        // Validate inputs
        if (!mesh) {
            console.error('Cannot apply activation: mesh is null/undefined');
            return;
        }

        if (!activationData) {
            console.error('Cannot apply activation: activationData is null/undefined');
            return;
        }

        if (!mesh.material) {
            console.error('Cannot apply activation: mesh has no material');
            return;
        }

        try {
            // Log activation data structure
            console.log('Activation data structure:', {
                encoding: activationData.encoding,
                shape: activationData.shape,
                hasData: !!activationData.data,
                dataType: typeof activationData.data
            });

            // Deserialize activation data
            const activations = this.deserializeActivation(activationData);

            if (!activations || activations.length === 0) {
                console.warn('Empty activation data after deserialization');
                return;
            }

            console.log(`Deserialized ${activations.length} activation values`);

            // Validate shape exists
            if (!activationData.shape || !Array.isArray(activationData.shape)) {
                console.error('Activation data missing valid shape array');
                return;
            }

            // Create texture from activation
            const texture = this.createActivationTexture(
                activations,
                activationData.shape,
                channelIndex
            );

            if (!texture) {
                console.error('Failed to create activation texture');
                return;
            }

            // Apply texture to material
            // Support both StandardMaterial and PBRMaterial
            if (mesh.material instanceof BABYLON.StandardMaterial) {
                mesh.material.diffuseTexture = texture;
                mesh.material.emissiveTexture = texture;
                mesh.material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                console.log(`✅ Applied activation texture to StandardMaterial (channel ${channelIndex})`);
            } else if (mesh.material instanceof BABYLON.PBRMaterial) {
                mesh.material.albedoTexture = texture;
                mesh.material.emissiveTexture = texture;
                mesh.material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                console.log(`✅ Applied activation texture to PBRMaterial (channel ${channelIndex})`);
            } else {
                console.warn(`Unknown material type: ${mesh.material.getClassName()}, attempting to apply texture anyway`);
                if (mesh.material.diffuseTexture !== undefined) {
                    mesh.material.diffuseTexture = texture;
                }
                if (mesh.material.emissiveTexture !== undefined) {
                    mesh.material.emissiveTexture = texture;
                }
            }

        } catch (error) {
            console.error('Error applying activation texture:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Create simple heatmap material for a value
     * @param {number} value - Normalized value [0, 1]
     * @returns {BABYLON.StandardMaterial}
     */
    createHeatmapMaterial(value) {
        const color = this._applyColormap(value);
        const babylonColor = new BABYLON.Color3(color.r / 255, color.g / 255, color.b / 255);

        const material = new BABYLON.StandardMaterial('heatmap_' + Date.now(), this.scene);
        material.diffuseColor = babylonColor;
        material.emissiveColor = babylonColor.scale(0.5);
        material.alpha = 0.9;

        return material;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeatureMapTexturer;
}
