import * as tf from '@tensorflow/tfjs';

class ModelInferenceHelper {
  constructor(model) {
    this.model = model;
    this.tfModel = model.tfModel;
    this.layerModels = []; // Will store models for each layer
  }

  // Create individual models for each layer to extract activations
  async createLayerModels() {
    if (!this.tfModel) return;
    
    this.layerModels = [];
    for (let i = 0; i < this.tfModel.layers.length; i++) {
      const layer = this.tfModel.layers[i];
      try {
        // Create a model that outputs this layer's activation
        const layerModel = tf.model({
          inputs: this.tfModel.inputs,
          outputs: layer.output
        });
        this.layerModels.push({
          model: layerModel,
          name: layer.name,
          type: layer.getClassName ? layer.getClassName() : 'unknown'
        });
      } catch (e) {
        console.warn(`Couldn't create model for layer ${layer.name}:`, e);
      }
    }
    
    return this.layerModels;
  }

  // Run inference and collect activations for each layer
  async getLayerActivations(inputImage) {
    if (!this.tfModel || !this.layerModels.length) {
      await this.createLayerModels();
    }
    
    // Preprocess the input
    const preprocessed = this.preprocessImage(inputImage);
    
    // Get activations from each layer
    const activations = [];
    for (const layerModel of this.layerModels) {
      try {
        const activation = await layerModel.model.predict(preprocessed);
        const activationData = await activation.data();
        
        activations.push({
          layerName: layerModel.name,
          type: layerModel.type,
          data: activationData,
          shape: activation.shape
        });
        
        // Clean up tensor
        activation.dispose();
      } catch (e) {
        console.warn(`Error getting activation for ${layerModel.name}:`, e);
        activations.push({
          layerName: layerModel.name,
          error: true
        });
      }
    }
    
    // Clean up
    preprocessed.dispose();
    
    return activations;
  }
  
  // Reuse your existing preprocessing logic
  preprocessImage(image) {
    if (!this.model || !this.tfModel) {
      console.error("Model not loaded for preprocessing");
      return null;
    }
    
    try {
      // Convert image to tensor
      let tensor = tf.browser.fromPixels(image);
      
      // Resize to expected input shape (default to 224x224 if not specified)
      const inputShape = this.tfModel.inputs[0].shape;
      const targetHeight = inputShape[1] || 224;
      const targetWidth = inputShape[2] || 224;
      
      // Resize the image
      tensor = tf.image.resizeBilinear(tensor, [targetHeight, targetWidth]);
      
      // Expand dimensions to create batch of 1 and normalize
      tensor = tensor.toFloat().div(tf.scalar(255)).expandDims(0);
      
      // Apply model-specific preprocessing if available
      if (this.model.preprocess) {
        // Additional preprocessing based on model type
        if (this.model.modelType === 'mobilenetv2-vis' || 
            this.model.modelType === 'mobilenetv2') {
          // MobileNet preprocessing: normalize to [-1, 1]
          tensor = tensor.mul(2).sub(1);
        }
      }
      
      return tensor;
    } catch (error) {
      console.error("Error preprocessing image:", error);
      return null;
    }
  }
}

export default ModelInferenceHelper;
