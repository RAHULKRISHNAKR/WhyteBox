import * as tf from '@tensorflow/tfjs';

/**
 * Visualizes what features/patterns different neurons in the network are looking for
 * by generating synthetic inputs that maximize their activations
 */
class FeatureVisualizer {
  constructor(model) {
    this.model = model;
    this.tfModel = model.tfModel;
  }

  /**
   * Creates a model that outputs the activations of a specific layer
   * @param {string} layerName - Name of the layer to visualize
   * @returns {tf.LayersModel|null} The activation model or null if creation fails
   */
  createActivationModel(layerName) {
    if (!this.tfModel) {
      console.error('No TensorFlow model available');
      return null;
    }

    try {
      const layer = this.tfModel.getLayer(layerName);
      
      if (!layer) {
        console.error(`Layer ${layerName} not found in model`);
        return null;
      }
      
      // Create a new model that maps from original input to the target layer's output
      const activationModel = tf.model({
        inputs: this.tfModel.inputs,
        outputs: layer.output
      });
      
      return activationModel;
    } catch (error) {
      console.error('Error creating activation model:', error);
      return null;
    }
  }

  /**
   * Generate an input that maximizes the activation of a specific filter in a layer
   * @param {string} layerName - Name of the layer containing the filter
   * @param {number} filterIndex - Index of the filter to visualize
   * @param {Object} options - Visualization options
   * @returns {tf.Tensor|null} The generated visualization tensor
   */
  async visualizeFilter(layerName, filterIndex, options = {}) {
    const {
      iterations = 150,
      learningRate = 0.1,
      width = 224,
      height = 224,
      regularization = 0.001,
      verbose = false
    } = options;
    
    // Create a model that outputs the activations of the target layer
    const activationModel = this.createActivationModel(layerName);
    if (!activationModel) return null;
    
    try {
      // Create a random input image to optimize
      const inputShape = this.tfModel.inputs[0].shape.slice(1);
      const inputImage = tf.tidy(() => {
        // Start with random noise in range [-0.1, 0.1]
        return tf.randomUniform([1, ...inputShape], -0.1, 0.1);
      });
      
      // Convert input to a variable so we can optimize it
      const inputVar = tf.variable(inputImage);
      
      // For tracking progress
      let bestActivation = -Infinity;
      let bestImage = null;
      
      // Optimization loop
      for (let i = 0; i < iterations; i++) {
        // Compute the activation and gradients
        const {activation, gradients} = tf.tidy(() => {
          // Track gradients for this operation
          const activationTape = tf.grad(x => {
            // Get the activations for this image
            const acts = activationModel.predict(x);
            
            // For convolutional layers, get the mean activation of the specified filter
            // across all spatial locations
            const filterActs = acts.slice([0, 0, 0, filterIndex], 
                                         [1, acts.shape[1], acts.shape[2], 1]);
            
            // Mean of the activations (scalar)
            const meanActivation = filterActs.mean();
            
            // Apply regularization to encourage visually meaningful patterns
            // L2 regularization to prevent extreme values
            const l2Regularization = tf.mul(x.square().mean(), regularization);
            
            // Maximize activation - regularization
            return tf.sub(meanActivation, l2Regularization);
          });
          
          // Get activation and gradients
          const gradients = activationTape(inputVar);
          const activation = activationModel.predict(inputVar);
          
          return {
            activation: activation.slice([0, 0, 0, filterIndex], [1, activation.shape[1], 
                                       activation.shape[2], 1]).mean().dataSync()[0],
            gradients
          };
        });
        
        // Track best result
        if (activation > bestActivation) {
          bestActivation = activation;
          
          // Store a copy of the current best image
          if (bestImage) bestImage.dispose();
          bestImage = inputVar.clone();
        }
        
        // Apply gradients to update the input image
        inputVar.assign(tf.tidy(() => {
          // Normalize gradients for stable updates
          const normalizedGradients = tf.div(
            gradients,
            tf.add(tf.sqrt(tf.mean(tf.square(gradients))), 1e-5)
          );
          
          // Update the image: image + learning_rate * gradients
          return tf.add(
            inputVar, 
            tf.mul(normalizedGradients, learningRate)
          );
        }));
        
        // Log progress occasionally
        if (verbose && i % 20 === 0) {
          console.log(`Iteration ${i}, Activation: ${activation.toFixed(4)}`);
        }
        
        // Clean up the gradients tensor
        gradients.dispose();
      }
      
      // Clean up tensors
      inputVar.dispose();
      inputImage.dispose();
      
      // Resize the result to requested dimensions and normalize to [0,1] for display
      if (bestImage) {
        const normalizedImage = tf.tidy(() => {
          // Resize if needed
          let resized = bestImage;
          if (bestImage.shape[1] !== height || bestImage.shape[2] !== width) {
            resized = tf.image.resizeBilinear(bestImage, [height, width]);
          }
          
          // Normalize to [0,1] range for visualization
          const minVal = resized.min();
          const maxVal = resized.max();
          return tf.div(tf.sub(resized, minVal), tf.sub(maxVal, minVal).add(1e-5));
        });
        
        return normalizedImage;
      }
      
      return null;
    } catch (error) {
      console.error('Error visualizing filter:', error);
      return null;
    }
  }

