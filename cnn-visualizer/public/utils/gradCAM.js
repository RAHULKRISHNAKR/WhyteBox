import * as tf from '@tensorflow/tfjs';

/**
 * GradCAM implementation for TensorFlow.js
 * Based on "Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization"
 */
class GradCAM {
  constructor(model) {
    this.model = model;
    this.tfModel = model.tfModel; // Access to the actual TensorFlow.js model
  }

  /**
   * Generate a GradCAM heatmap for a specific layer and class
   * @param {tf.Tensor} inputImage - Input image tensor (1, height, width, channels)
   * @param {string} layerName - Name of the layer to visualize
   * @param {number} classIndex - Index of the class to explain (default: predicted class)
   * @returns {tf.Tensor} Heatmap as a tensor
   */
  async generateHeatmap(inputImage, layerName, classIndex = null) {
    if (!this.tfModel) {
      console.error('No TensorFlow model available');
      return null;
    }
    
    // Ensure we're working with tensors
    const img = inputImage instanceof tf.Tensor ? inputImage : tf.browser.fromPixels(inputImage);
    const preprocessedInput = this.preprocessImage(img);
    
    try {
      // If classIndex is not provided, use the predicted class
      if (classIndex === null) {
        const predictions = this.tfModel.predict(preprocessedInput);
        classIndex = tf.argMax(predictions, 1).dataSync()[0];
      }
      
      // Get the target layer
      const targetLayer = this.tfModel.getLayer(layerName);
      if (!targetLayer) {
        console.error(`Layer ${layerName} not found in the model`);
        return null;
      }
      
      // Create a model that maps from the input to the target layer's output and predictions
      const gradModel = tf.model({
        inputs: this.tfModel.inputs,
        outputs: [targetLayer.output, this.tfModel.output]
      });
      
      // Watch the gradients of the target layer
      const gradTape = tf.grad(x => {
        const [convOutputs, predictions] = gradModel.predict(x);
        return predictions.gather([classIndex], 1);
      });
      
      // Get the gradients and layer outputs
      const [convOutputs, grads] = tf.tidy(() => {
        const g = gradTape(preprocessedInput);
        const outputs = targetLayer.output.arraySync();
        return [outputs, g];
      });
      
      // Global average pooling of the gradients
      const weights = tf.mean(grads, [0, 1, 2]);
      
      // Generate the heatmap
      const heatmap = tf.tidy(() => {
        const weighted = tf.mul(weights.reshape([1, 1, 1, -1]), convOutputs);
        return tf.relu(tf.sum(weighted, -1)); // Apply ReLU and sum over channels
      });
      
      // Normalize the heatmap
      const normalizedHeatmap = tf.div(
        heatmap, 
        tf.sub(tf.max(heatmap), tf.min(heatmap))
      );
      
      return normalizedHeatmap;
    } catch (error) {
      console.error('Error generating GradCAM heatmap:', error);
      return null;
    }
  }
  
  /**
   * Preprocess image for the model
   * @param {tf.Tensor} img - Input image tensor
   * @returns {tf.Tensor} Preprocessed image
   */
  preprocessImage(img) {
    // Resize to match the model's expected input
    const resized = tf.image.resizeBilinear(img, [224, 224]);
    
    // Expand dimensions to create a batch of 1
    const expanded = resized.expandDims(0);
    
    // Normalize pixel values to [-1, 1]
    const normalized = tf.div(tf.sub(expanded, 127.5), 127.5);
    
    return normalized;
  }
  
  /**
   * Apply heatmap to original image
   * @param {HTMLImageElement|tf.Tensor} originalImage - Original image
   * @param {tf.Tensor} heatmap - Heatmap tensor
   * @param {number} alpha - Blend factor (0-1)
   * @returns {tf.Tensor} Image with superimposed heatmap
   */
  async applyHeatmapToImage(originalImage, heatmap, alpha = 0.5) {
    // Convert originalImage to tensor if it's not already
    const origImg = originalImage instanceof tf.Tensor ? 
      originalImage : 
      tf.browser.fromPixels(originalImage);
    
    // Resize heatmap to match original image dimensions
    const resizedHeatmap = tf.image.resizeBilinear(
      heatmap, 
      [origImg.shape[0], origImg.shape[1]]
    );
    
    // Convert heatmap to RGB colormap (red-yellow)
    const coloredHeatmap = tf.tidy(() => {
      // Create RGB channels
      const r = resizedHeatmap;
      const g = tf.mul(resizedHeatmap, 0.5);
      const b = tf.zerosLike(resizedHeatmap);
      
      // Stack channels to create RGB heatmap
      return tf.stack([r, g, b], -1).mul(255);
    });
    
    // Blend original image with heatmap
    const blendedImage = tf.tidy(() => {
      const scaledOrig = tf.cast(origImg, 'float32');
      return tf.add(
        tf.mul(scaledOrig, 1 - alpha),
        tf.mul(coloredHeatmap, alpha)
      );
    });
    
    return tf.cast(blendedImage, 'int32');
  }
}

export default GradCAM;
