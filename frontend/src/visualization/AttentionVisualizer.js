/**
 * AttentionVisualizer
 * Interactive visualization of transformer attention weights
 * Supports 3 modes: Heatmap, Arc, and Matrix
 */

class AttentionVisualizer {
    /**
     * @param {BABYLON.Scene} scene - BabylonJS scene
     */
    constructor(scene) {
        this.scene = scene;
        this.currentMode = 'heatmap';
        this.currentHead = 0;
        this.opacity = 0.8;
        this.threshold = 0.1;

        // Store created meshes for cleanup
        this.meshes = [];
        this.gui = null;
    }

    // =====================================================
    // MAIN API
    // =====================================================

    /**
     * Visualize attention weights
     * @param {Object} data - Attention data { tokens, attention_weights, num_heads }
     * @param {BABYLON.Vector3} position - Position for visualization
     * @param {string} mode - 'heatmap', 'arc', or 'matrix'
     * @returns {Object} { meshes, gui }
     */
    visualizeAttention(data, position, mode = 'heatmap') {
        // Clear previous visualization
        this.clear();

        this.currentMode = mode;
        const tokens = data.tokens || [];
        const weights = this._extractWeightsForHead(data.attention_weights, this.currentHead);
        const numHeads = data.num_heads || 12;

        let result;
        switch (mode) {
            case 'arc':
                result = this._createArcs(tokens, weights, position);
                break;
            case 'matrix':
                result = this._createMatrix(tokens, weights, position);
                break;
            case 'heatmap':
            default:
                result = this._createHeatmap(tokens, weights, position);
                break;
        }

        // Add UI controls
        this.gui = this._createUIControls(data, position);

        return {
            meshes: this.meshes,
            gui: this.gui
        };
    }

    /**
     * Clear all created meshes and UI
     */
    clear() {
        this.meshes.forEach(mesh => {
            if (mesh && !mesh.isDisposed()) {
                mesh.dispose();
            }
        });
        this.meshes = [];

        if (this.gui) {
            this.gui.dispose();
            this.gui = null;
        }
    }

    // =====================================================
    // HEATMAP MODE
    // =====================================================

    /**
     * Create heatmap visualization using DynamicTexture
     * @private
     */
    _createHeatmap(tokens, weights, position) {
        const seqLen = tokens.length;
        const size = Math.max(2, seqLen);
        const planeSize = 4.0;

        // Create plane
        const plane = BABYLON.MeshBuilder.CreatePlane(
            'attention_heatmap',
            { width: planeSize, height: planeSize },
            this.scene
        );
        plane.position = position.clone();
        plane.rotation.x = -Math.PI / 4; // Tilt for visibility

        // Create dynamic texture
        const textureSize = Math.max(256, size * 32);
        const texture = new BABYLON.DynamicTexture(
            'attention_heatmap_texture',
            { width: textureSize, height: textureSize },
            this.scene,
            false
        );

        const ctx = texture.getContext();
        this._drawHeatmapToCanvas(ctx, weights, tokens, textureSize);
        texture.update();

        // Material
        const material = new BABYLON.StandardMaterial('attention_heatmap_mat', this.scene);
        material.diffuseTexture = texture;
        material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.backFaceCulling = false;
        material.alpha = this.opacity;
        plane.material = material;

        // Add interactivity
        this._addHoverInteraction(plane, tokens, weights);

        this.meshes.push(plane);

        // Add axis labels
        this._addAxisLabels(tokens, position, planeSize);

        return { plane, texture };
    }

    /**
     * Draw heatmap to canvas context
     * @private
     */
    _drawHeatmapToCanvas(ctx, weights, tokens, size) {
        const seqLen = tokens.length;
        const cellSize = size / seqLen;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);

