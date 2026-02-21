/**
 * ModelVisualizer
 * Main orchestrator that coordinates model loading, layout, and rendering
 */

class ModelVisualizer {
    constructor() {
        this.sceneManager = null;
        this.modelLoader = null;
        this.registry = null;
        this.connectionRenderer = null;
        this.expansionController = null;
        this.layerMeshMap = new Map();
        this.initialized = false;
    }

    /**
     * Initialize and visualize a model
     * @param {string|Object} modelDataOrUrl - Model JSON data or URL to JSON file
     * @param {string} canvasId - ID of the canvas element
     * @returns {Promise<void>}
     */
    async visualizeModel(modelDataOrUrl, canvasId) {
        try {
            // Initialize scene
            this.sceneManager = new Scene3DManager();
            const sceneInitialized = this.sceneManager.initialize(canvasId);

            if (!sceneInitialized) {
                throw new Error('Failed to initialize 3D scene');
            }

            // Load model data
            this.modelLoader = new ModelLoader();

            if (typeof modelDataOrUrl === 'string') {
                await this.modelLoader.loadFromURL(modelDataOrUrl);
            } else {
                await this.modelLoader.loadFromObject(modelDataOrUrl);
            }

            // Setup registry with all visualizers
            this._setupRegistry();

            // Get data
            const layers = this.modelLoader.getLayers();
            const connections = this.modelLoader.getConnections();
            const hints = this.modelLoader.getVisualizationHints();
            const topology = this.modelLoader.getTopology();
            const architecture = this.modelLoader.getArchitecture();

            // Determine layout
            const layout = this._determineLayout(architecture, hints);
            console.log(`Using layout: ${layout}`);

            // Calculate positions
            const positions = this._calculateLayerPositions(
                layers,
                connections,
                topology,
                hints,
                layout
            );

            // Create layer meshes
            this._createLayerMeshes(layers, positions);

            // Create connections
            this._createConnections(connections);

            // Setup camera
            this._setupCamera(layers, hints, layout);

            // Initialize expansion controller
            this.expansionController = new LayerExpansionController(this.sceneManager.getScene());

            // Setup click handlers for layer expansion
            this._setupClickHandlers();

            // Start render loop
            this.sceneManager.startRenderLoop();

            this.initialized = true;
            console.log('Model visualization complete!');

            // Log summary
            this._logSummary();

        } catch (error) {
            console.error('Error visualizing model:', error);
            throw error;
        }
    }

