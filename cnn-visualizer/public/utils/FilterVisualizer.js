import * as tf from '@tensorflow/tfjs';

/**
 * Visualizes filters and activations in CNN layers
 */
class FilterVisualizer {
  constructor(model) {
    this.model = model;
    this.tfModel = model.tfModel;
  }

  /**
   * Get the filter weights for a specific convolutional layer
   * @param {string} layerName - Name of the convolutional layer
   * @returns {tf.Tensor|null} The filter weights tensor or null if not available
   */
  async getFilterWeights(layerName) {
    if (!this.tfModel) {
      console.error('No TensorFlow model available');
      return null;
    }

    try {
      // Get the layer by name
      const layer = this.tfModel.getLayer(layerName);
      
      if (!layer) {
        console.error(`Layer ${layerName} not found`);
        return null;
      }

      // Check if it's a convolutional layer
      const className = layer.getClassName().toLowerCase();
      if (!className.includes('conv')) {
        console.warn(`Layer ${layerName} is not a convolutional layer (${className})`);
        return null;
      }

      // Get the weights (kernel) from the layer
      const weights = layer.getWeights();
      if (!weights || weights.length === 0) {
        console.error(`No weights found for layer ${layerName}`);
        return null;
      }

      // The first weight tensor contains the convolutional kernels
      const kernels = weights[0];
      return kernels;
    } catch (error) {
      console.error('Error getting filter weights:', error);
      return null;
    }
  }

  /**
   * Visualize filters for a convolutional layer
   * @param {string} layerName - Name of the convolutional layer
   * @param {Object} options - Visualization options
   * @returns {Array<ImageData>} Array of filter visualizations as ImageData objects
   */
  async visualizeFilters(layerName, options = {}) {
    const weights = await this.getFilterWeights(layerName);
    if (!weights) return null;

    const maxFilters = options.maxFilters || 16; // Limit number of filters to visualize
    const filterSize = options.size || 64; // Size of visualization (width/height in pixels)
    
    // Get weights shape [height, width, inputChannels, filters]
    const shape = weights.shape;
    const numFilters = Math.min(shape[3], maxFilters);
    
    const visualizations = [];
    
    // Process each filter
    for (let i = 0; i < numFilters; i++) {
      try {
        // Extract this filter's weights
        const filterWeights = weights.slice([0, 0, 0, i], [shape[0], shape[1], shape[2], 1]);
        
        // Normalize filter weights to 0-1 range for visualization
        const normalizedFilter = tf.tidy(() => {
          // Take mean across input channels if there are multiple
          const filterMean = shape[2] > 1 ? filterWeights.mean(2) : filterWeights.squeeze(2);
          
          // Normalize values between 0 and 1
          const minVal = filterMean.min();
          const maxVal = filterMean.max();
          return filterMean.sub(minVal).div(maxVal.sub(minVal).add(1e-5));
        });
        
        // Resize filter for better visualization
        const resized = tf.image.resizeBilinear(
          normalizedFilter.reshape([shape[0], shape[1], 1]), 
          [filterSize, filterSize]
        );
        
        // Convert to RGB for visualization
        const rgbFilter = tf.tidy(() => {
          return tf.stack([resized, resized, resized], 2).reshape([filterSize, filterSize, 3]);
        });
        
        // Create ImageData from tensor
        const canvas = document.createElement('canvas');
        canvas.width = filterSize;
        canvas.height = filterSize;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(filterSize, filterSize);
        
        // Fill the ImageData with values from the tensor
        const rgbData = await rgbFilter.mul(255).cast('int32').array();
        for (let y = 0; y < filterSize; y++) {
          for (let x = 0; x < filterSize; x++) {
            const pixelIndex = (y * filterSize + x) * 4;
            imageData.data[pixelIndex] = rgbData[y][x][0];     // R
            imageData.data[pixelIndex + 1] = rgbData[y][x][1]; // G
            imageData.data[pixelIndex + 2] = rgbData[y][x][2]; // B
            imageData.data[pixelIndex + 3] = 255;              // Alpha
          }
        }
        
        visualizations.push(imageData);
        
        // Clean up tensors
        normalizedFilter.dispose();
        resized.dispose();
        rgbFilter.dispose();
      } catch (error) {
        console.error(`Error visualizing filter ${i}:`, error);
      }
    }
    
    return visualizations;
  }

