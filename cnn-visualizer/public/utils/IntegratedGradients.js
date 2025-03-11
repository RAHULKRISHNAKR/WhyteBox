import * as tf from '@tensorflow/tfjs';

/**
 * Implementation of Integrated Gradients for TensorFlow.js
 * Based on "Axiomatic Attribution for Deep Networks" paper
 */
class IntegratedGradients {
  constructor(model) {
    this.model = model;
    this.tfModel = model.tfModel;
  }

  /**
   * Generate integrated gradients for an input image
   * @param {HTMLImageElement|tf.Tensor} inputImage - Input image
   * @param {number} classIndex - Class index to explain (default: predicted class)
   * @param {number} steps - Number of steps for path integration (default: 50)
   * @returns {tf.Tensor} Attribution map tensor
   */
  async generateAttributions(inputImage, classIndex = null, steps = 50) {
    if (!this.tfModel) {
      console.error('No TensorFlow model available');
      return null;
    }

    try {
      // Preprocess input image to tensor
      const img = inputImage instanceof tf.Tensor ? inputImage : tf.browser.fromPixels(inputImage);
      const preprocessedInput = this.preprocessImage(img);
      
      // If classIndex is not provided, use the predicted class
      if (classIndex === null) {
        const predictions = this.tfModel.predict(preprocessedInput);
        classIndex = tf.argMax(predictions, 1).dataSync()[0];
        predictions.dispose();
      }

      // Create baseline input (black image)
      const baseline = tf.zeros(preprocessedInput.shape);
      
      // Calculate attributions using integrated gradients
      const attributions = await this.integratedGradients(
        preprocessedInput,
        baseline,
        classIndex,
        steps
      );

      // Clean up
      if (img !== inputImage) img.dispose();
      
      return attributions;
    } catch (error) {
      console.error('Error generating integrated gradients:', error);
      return null;
    }
  }

  /**
   * Calculate attributions using integrated gradients algorithm
   * @param {tf.Tensor} input - Input tensor
   * @param {tf.Tensor} baseline - Baseline tensor (typically zeros)
   * @param {number} classIndex - Class index to explain
   * @param {number} steps - Number of steps for approximation
   * @returns {tf.Tensor} Attribution map
   */
  async integratedGradients(input, baseline, classIndex, steps) {
    // Calculate step size
    const delta = tf.sub(input, baseline).div(steps);
    
    // Initialize sum of gradients
    let gradientSum = tf.zeros(input.shape);
    
    // Compute integral approximation
    for (let i = 0; i <= steps; i++) {
      // Calculate interpolated input: baseline + (i/steps) * (input - baseline)
      const scaledDelta = delta.mul(i / steps);
      const interpolatedInput = baseline.add(scaledDelta);
      
      // Create a copy with gradient tracking enabled
      const interpWithGrads = tf.tidy(() => {
        return tf.variable(interpolatedInput);
      });
      
      // Get gradients
      const gradTape = tf.grad(x => {
        const prediction = this.tfModel.predict(x);
        return prediction.gather([classIndex], 1);
      });
      
      const gradients = gradTape(interpWithGrads);
      
      // Add to sum
      gradientSum = tf.add(gradientSum, gradients);
      
      // Clean up
      interpWithGrads.dispose();
      gradients.dispose();
    }
    
    // Approximate the integral by averaging
    const averagedGradients = gradientSum.div(steps + 1);
    
    // Calculate attributions: (input - baseline) * averaged_gradients
    const inputDiff = tf.sub(input, baseline);
    const attributions = tf.mul(inputDiff, averagedGradients);
    
    // Clean up
    gradientSum.dispose();
    averagedGradients.dispose();
    inputDiff.dispose();
    
    // Sum across channels to get a single attribution map
    return tf.sum(tf.abs(attributions), -1);
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
    
    // Normalize pixel values to [0, 1]
    const normalized = expanded.div(255.0);
    
    return normalized;
  }

  /**
   * Apply attribution map to original image to create a visualization
   * @param {HTMLImageElement|tf.Tensor} originalImage - Original image
   * @param {tf.Tensor} attributionMap - Attribution map tensor
   * @param {number} alpha - Blend factor (0-1)
   * @returns {tf.Tensor} Visualization tensor
   */
  async applyAttributionMap(originalImage, attributionMap, alpha = 0.5) {
    // Convert originalImage to tensor if it's not already
    const origImg = originalImage instanceof tf.Tensor ? 
      originalImage : 
      tf.browser.fromPixels(originalImage);
    
    // Resize attribution map to match original image dimensions
    const resizedMap = tf.image.resizeBilinear(
      attributionMap.expandDims(-1), 
      [origImg.shape[0], origImg.shape[1]]
    );
    
    // Normalize attribution map to 0-1 range
    const normalizedMap = tf.tidy(() => {
      const minVal = resizedMap.min();
      const maxVal = resizedMap.max();
      return resizedMap.sub(minVal).div(maxVal.sub(minVal).add(1e-5));
    });
    
    // Create a heatmap (red-yellow-blue) from the attribution values
    const heatmap = tf.tidy(() => {
      // Create RGB channels
      // Blue to Yellow to Red color mapping
      const r = normalizedMap;
      const g = tf.mul(normalizedMap, 0.8);
      const b = tf.sub(1, normalizedMap);
      
      return tf.stack([r, g, b], -1).mul(255);
    });
    
    // Blend original image with heatmap
    const blendedImage = tf.tidy(() => {
      const scaledOrig = tf.cast(origImg, 'float32');
      return tf.add(
        tf.mul(scaledOrig, 1 - alpha),
        tf.mul(heatmap, alpha)
      );
    });
    
    // Clean up
    if (origImg !== originalImage) origImg.dispose();
    resizedMap.dispose();
    normalizedMap.dispose();
    heatmap.dispose();
    
    return blendedImage;
  }
}

export default IntegratedGradients;