    /**
     * Setup layer visualizer registry
     * @private
     */
    _setupRegistry() {
        this.registry = new LayerVisualizerRegistry();

        // Register convolutional visualizers
        this.registry.register('Conv1d', ConvolutionalVisualizer.visualizeConv1d.bind(ConvolutionalVisualizer));
        this.registry.register('Conv2d', ConvolutionalVisualizer.visualizeConv2d.bind(ConvolutionalVisualizer));
        this.registry.register('Conv3d', ConvolutionalVisualizer.visualizeConv3d.bind(ConvolutionalVisualizer));

        // Register pooling visualizers
        this.registry.register('MaxPool1d', PoolingVisualizer.visualizeMaxPool1d.bind(PoolingVisualizer));
        this.registry.register('MaxPool2d', PoolingVisualizer.visualizeMaxPool2d.bind(PoolingVisualizer));
        this.registry.register('AvgPool1d', PoolingVisualizer.visualizeAvgPool1d.bind(PoolingVisualizer));
        this.registry.register('AvgPool2d', PoolingVisualizer.visualizeAvgPool2d.bind(PoolingVisualizer));
        this.registry.register('AdaptiveAvgPool2d', PoolingVisualizer.visualizeAdaptiveAvgPool2d.bind(PoolingVisualizer));

        // Register dense visualizers
        this.registry.register('Linear', DenseVisualizer.visualizeLinear.bind(DenseVisualizer));
        this.registry.register('Dense', DenseVisualizer.visualizeDense.bind(DenseVisualizer));

        // Register activation visualizers
        this.registry.register('ReLU', ActivationVisualizer.visualizeReLU.bind(ActivationVisualizer));
        this.registry.register('Sigmoid', ActivationVisualizer.visualizeSigmoid.bind(ActivationVisualizer));
        this.registry.register('Tanh', ActivationVisualizer.visualizeTanh.bind(ActivationVisualizer));
        this.registry.register('Softmax', ActivationVisualizer.visualizeSoftmax.bind(ActivationVisualizer));
        this.registry.register('LeakyReLU', ActivationVisualizer.visualizeLeakyReLU.bind(ActivationVisualizer));

        // Register normalization visualizers
        this.registry.register('BatchNorm1d', NormalizationVisualizer.visualizeBatchNorm1d.bind(NormalizationVisualizer));
        this.registry.register('BatchNorm2d', NormalizationVisualizer.visualizeBatchNorm2d.bind(NormalizationVisualizer));
        this.registry.register('LayerNorm', NormalizationVisualizer.visualizeLayerNorm.bind(NormalizationVisualizer));
        this.registry.register('GroupNorm', NormalizationVisualizer.visualizeGroupNorm.bind(NormalizationVisualizer));

        // Register utility visualizers
        this.registry.register('Flatten', UtilityVisualizer.visualizeFlatten.bind(UtilityVisualizer));
        this.registry.register('Dropout', UtilityVisualizer.visualizeDropout.bind(UtilityVisualizer));
        this.registry.register('Dropout2d', UtilityVisualizer.visualizeDropout2d.bind(UtilityVisualizer));

        // Register input/output visualizers
        this.registry.register('Input', InputOutputVisualizer.visualizeInput.bind(InputOutputVisualizer));
        this.registry.register('Output', InputOutputVisualizer.visualizeOutput.bind(InputOutputVisualizer));
        this.registry.register('Output1d', InputOutputVisualizer.visualizeOutput1d.bind(InputOutputVisualizer));

        // Register transformer visualizers (if available)
        if (typeof EmbeddingVisualizer !== 'undefined') {
            this.registry.register('Embedding', EmbeddingVisualizer.visualizeEmbedding.bind(EmbeddingVisualizer));
            this.registry.register('PositionalEncoding', EmbeddingVisualizer.visualizePositionalEncoding.bind(EmbeddingVisualizer));
        }

        if (typeof AttentionLayerVisualizer !== 'undefined') {
            this.registry.register('MultiHeadAttention', AttentionLayerVisualizer.visualizeMultiHeadAttention.bind(AttentionLayerVisualizer));
            this.registry.register('MultiheadAttention', AttentionLayerVisualizer.visualizeMultiHeadAttention.bind(AttentionLayerVisualizer));
            this.registry.register('SelfAttention', AttentionLayerVisualizer.visualizeSelfAttention.bind(AttentionLayerVisualizer));
            this.registry.register('CrossAttention', AttentionLayerVisualizer.visualizeCrossAttention.bind(AttentionLayerVisualizer));
        }

        if (typeof TransformerBlockVisualizer !== 'undefined') {
            this.registry.register('TransformerEncoderLayer', TransformerBlockVisualizer.visualizeEncoderBlock.bind(TransformerBlockVisualizer));
            this.registry.register('TransformerDecoderLayer', TransformerBlockVisualizer.visualizeDecoderBlock.bind(TransformerBlockVisualizer));
            this.registry.register('BertLayer', TransformerBlockVisualizer.visualizeEncoderBlock.bind(TransformerBlockVisualizer));
            this.registry.register('GPT2Block', TransformerBlockVisualizer.visualizeDecoderBlock.bind(TransformerBlockVisualizer));
        }

        // Set default visualizer
        this.registry.setDefaultVisualizer(DefaultVisualizer.visualizeDefault.bind(DefaultVisualizer));

        console.log(`Registry initialized with ${this.registry.count()} visualizers`);
    }

    /**
     * Determine which layout to use
     * @private
     */
    _determineLayout(architecture, hints) {
        // Check hints first
        const suggestedLayout = hints.suggested_layout;

        if (suggestedLayout === 'hierarchical') {
            return 'hierarchical';
        } else if (suggestedLayout === 'linear') {
            return 'linear';
        } else if (suggestedLayout === 'transformer') {
            return 'transformer';
        }

        // Auto-detect based on architecture
        const archType = (architecture.architecture_type || '').toLowerCase();

        // Check for transformer architectures
        if (archType.includes('transformer') || archType.includes('bert') ||
            archType.includes('gpt') || archType.includes('attention')) {
            return 'transformer';
        }

        if (archType === 'resnet' || archType === 'densenet' || architecture.has_skip_connections) {
            return 'hierarchical';
        }

        // Default to linear
        return 'linear';
    }

    /**
     * Calculate layer positions using appropriate layout
     * @private
     */
    _calculateLayerPositions(layers, connections, topology, hints, layout) {
        if (layout === 'hierarchical') {
            return HierarchicalLayout.calculatePositions(layers, connections, topology, hints);
        } else if (layout === 'transformer' && typeof TransformerLayout !== 'undefined') {
            return TransformerLayout.calculatePositions(layers, hints);
        } else {
            return LinearLayout.calculatePositions(layers, hints);
        }
    }