  /**
   * Get activations for a specific layer given an input image
   * @param {HTMLImageElement|tf.Tensor} inputImage - Input image
   * @param {string} layerName - Name of the layer to get activations for
   * @returns {tf.Tensor|null} The activations tensor or null if not available
   */
  async getLayerActivations(inputImage, layerName) {
    if (!this.tfModel) {
      console.error('No TensorFlow model available');
      return null;
    }
    
    try {
      // Preprocess image
      const img = inputImage instanceof tf.Tensor ? 
        inputImage : 
        tf.browser.fromPixels(inputImage);
      
      const preprocessedInput = tf.tidy(() => {
        // Resize to model's expected input size
        const resized = tf.image.resizeBilinear(img, [224, 224]);
        // Expand dimensions to create batch of size 1
        const expanded = resized.expandDims(0);
        // Normalize pixel values (common preprocessing for ImageNet models)
        return expanded.div(255.0);
      });
      
      // Create a model that outputs the activations of the specified layer
      const targetLayer = this.tfModel.getLayer(layerName);
      if (!targetLayer) {
        console.error(`Layer ${layerName} not found`);
        return null;
      }
      
      const activationModel = tf.model({
        inputs: this.tfModel.inputs,
        outputs: targetLayer.output
      });
      
      // Get activations for this layer
      const activations = await activationModel.predict(preprocessedInput);
      
      // Clean up tensors
      if (img !== inputImage) img.dispose();
      preprocessedInput.dispose();
      
      return activations;
    } catch (error) {
      console.error('Error getting layer activations:', error);
      return null;
    }
  }

  /**
   * Visualize activations for a specific layer given an input image
   * @param {HTMLImageElement|tf.Tensor} inputImage - Input image
   * @param {string} layerName - Name of the layer to visualize activations for
   * @param {Object} options - Visualization options
   * @returns {Array<ImageData>} Array of activation visualizations as ImageData objects
   */
  async visualizeActivations(inputImage, layerName, options = {}) {
    const activations = await this.getLayerActivations(inputImage, layerName);
    if (!activations) return null;
    
    const maxActivations = options.maxActivations || 16; // Limit number of activation maps
    const size = options.size || 64; // Size of visualization (width/height in pixels)
    
    // Get activations shape [1, height, width, channels]
    const shape = activations.shape;
    const numChannels = Math.min(shape[3], maxActivations);
    
    const visualizations = [];
    
    // Process each activation channel
    for (let i = 0; i < numChannels; i++) {
      try {
        // Extract this channel's activations
        const channelActivations = tf.tidy(() => {
          return activations.slice([0, 0, 0, i], [1, shape[1], shape[2], 1]).squeeze([0, 3]);
        });
        
        // Normalize activations for visualization
        const normalizedActivations = tf.tidy(() => {
          const minVal = channelActivations.min();
          const maxVal = channelActivations.max();
          return channelActivations.sub(minVal).div(maxVal.sub(minVal).add(1e-5));
        });
        
        // Resize activations for better visualization
        const resized = tf.image.resizeBilinear(
          normalizedActivations.expandDims(2), 
          [size, size]
        );
        
        // Convert to RGB for visualization
        const rgbActivations = tf.tidy(() => {
          // Generate a heatmap-like coloration
          // Red channel = original value
          // Green channel = 1 - value
          // Blue channel = 0
          const red = resized;
          const green = tf.sub(tf.onesLike(resized), resized);
          const blue = tf.zerosLike(resized);
          
          return tf.stack([red, green, blue], 2).reshape([size, size, 3]);
        });
        
        // Create ImageData from tensor
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(size, size);
        
        // Fill the ImageData with values from the tensor
        const rgbData = await rgbActivations.mul(255).cast('int32').array();
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const pixelIndex = (y * size + x) * 4;
            imageData.data[pixelIndex] = rgbData[y][x][0];     // R
            imageData.data[pixelIndex + 1] = rgbData[y][x][1]; // G
            imageData.data[pixelIndex + 2] = rgbData[y][x][2]; // B
            imageData.data[pixelIndex + 3] = 255;              // Alpha
          }
        }
        
        visualizations.push(imageData);
        
        // Clean up tensors
        channelActivations.dispose();
        normalizedActivations.dispose();
        resized.dispose();
        rgbActivations.dispose();
      } catch (error) {
        console.error(`Error visualizing activation ${i}:`, error);
      }
    }
    
    // Clean up the main activations tensor
    activations.dispose();
    
    return visualizations;
  }
}

export default FilterVisualizer;