        // Draw cells
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < seqLen; j++) {
                const weight = weights[i]?.[j] || 0;
                const color = this._viridisColor(weight);

                ctx.fillStyle = color;
                ctx.fillRect(j * cellSize, i * cellSize, cellSize - 1, cellSize - 1);
            }
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= seqLen; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, size);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(size, i * cellSize);
            ctx.stroke();
        }
    }

    // =====================================================
    // ARC MODE
    // =====================================================

    /**
     * Create arc visualization for token-to-token attention
     * @private
     */
    _createArcs(tokens, weights, position) {
        const seqLen = tokens.length;
        const spacing = 0.6;
        const totalWidth = seqLen * spacing;

        // Create token labels/boxes
        for (let i = 0; i < seqLen; i++) {
            const tokenPos = new BABYLON.Vector3(
                position.x - totalWidth / 2 + i * spacing,
                position.y,
                position.z
            );
            const tokenMesh = this._createTokenBox(tokens[i], tokenPos, i);
            this.meshes.push(tokenMesh);
        }

        // Create arcs for significant attention weights
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < seqLen; j++) {
                const weight = weights[i]?.[j] || 0;

                if (weight >= this.threshold && i !== j) {
                    const fromPos = new BABYLON.Vector3(
                        position.x - totalWidth / 2 + i * spacing,
                        position.y + 0.3,
                        position.z
                    );
                    const toPos = new BABYLON.Vector3(
                        position.x - totalWidth / 2 + j * spacing,
                        position.y + 0.3,
                        position.z
                    );

                    const arc = this._createArcConnection(fromPos, toPos, weight, i, j);
                    this.meshes.push(arc);
                }
            }
        }

        return { tokens: this.meshes };
    }

    /**
     * Create a single token box
     * @private
     */
    _createTokenBox(token, position, index) {
        const box = BABYLON.MeshBuilder.CreateBox(
            `token_${index}`,
            { width: 0.5, height: 0.3, depth: 0.1 },
            this.scene
        );
        box.position = position;

        const material = new BABYLON.StandardMaterial(`token_${index}_mat`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.5);
        box.material = material;

        box.metadata = { token, index };

        return box;
    }

    /**
     * Create curved arc between tokens
     * @private
     */
    _createArcConnection(fromPos, toPos, weight, fromIdx, toIdx) {
        const distance = BABYLON.Vector3.Distance(fromPos, toPos);
        const arcHeight = Math.min(distance * 0.5, 2.0);

        // Create arc path
        const midPoint = BABYLON.Vector3.Lerp(fromPos, toPos, 0.5);
        midPoint.y += arcHeight;

        const path = [
            fromPos.clone(),
            midPoint.clone(),
            toPos.clone()
        ];

        // Smooth the path
        const curve = BABYLON.Curve3.CreateCatmullRomSpline(path, 15, false);

        // Create tube with thickness based on weight
        const radius = 0.02 + weight * 0.05;
        const tube = BABYLON.MeshBuilder.CreateTube(
            `arc_${fromIdx}_${toIdx}`,
            {
                path: curve.getPoints(),
                radius: radius,
                tessellation: 8
            },
            this.scene
        );

        // Color based on weight
        const material = new BABYLON.StandardMaterial(`arc_${fromIdx}_${toIdx}_mat`, this.scene);
        const color = this._viridisColor(weight);
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.emissiveColor = BABYLON.Color3.FromHexString(color).scale(0.3);
        material.alpha = 0.6 + weight * 0.4;
        tube.material = material;

        tube.metadata = { fromIdx, toIdx, weight };

        return tube;
    }

    // =====================================================
    // MATRIX MODE
    // =====================================================

    /**
     * Create traditional matrix grid visualization
     * @private
     */
    _createMatrix(tokens, weights, position) {
        const seqLen = tokens.length;
        const cellSize = 0.3;
        const totalSize = seqLen * cellSize;

        // Create cell meshes
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < seqLen; j++) {
                const weight = weights[i]?.[j] || 0;
                const cellPos = new BABYLON.Vector3(
                    position.x - totalSize / 2 + j * cellSize + cellSize / 2,
                    position.y + totalSize / 2 - i * cellSize - cellSize / 2,
                    position.z
                );

                const cell = this._createMatrixCell(i, j, weight, cellPos, cellSize);
                this.meshes.push(cell);
            }
        }

        return { cells: this.meshes };
    }

    /**
     * Create a single matrix cell
     * @private
     */
    _createMatrixCell(row, col, weight, position, size) {
        const box = BABYLON.MeshBuilder.CreateBox(
            `cell_${row}_${col}`,
            { width: size * 0.9, height: size * 0.9, depth: 0.05 },
            this.scene
        );
        box.position = position;

        const material = new BABYLON.StandardMaterial(`cell_${row}_${col}_mat`, this.scene);
        const color = this._viridisColor(weight);
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
        material.alpha = 0.5 + weight * 0.5;
        box.material = material;

        box.metadata = { row, col, weight };

        return box;
    }

    // =====================================================
    // UI CONTROLS
    // =====================================================

    /**
     * Create UI controls using BabylonJS GUI
     * @private
     */
    _createUIControls(data, position) {
        // Create fullscreen UI
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('attentionUI');

        // Create panel
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = '200px';
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        panel.paddingTop = '20px';
        panel.paddingRight = '20px';
        advancedTexture.addControl(panel);

        // Title
        const title = new BABYLON.GUI.TextBlock();
        title.text = 'Attention Controls';
        title.height = '30px';
        title.color = 'white';
        title.fontSize = 16;
        panel.addControl(title);

        // Head selector label
        const headLabel = new BABYLON.GUI.TextBlock();
        headLabel.text = `Head: ${this.currentHead + 1}/${data.num_heads}`;
        headLabel.height = '25px';
        headLabel.color = 'white';
        headLabel.fontSize = 14;
        panel.addControl(headLabel);

        // Head slider
        const headSlider = new BABYLON.GUI.Slider();
        headSlider.minimum = 0;
        headSlider.maximum = data.num_heads - 1;
        headSlider.value = this.currentHead;
        headSlider.height = '20px';
        headSlider.width = '180px';
        headSlider.color = '#3498db';
        headSlider.background = '#2c3e50';
        headSlider.onValueChangedObservable.add((value) => {
            this.currentHead = Math.round(value);
            headLabel.text = `Head: ${this.currentHead + 1}/${data.num_heads}`;
            // Re-render with new head
            this.visualizeAttention(data, position, this.currentMode);
        });
        panel.addControl(headSlider);

        // Opacity label
        const opacityLabel = new BABYLON.GUI.TextBlock();
        opacityLabel.text = `Opacity: ${Math.round(this.opacity * 100)}%`;
        opacityLabel.height = '25px';
        opacityLabel.color = 'white';
        opacityLabel.fontSize = 14;
        opacityLabel.paddingTop = '10px';
        panel.addControl(opacityLabel);

        // Opacity slider
        const opacitySlider = new BABYLON.GUI.Slider();
        opacitySlider.minimum = 0;
        opacitySlider.maximum = 1;
        opacitySlider.value = this.opacity;
        opacitySlider.height = '20px';
        opacitySlider.width = '180px';
        opacitySlider.color = '#9b59b6';
        opacitySlider.background = '#2c3e50';
        opacitySlider.onValueChangedObservable.add((value) => {
            this.opacity = value;
            opacityLabel.text = `Opacity: ${Math.round(value * 100)}%`;
            this.meshes.forEach(mesh => {
                if (mesh.material) {
                    mesh.material.alpha = value;
                }
            });
        });
        panel.addControl(opacitySlider);

        // Mode buttons
        const modeLabel = new BABYLON.GUI.TextBlock();
        modeLabel.text = 'Visualization Mode';
        modeLabel.height = '25px';
        modeLabel.color = 'white';
        modeLabel.fontSize = 14;
        modeLabel.paddingTop = '15px';
        panel.addControl(modeLabel);

        const modes = ['heatmap', 'arc', 'matrix'];
        modes.forEach(mode => {
            const button = BABYLON.GUI.Button.CreateSimpleButton(`btn_${mode}`, mode.charAt(0).toUpperCase() + mode.slice(1));
            button.width = '180px';
            button.height = '30px';
            button.color = 'white';
            button.background = mode === this.currentMode ? '#3498db' : '#34495e';
            button.paddingTop = '5px';
            button.onPointerClickObservable.add(() => {
                this.visualizeAttention(data, position, mode);
            });
            panel.addControl(button);
        });

        return advancedTexture;
    }

    // =====================================================
    // UTILITIES
    // =====================================================

    /**
     * Extract weights for a specific attention head
     * @private
     */
    _extractWeightsForHead(attentionWeights, headIndex) {
        // Handle different formats
        if (Array.isArray(attentionWeights)) {
            // Direct array format [heads, seq, seq]
            return attentionWeights[headIndex] || attentionWeights[0] || [];
        } else if (attentionWeights && typeof attentionWeights === 'object') {
            // Object format with 'data' key
            const data = attentionWeights.data || attentionWeights;
            if (Array.isArray(data)) {
                return data[headIndex] || data[0] || [];
            }
        }
        return [];
    }

    /**
     * Convert value to Viridis colormap hex string
     * @private
     */
    _viridisColor(value) {
        // Viridis color stops
        const stops = [
            { pos: 0.0, r: 68, g: 1, b: 84 },
            { pos: 0.25, r: 59, g: 82, b: 139 },
            { pos: 0.5, r: 33, g: 145, b: 140 },
            { pos: 0.75, r: 94, g: 201, b: 98 },
            { pos: 1.0, r: 253, g: 231, b: 37 }
        ];

        value = Math.max(0, Math.min(1, value));

        // Find surrounding stops
        let lower = stops[0], upper = stops[stops.length - 1];
        for (let i = 0; i < stops.length - 1; i++) {
            if (value >= stops[i].pos && value <= stops[i + 1].pos) {
                lower = stops[i];
                upper = stops[i + 1];
                break;
            }
        }

        // Interpolate
        const range = upper.pos - lower.pos;
        const t = range === 0 ? 0 : (value - lower.pos) / range;

        const r = Math.round(lower.r + t * (upper.r - lower.r));
        const g = Math.round(lower.g + t * (upper.g - lower.g));
        const b = Math.round(lower.b + t * (upper.b - lower.b));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Add hover interaction to mesh
     * @private
     */
    _addHoverInteraction(mesh, tokens, weights) {
        mesh.actionManager = new BABYLON.ActionManager(this.scene);

        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                (evt) => {
                    // Could show tooltip here
                    document.body.style.cursor = 'pointer';
                }
            )
        );

        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    document.body.style.cursor = 'default';
                }
            )
        );
    }

    /**
     * Add axis labels for heatmap
     * @private
     */
    _addAxisLabels(tokens, position, planeSize) {
        // Create labels as simple text planes
        // This is simplified - full implementation would use DynamicTexture for text
        const queryLabel = this._createTextPlane('Query →', position.clone());
        queryLabel.position.y -= planeSize / 2 + 0.3;
        this.meshes.push(queryLabel);

        const keyLabel = this._createTextPlane('Key ↓', position.clone());
        keyLabel.position.x -= planeSize / 2 + 0.3;
        keyLabel.rotation.z = Math.PI / 2;
        this.meshes.push(keyLabel);
    }

    /**
     * Create a simple text plane
     * @private
     */
    _createTextPlane(text, position) {
        const plane = BABYLON.MeshBuilder.CreatePlane(
            `label_${text.replace(/\s/g, '_')}`,
            { width: 1, height: 0.3 },
            this.scene
        );
        plane.position = position;

        const texture = new BABYLON.DynamicTexture(
            `label_texture_${text}`,
            { width: 128, height: 32 },
            this.scene,
            false
        );

        const ctx = texture.getContext();
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, 128, 32);
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(text, 64, 22);
        texture.update();
        texture.hasAlpha = true;

        const material = new BABYLON.StandardMaterial(`label_mat_${text}`, this.scene);
        material.diffuseTexture = texture;
        material.emissiveColor = new BABYLON.Color3(1, 1, 1);
        material.backFaceCulling = false;
        material.useAlphaFromDiffuseTexture = true;
        plane.material = material;

        return plane;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttentionVisualizer;
}