    /**
     * Create meshes for all layers
     * @private
     */
    _createLayerMeshes(layers, positions) {
        const scene = this.sceneManager.getScene();

        layers.forEach(layer => {
            const position = positions.get(layer.id);

            if (!position) {
                console.warn(`No position calculated for layer: ${layer.id}`);
                return;
            }

            // Create mesh using registry
            const meshData = this.registry.createLayerMesh(layer, scene, position);

            if (meshData) {
                this.layerMeshMap.set(layer.id, meshData);
            } else {
                console.error(`Failed to create mesh for layer: ${layer.id}`);
            }
        });

        console.log(`Created ${this.layerMeshMap.size} layer meshes`);
    }

    /**
     * Create connection renderers
     * @private
     */
    _createConnections(connections) {
        const scene = this.sceneManager.getScene();
        this.connectionRenderer = new ConnectionRenderer(scene);

        this.connectionRenderer.renderAllConnections(this.layerMeshMap, connections);
    }

    /**
     * Setup camera based on layout and hints
     * @private
     */
    _setupCamera(layers, hints, layout) {
        let cameraPosition;

        if (layout === 'hierarchical') {
            cameraPosition = HierarchicalLayout.getRecommendedCameraPosition(layers, hints);
        } else {
            cameraPosition = LinearLayout.getRecommendedCameraPosition(layers, hints);
        }

        this.sceneManager.setCameraPosition(cameraPosition);
    }

    /**
     * Setup click handlers for layer expansion
     * @private
     */
    _setupClickHandlers() {
        const scene = this.sceneManager.getScene();

        scene.onPointerDown = (evt, pickResult) => {
            if (pickResult.hit && pickResult.pickedMesh) {
                const mesh = pickResult.pickedMesh;

                // Check if mesh has layer metadata
                if (mesh.metadata && mesh.metadata.layerId) {
                    const layerId = mesh.metadata.layerId;
                    const meshData = this.layerMeshMap.get(layerId);
                    const layerData = this.modelLoader.getLayerById(layerId);

                    if (meshData && layerData) {
                        // Toggle expansion
                        this.expansionController.toggleExpansion(layerId, meshData, layerData);

                        // IMPORTANT: If activations are available and layer was just expanded,
                        // trigger an event so the page can apply activations
                        // This is handled by checking in a short timeout if layer is now expanded
                        setTimeout(() => {
                            if (this.expansionController.isExpanded(layerId)) {
                                // Trigger custom event that the page can listen to
                                const event = new CustomEvent('layerExpanded', {
                                    detail: { layerId, layerData }
                                });
                                window.dispatchEvent(event);
                            }
                        }, 100);
                    }
                }
            }
        };
    }

    /**
     * Log summary of visualization
     * @private
     */
    _logSummary() {
        const metadata = this.modelLoader.getMetadata();

        console.log('═══════════════════════════════════════');
        console.log('  3D Model Visualization Summary');
        console.log('═══════════════════════════════════════');
        console.log(`Model: ${metadata.model_name}`);
        console.log(`Framework: ${metadata.framework}`);
        console.log(`Total Layers: ${metadata.total_layers}`);
        console.log(`Total Parameters: ${metadata.total_parameters?.toLocaleString()}`);
        console.log(`Layer Meshes Created: ${this.layerMeshMap.size}`);
        console.log(`Connections Rendered: ${this.connectionRenderer.getConnectionCount()}`);
        console.log('═══════════════════════════════════════');
    }

    /**
     * Toggle connection visibility
     * @param {boolean} visible - Whether connections should be visible
     */
    toggleConnections(visible) {
        if (this.connectionRenderer) {
            this.connectionRenderer.setConnectionVisibility(visible);
        }
    }

    /**
     * Get layer mesh by ID
     * @param {string} layerId - Layer ID
     * @returns {Object|null} Mesh data
     */
    getLayerMesh(layerId) {
        return this.layerMeshMap.get(layerId) || null;
    }

    /**
     * Focus camera on a specific layer
     * @param {string} layerId - Layer ID to focus on
     */
    focusOnLayer(layerId) {
        const meshData = this.layerMeshMap.get(layerId);

        if (meshData && meshData.mesh) {
            this.sceneManager.focusOnMesh(meshData.mesh);
        } else {
            console.warn(`Layer not found: ${layerId}`);
        }
    }

    /**
     * Reset camera to default position
     */
    resetCamera() {
        const layers = this.modelLoader.getLayers();
        const hints = this.modelLoader.getVisualizationHints();
        const architecture = this.modelLoader.getArchitecture();
        const layout = this._determineLayout(architecture, hints);

        this._setupCamera(layers, hints, layout);
    }

    /**
     * Get model metadata
     * @returns {Object} Metadata
     */
    getMetadata() {
        return this.modelLoader?.getMetadata() || null;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        if (this.expansionController) {
            this.expansionController.dispose();
        }

        if (this.connectionRenderer) {
            this.connectionRenderer.clear();
        }

        this.layerMeshMap.clear();

        if (this.sceneManager) {
            this.sceneManager.dispose();
        }

        this.initialized = false;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelVisualizer;
}
