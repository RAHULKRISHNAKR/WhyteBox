import * as tf from '@tensorflow/tfjs';

class CNNModel {
    constructor(modelPath) {
        this.modelPath = modelPath || '/models/pretrainedModel.json';
        this.model = null;
        this.tfModel = null;
        this.modelType = 'custom';
        
        // Updated model URLs with more reliable endpoints
        this.availableModels = {
            mobilenetv2: {
                url: 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json',
                inputShape: [1, 224, 224, 3]
            },
            mobilenetv1: {
                url: 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v1_1.0_224/model.json',
                inputShape: [1, 224, 224, 3]
            },
            custom: {
                url: '/models/pretrainedModel.json',
                inputShape: [1, 224, 224, 3]
            }
        };
        
        this.modelName = 'MobileNetV2';
        this.debug = true; // Enable detailed logging
    }

    async loadModel(modelType = 'embedded') {
        try {
            this.log(`Loading ${modelType} model...`);
            
            // ALWAYS prioritize the embedded model for visualization
            // This ensures we have something that works consistently
            if (modelType === 'embedded') {
                this.log("Using embedded model definition");
                // Store the model data in a standardized format
                const embeddedModel = this.createEmbeddedModel();
                this.model = embeddedModel; // Direct access to the model
                this.modelType = 'embedded';
                this.modelName = 'Simple CNN';
                return this.model;
            }
            
            // Special case for mobilenetv2 - use our carefully crafted model
            if (modelType === 'mobilenetv2-vis') {
                this.log("Using pre-defined MobileNetV2 visualization model");
                const mobileNetModel = this.createMobileNetV2Model();
                this.model = mobileNetModel;
                this.modelType = 'mobilenetv2-vis';
                this.modelName = 'MobileNetV2';
                return this.model;
            }
            
            // Load the local model file directly first to avoid network issues
            if (modelType === 'custom' || modelType === 'local') {
                try {
                    this.log("Loading local model from: " + this.modelPath);
                    const response = await fetch(this.modelPath);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch local model: ${response.status} ${response.statusText}`);
                    }
                    
                    const modelData = await response.json();
                    this.log("Local JSON model loaded successfully");
                    
                    // Ensure it has the expected structure
                    if (modelData && modelData.model && Array.isArray(modelData.model.layers)) {
                        this.model = modelData;
                        this.modelType = 'custom';
                        this.modelName = modelData.model.name || 'Custom CNN';
                        this.log(`Local model loaded with ${modelData.model.layers.length} layers`);
                        return this.model;
                    } else {
                        throw new Error("Local model JSON structure is invalid");
                    }
                } catch (localError) {
                    this.log("Error loading local model: " + localError.message);
                    // If local model fails, fall back to embedded model
                    const embeddedModel = this.createEmbeddedModel();
                    this.model = embeddedModel;
                    this.modelType = 'embedded';
                    this.modelName = 'Simple CNN (Local Fallback)';
                    return this.model;
                }
            }
            
            // Otherwise, try to load from predefined models
            const modelConfig = this.availableModels[modelType] || this.availableModels.mobilenetv2;
            const modelUrl = modelConfig.url;
            this.modelType = modelType;
            
            // Set human-readable model name
            switch(modelType) {
                case 'mobilenetv2':
                    this.modelName = 'MobileNetV2';
                    break;
                case 'mobilenetv1':
                    this.modelName = 'MobileNetV1';
                    break;
                default:
                    this.modelName = 'Custom CNN';
            }
            
            // Try multiple approaches to load the model
            this.log(`Loading model from: ${modelUrl}`);
            
            try {
                // Approach 1: Load using tf.loadLayersModel
                this.log("Attempting to load with tf.loadLayersModel");
                this.tfModel = await tf.loadLayersModel(modelUrl);
                this.log(`${this.modelName} loaded successfully as layers model`);
            } catch (error1) {
                this.log(`Error loading with tf.loadLayersModel: ${error1.message}`);
                
                try {
                    // Approach 2: Load using tf.loadGraphModel
                    this.log("Attempting to load with tf.loadGraphModel");
                    this.tfModel = await tf.loadGraphModel(modelUrl);
                    this.log(`${this.modelName} loaded successfully as graph model`);
                } catch (error2) {
                    this.log(`Error loading with tf.loadGraphModel: ${error2.message}`);
                    
                    // Fall back to embedded model
                    this.log("Using embedded model as fallback");
                    this.model = this.createEmbeddedModel();
                    this.modelType = 'embedded';
                    this.modelName = 'Simple CNN (Fallback)';
                    return this.model;
                }
            }
            
            // If we got here, we successfully loaded the model
            // Create visualization-friendly description
            this.model = this.createModelDescription(this.tfModel);
            this.logModelStructure(); // Debug the model structure
            
            // Validate the model structure
            if (!this.validateModelStructure(this.model)) {
                this.log("Warning: Created model has invalid structure, using embedded model instead");
                this.model = this.createEmbeddedModel();
                this.modelType = 'embedded';
                this.modelName += ' (Fallback)';
            }
            
            return this.model;
            
        } catch (error) {
            this.log(`Fatal error loading model: ${error.message}`);
            
            // Last resort fallback
            const embeddedModel = this.createEmbeddedModel();
            this.model = embeddedModel;
            this.modelType = 'embedded';
            this.modelName = 'Simple CNN (Emergency Fallback)';
            return this.model;
        }
    }
    
    // Debug helper to log model structure
    logModelStructure() {
        if (!this.model) return;
        
        try {
            const structure = {
                hasModel: !!this.model,
                hasModelProperty: !!(this.model && this.model.model),
                hasLayers: !!(this.model && this.model.model && this.model.model.layers),
                layersIsArray: !!(this.model && this.model.model && this.model.model.layers && Array.isArray(this.model.model.layers)),
                layerCount: this.model && this.model.model && this.model.model.layers ? this.model.model.layers.length : 0,
                firstLayer: this.model && this.model.model && this.model.model.layers && this.model.model.layers.length > 0 
                    ? JSON.stringify(this.model.model.layers[0]).substring(0, 100) + "..." 
                    : "N/A"
            };
            
            this.log("MODEL STRUCTURE DEBUG:");
            this.log(JSON.stringify(structure, null, 2));
        } catch (e) {
            this.log("Error logging model structure: " + e.message);
        }
    }

    // Create a guaranteed working embedded model
    createEmbeddedModel() {
        this.log("Creating embedded model");
        
        // Define the exact format expected by the visualizer
        return {
            model: {
                name: "Simple CNN Model",
                version: "1.0",
                layers: [
                    {
                        type: "conv2d",
                        name: "conv1",
                        filters: 32,
                        kernel_size: [3, 3],
                        activation: "relu",
                        input_shape: [224, 224, 3]
                    },
                    {
                        type: "maxpooling2d",
                        name: "pool1",
                        pool_size: [2, 2]
                    },
                    {
                        type: "conv2d",
                        name: "conv2",
                        filters: 64,
                        kernel_size: [3, 3],
                        activation: "relu"
                    },
                    {
                        type: "maxpooling2d",
                        name: "pool2",
                        pool_size: [2, 2]
                    },
                    {
                        type: "conv2d",
                        name: "conv3",
                        filters: 128,
                        kernel_size: [3, 3],
                        activation: "relu"
                    },
                    {
                        type: "maxpooling2d",
                        name: "pool3",
                        pool_size: [2, 2]
                    },
                    {
                        type: "flatten",
                        name: "flatten"
                    },
                    {
                        type: "dense",
                        name: "dense1",
                        units: 128,
                        activation: "relu"
                    },
                    {
                        type: "dropout",
                        name: "dropout",
                        rate: 0.5
                    },
                    {
                        type: "dense",
                        name: "dense2",
                        units: 10,
                        activation: "softmax"
                    }
                ]
            }
        };
    }

    createMobileNetV2Model() {
        this.log("Creating MobileNetV2 model");
        
        // Define the exact format expected by the visualizer
        return {
            model: {
                name: "MobileNetV2",
                version: "1.0",
                layers: [
                    {
                        type: "conv2d",
                        name: "Conv1",
                        filters: 32,
                        kernel_size: [3, 3],
                        strides: [2, 2],
                        activation: "relu6",
                        input_shape: [224, 224, 3]
                    },
                    {
                        type: "batchnorm",
                        name: "bn_Conv1"
                    },
                    // First block - expanded conv with depthwise + pointwise (bottleneck)
                    {
                        type: "depthwiseConv2d",
                        name: "expanded_conv_depthwise",
                        kernel_size: [3, 3],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "expanded_conv_depthwise_BN"
                    },
                    {
                        type: "activation",
                        name: "expanded_conv_depthwise_relu",
                        activation: "relu6"
                    },
                    {
                        type: "conv2d",
                        name: "expanded_conv_project",
                        filters: 16,
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "expanded_conv_project_BN"
                    },
                    
                    // Block 2 - expansion, depthwise, projection
                    {
                        type: "conv2d",
                        name: "block_1_expand",
                        filters: 96,  // expansion factor 6 from 16 channels
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_1_expand_BN"
                    },
                    {
                        type: "activation",
                        name: "block_1_expand_relu",
                        activation: "relu6"
                    },
                    {
                        type: "depthwiseConv2d",
                        name: "block_1_depthwise",
                        kernel_size: [3, 3],
                        strides: [2, 2],  // stride 2 reduces spatial dimensions
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_1_depthwise_BN"
                    },
                    {
                        type: "activation",
                        name: "block_1_depthwise_relu",
                        activation: "relu6"
                    },
                    {
                        type: "conv2d",
                        name: "block_1_project",
                        filters: 24,  // projection to 24 channels
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_1_project_BN"
                    },
                    
                    // Block 3 - with skip connection (residual)
                    {
                        type: "conv2d",
                        name: "block_2_expand",
                        filters: 144,  // expansion factor 6 from 24 channels
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_2_expand_BN"
                    },
                    {
                        type: "activation",
                        name: "block_2_expand_relu",
                        activation: "relu6"
                    },
                    {
                        type: "depthwiseConv2d",
                        name: "block_2_depthwise",
                        kernel_size: [3, 3],
                        strides: [1, 1],  // stride 1 maintains spatial dimensions for residual
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_2_depthwise_BN"
                    },
                    {
                        type: "activation",
                        name: "block_2_depthwise_relu",
                        activation: "relu6"
                    },
                    {
                        type: "conv2d",
                        name: "block_2_project",
                        filters: 24,  // projection back to 24 channels for the skip connection
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_2_project_BN"
                    },
                    {
                        type: "add",
                        name: "block_2_add"
                    },
                    
                    // Block 4 - no skip connection (stride 2)
                    {
                        type: "conv2d",
                        name: "block_3_expand",
                        filters: 144,  // expansion factor 6 from 24 channels
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_3_expand_BN"
                    },
                    {
                        type: "activation",
                        name: "block_3_expand_relu",
                        activation: "relu6"
                    },
                    {
                        type: "depthwiseConv2d",
                        name: "block_3_depthwise",
                        kernel_size: [3, 3],
                        strides: [2, 2],  // stride 2 reduces spatial dimensions
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_3_depthwise_BN"
                    },
                    {
                        type: "activation",
                        name: "block_3_depthwise_relu",
                        activation: "relu6"
                    },
                    {
                        type: "conv2d",
                        name: "block_3_project",
                        filters: 32,  // projection to 32 channels
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_3_project_BN"
                    },
                    
                    // Block 5 - with skip connection
                    {
                        type: "conv2d",
                        name: "block_4_expand",
                        filters: 192,  // expansion factor 6 from 32 channels
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_4_expand_BN"
                    },
                    {
                        type: "activation",
                        name: "block_4_expand_relu",
                        activation: "relu6"
                    },
                    {
                        type: "depthwiseConv2d",
                        name: "block_4_depthwise",
                        kernel_size: [3, 3],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_4_depthwise_BN"
                    },
                    {
                        type: "activation",
                        name: "block_4_depthwise_relu",
                        activation: "relu6"
                    },
                    {
                        type: "conv2d",
                        name: "block_4_project",
                        filters: 32,
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        padding: "same"
                    },
                    {
                        type: "batchnorm",
                        name: "block_4_project_BN"
                    },
                    {
                        type: "add",
                        name: "block_4_add"
                    },
                    
                    // Final layers
                    {
                        type: "conv2d",
                        name: "Conv_1",
                        filters: 1280,
                        kernel_size: [1, 1],
                        strides: [1, 1],
                        activation: "relu6"
                    },
                    {
                        type: "pooling2d",
                        name: "global_pool",
                        pool_size: [7, 7],
                        pool_type: "avg"
                    },
                    {
                        type: "conv2d",
                        name: "Conv_2",
                        filters: 1000,
                        kernel_size: [1, 1],
                        strides: [1, 1]
                    },
                    {
                        type: "flatten",
                        name: "flatten"
                    },
                    {
                        type: "dense",
                        name: "Logits",
                        units: 1000,
                        activation: "softmax"
                    }
                ]
            }
        };
    }

    // Helper for logging
    log(message) {
        if (this.debug) {
            console.log(`[CNNModel] ${message}`);
        }
    }

    createModelDescription(tfModel) {
        this.log("Creating model description");
        
        // Create a simplified model description for visualization
        const modelDescription = {
            name: this.modelName,
            version: "1.0",
            layers: []
        };
        
        try {
            // Process each layer and extract relevant information
            if (tfModel && tfModel.layers) {
                this.log(`Processing ${tfModel.layers.length} layers`);
                modelDescription.layers = tfModel.layers.map((layer, index) => {
                    try {
                        let config = {};
                        try {
                            config = layer.getConfig ? layer.getConfig() : {};
                        } catch (configError) {
                            this.log(`Couldn't get config for layer ${index}`);
                        }
                        
                        let type = 'unknown';
                        try {
                            type = layer.getClassName ? 
                                layer.getClassName().toLowerCase() : 
                                (layer.constructor.name ? layer.constructor.name.toLowerCase() : 'unknown');
                        } catch (typeError) {
                            this.log(`Couldn't get type for layer ${index}`);
                        }
                        
                        // Base layer info with safe defaults
                        const layerInfo = {
                            type: this.normalizeLayerType(type),
                            name: layer.name || `layer_${index}`,
                        };
                        
                        // Add specific properties based on layer type
                        if (type.includes('conv2d')) {
                            layerInfo.filters = config.filters || 0;
                            layerInfo.kernel_size = config.kernelSize || [3, 3];
                            layerInfo.strides = config.strides || [1, 1];
                            layerInfo.activation = config.activation || '';
                            
                            if (type.includes('depthwise')) {
                                layerInfo.type = 'depthwiseconv2d';
                            }
                        } else if (type.includes('dense')) {
                            layerInfo.units = config.units || 0;
                            layerInfo.activation = config.activation || '';
                        } else if (type.includes('pooling')) {
                            layerInfo.pool_size = config.poolSize || [2, 2];
                            layerInfo.strides = config.strides || [2, 2];
                            
                            if (type.includes('max')) {
                                layerInfo.type = 'maxpooling2d';
                            } else if (type.includes('average') || type.includes('avg')) {
                                layerInfo.type = 'averagepooling2d';
                            }
                        } else if (type.includes('batch')) {
                            layerInfo.type = 'batchnorm';
                        } else if (type.includes('add')) {
                            layerInfo.type = 'add';
                        } else if (type.includes('concat')) {
                            layerInfo.type = 'concat';
                        } else if (type.includes('flatten')) {
                            layerInfo.type = 'flatten';
                        } else if (type.includes('dropout')) {
                            layerInfo.type = 'dropout';
                            layerInfo.rate = config.rate || 0.5;
                        } else if (type.includes('activation')) {
                            layerInfo.type = 'activation';
                            layerInfo.activation = config.activation || '';
                        }
                        
                        return layerInfo;
                    } catch (error) {
                        this.log(`Error processing layer ${index}: ${error.message}`);
                        return {
                            type: 'unknown',
                            name: `layer_${index}`,
                            error: error.message
                        };
                    }
                });
            } else {
                this.log("No layers found in the model, adding placeholder layer");
                modelDescription.layers.push({
                    type: 'conv2d',
                    name: 'placeholder_layer',
                    filters: 32,
                    kernel_size: [3, 3],
                    activation: 'relu'
                });
            }
        } catch (error) {
            this.log(`Error creating model description: ${error.message}`);
            // Ensure we have at least one layer in case of errors
            if (modelDescription.layers.length === 0) {
                modelDescription.layers.push({
                    type: 'conv2d',
                    name: 'error_placeholder',
                    filters: 32,
                    kernel_size: [3, 3],
                    activation: 'relu'
                });
            }
        }
        
        return { model: modelDescription };
    }

    // Helper method to normalize layer types
    normalizeLayerType(type) {
        if (type.includes('conv2d')) return 'conv2d';
        if (type.includes('depthwise')) return 'depthwiseconv2d';
        if (type.includes('maxpool')) return 'maxpooling2d';
        if (type.includes('avgpool') || type.includes('averagepool')) return 'averagepooling2d';
        if (type.includes('dense')) return 'dense';
        if (type.includes('flatten')) return 'flatten';
        if (type.includes('batch')) return 'batchnorm';
        if (type.includes('add')) return 'add';
        if (type.includes('concat')) return 'concat';
        if (type.includes('dropout')) return 'dropout';
        if (type.includes('activation')) return 'activation';
        return 'unknown';
    }

    // Create a simple test model definition when no models can be loaded
    createTestModelDefinition() {
        console.log("Creating test model definition for fallback");
        return {
            model: {
                name: "Test CNN Model",
                version: "1.0",
                layers: [
                    {
                        type: "conv2d",
                        name: "conv2d_input",
                        filters: 32,
                        kernel_size: [3, 3],
                        activation: "relu",
                        input_shape: [224, 224, 3]
                    },
                    {
                        type: "maxpooling2d",
                        name: "maxpool_1",
                        pool_size: [2, 2]
                    },
                    {
                        type: "conv2d",
                        name: "conv2d_2",
                        filters: 64,
                        kernel_size: [3, 3],
                        activation: "relu"
                    },
                    {
                        type: "maxpooling2d",
                        name: "maxpool_2",
                        pool_size: [2, 2]
                    },
                    {
                        type: "flatten",
                        name: "flatten"
                    },
                    {
                        type: "dense",
                        name: "dense_1",
                        units: 128,
                        activation: "relu"
                    },
                    {
                        type: "dense",
                        name: "dense_output",
                        units: 10,
                        activation: "softmax"
                    }
                ]
            }
        };
    }

    getModelName() {
        return this.modelName;
    }

    getAvailableModels() {
        // Add embedded model to available models and make it first
        return [
            {
                id: 'embedded',
                name: 'Simple CNN (Built-in)'
            },
            {
                id: 'custom',
                name: 'Local Model (models/pretrainedModel.json)'
            },
            {
                id: 'mobilenetv2',
                name: 'MobileNetV2 (Online)'
            },
            {
                id: 'mobilenetv1',
                name: 'MobileNetV1 (Online)'
            }
        ];
    }

    visualizeArchitecture() {
        if (!this.model) {
            console.error("Model not loaded. Please load the model first.");
            return;
        }
        console.log("Visualizing model architecture...");
    }

    displayLayerInfo(layerIndex) {
        if (!this.model) {
            console.error("Model not loaded. Please load the model first.");
            return;
        }
        if (layerIndex < 0 || layerIndex >= this.model.model.layers.length) {
            console.error("Invalid layer index.");
            return;
        }
        const layerInfo = this.model.model.layers[layerIndex];
        console.log("Layer Information:", layerInfo);
    }
    
    getLayers() {
        if (!this.model || !this.model.model || !this.model.model.layers) {
            return [];
        }
        
        return this.model.model.layers.map((layer, index) => ({
            name: `${layer.type}_${index}`,
            type: layer.type,
            index: index,
            ...layer
        }));
    }

    // Add a new method to get the model data in the format expected by ModelVisualizer
    getModelForVisualization() {
        if (!this.model) {
            return this.createEmbeddedModel();
        }
        
        // Return our model structure - it should already be in the correct format
        return this.model;
    }

    async predict(input) {
        if (!this.tfModel) {
            console.warn("TensorFlow.js model not available. Cannot make predictions.");
            return null;
        }
        
        try {
            // Process the input - ensure it's a tensor with proper shape
            let tensor;
            if (input instanceof tf.Tensor) {
                tensor = input;
            } else if (input instanceof HTMLImageElement) {
                tensor = tf.browser.fromPixels(input)
                    .resizeBilinear([224, 224]) // Standard input size for most models
                    .toFloat();
            } else {
                return null;
            }
            
            // Preprocess based on model type
            if (this.modelType.includes('mobilenet') || this.modelType.includes('efficientnet')) {
                // MobileNet and EfficientNet preprocessing
                tensor = tensor.div(127.5).sub(1).expandDims();
            } else if (this.modelType.includes('inception')) {
                // Inception preprocessing
                tensor = tensor.div(255.0).sub(0.5).mul(2.0).expandDims();
            } else {
                // Default preprocessing for other models
                tensor = tensor.div(255.0).expandDims();
            }
            
            // Run prediction
            const result = await this.tfModel.predict(tensor);
            
            // Clean up tensors
            tensor.dispose();
            
            return result;
        } catch (error) {
            console.error("Error performing prediction:", error);
            return null;
        }
    }

    validateModelStructure(model) {
        // More permissive model structure validation with better error messages
        if (!model) {
            this.log("Invalid model: model is null or undefined");
            return false;
        }
        if (!model.model) {
            this.log("Invalid model: model.model property is missing");
            return false;
        }
        if (!model.model.layers) {
            this.log("Invalid model: model.model.layers property is missing");
            return false;
        }
        if (!Array.isArray(model.model.layers)) {
            this.log("Invalid model: model.model.layers is not an array");
            return false;
        }
        if (model.model.layers.length === 0) {
            this.log("Invalid model: model.model.layers array is empty");
            return false;
        }
        
        // Check if at least first layer has required properties
        const firstLayer = model.model.layers[0];
        if (!firstLayer || typeof firstLayer !== 'object') {
            this.log("Invalid model: first layer is not an object");
            return false;
        }
        
        // Log the first layer for debugging
        this.log("First layer: " + JSON.stringify(firstLayer).substring(0, 100) + "...");
        
        // We're being more permissive here - check some properties but don't fail if everything is missing
        let validProps = 0;
        if (firstLayer.type) validProps++;
        if (firstLayer.name) validProps++;
        
        // As long as we have at least one valid property, consider it valid
        return validProps > 0;
    }

    // Create a simple TF.js model for testing explainability features
    createSimpleTFModel() {
        const input = tf.input({shape: [224, 224, 3]});
        const conv1 = tf.layers.conv2d({
            filters: 16,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu',
            name: 'conv1'
        }).apply(input);
        const pool1 = tf.layers.maxPooling2d({poolSize: 2, name: 'pool1'}).apply(conv1);
        const conv2 = tf.layers.conv2d({
            filters: 32,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu',
            name: 'conv2'
        }).apply(pool1);
        const pool2 = tf.layers.maxPooling2d({poolSize: 2, name: 'pool2'}).apply(conv2);
        const flatten = tf.layers.flatten({name: 'flatten'}).apply(pool2);
        const dense = tf.layers.dense({units: 10, activation: 'softmax', name: 'dense'}).apply(flatten);
        return tf.model({inputs: input, outputs: dense});
    }
}

export default CNNModel;