  /**
   * Create a grid of filter visualizations for a layer
   * @param {string} layerName - Name of the layer to visualize
   * @param {Object} options - Visualization options
   * @returns {tf.Tensor|null} Tensor containing grid of visualizations
   */
  async visualizeLayerFilters(layerName, options = {}) {
    const {
      numFilters = 16,
      gridWidth = 4,
      tileWidth = 128,
      tileHeight = 128,
      ...visOptions
    } = options;
    
    if (!this.tfModel) {
      console.error('No TensorFlow model available');
      return null;
    }
    
    try {
      // Get the layer
      const layer = this.tfModel.getLayer(layerName);
      if (!layer) {
        console.error(`Layer ${layerName} not found`);
        return null;
      }
      
      // Determine number of filters
      let filterCount = numFilters;
      if (layer.outputShape) {
        // For conv layers, the last dimension contains the number of filters
        const outputShape = layer.outputShape;
        const lastDim = outputShape[outputShape.length - 1];
        filterCount = Math.min(numFilters, lastDim);
      }
      
      // Calculate grid dimensions
      const gridHeight = Math.ceil(filterCount / gridWidth);
      
      // Generate each filter visualization
      const visualizations = [];
      for (let i = 0; i < filterCount; i++) {
        console.log(`Visualizing filter ${i+1}/${filterCount} in ${layerName}`);
        
        const filterVis = await this.visualizeFilter(layerName, i, {
          width: tileWidth,
          height: tileHeight,
          ...visOptions
        });
        
        if (filterVis) {
          visualizations.push(filterVis);
        } else {
          // If visualization failed, add a blank tile
          visualizations.push(tf.zeros([1, tileHeight, tileWidth, 3]));
        }
      }
      
      if (visualizations.length === 0) {
        return null;
      }
      
      // Create a grid of visualizations
      const grid = tf.tidy(() => {
        // Stack visualizations into rows
        const rows = [];
        for (let i = 0; i < gridHeight; i++) {
          const startIdx = i * gridWidth;
          const endIdx = Math.min((i + 1) * gridWidth, visualizations.length);
          
          // If we have fewer filters in the last row, pad with blank tiles
          const rowVisualizations = visualizations.slice(startIdx, endIdx);
          while (rowVisualizations.length < gridWidth) {
            rowVisualizations.push(tf.zeros([1, tileHeight, tileWidth, 3]));
          }
          
          // Concatenate horizontally to form a row
          const row = tf.concat(rowVisualizations, 2);
          rows.push(row);
        }
        
        // Concatenate rows vertically
        return tf.concat(rows, 1);
      });
      
      // Clean up individual visualizations
      visualizations.forEach(vis => vis.dispose());
      
      return grid;
    } catch (error) {
      console.error('Error creating visualization grid:', error);
      return null;
    }
  }

  /**
   * Convert a visualization tensor to an ImageData object for display on a canvas
   * @param {tf.Tensor} tensor - Visualization tensor (normalized to [0,1])
   * @returns {ImageData|null} ImageData object for canvas rendering
   */
  async tensorToImageData(tensor) {
    if (!tensor) return null;
    
    try {
      // Convert to 0-255 range and uint8
      const rgbData = await tensor.mul(255).cast('int32').array();
      
      // Create ImageData
      const [height, width] = [rgbData[0].length, rgbData[0][0].length];
      const imageData = new ImageData(width, height);
      
      // Fill pixel data
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixelIndex = (y * width + x) * 4;
          imageData.data[pixelIndex] = rgbData[0][y][x][0];     // R
          imageData.data[pixelIndex + 1] = rgbData[0][y][x][1]; // G
          imageData.data[pixelIndex + 2] = rgbData[0][y][x][2]; // B
          imageData.data[pixelIndex + 3] = 255;                 // Alpha
        }
      }
      
      return imageData;
    } catch (error) {
      console.error('Error converting tensor to ImageData:', error);
      return null;
    }
  }
}

export default FeatureVisualizer;
