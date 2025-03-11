import * as tf from '@tensorflow/tfjs';

/**
 * Helper class for making and interpreting predictions from CNN models
 */
class PredictionHelper {
  constructor(model) {
    this.model = model;
    this.tfModel = model.tfModel;
    this.classDictionary = null;
    this.loadImageNetClasses();
  }

  /**
   * Load ImageNet class labels from a JSON file
   */
  async loadImageNetClasses() {
    try {
      // Try loading classes from standard location
      const response = await fetch('/models/imagenet_classes.json');
      if (!response.ok) {
        const fallbackResponse = await fetch('https://storage.googleapis.com/tfjs-models/assets/mobilenet/imagenet_classes.json');
        if (!fallbackResponse.ok) {
          console.warn('Could not load ImageNet class dictionary, predictions will show indices only');
          return;
        }
        this.classDictionary = await fallbackResponse.json();
      } else {
        this.classDictionary = await response.json();
      }
      console.log('Loaded ImageNet class dictionary with', Object.keys(this.classDictionary).length, 'classes');
    } catch (error) {
      console.error('Error loading ImageNet classes:', error);
      // Create a minimal fallback with some common classes
      this.classDictionary = {
        '0': 'background',
        '1': 'person',
        '2': 'bicycle',
        '3': 'car',
        '4': 'motorcycle',
        '5': 'airplane',
        '6': 'bus',
        // More classes would be here in a real implementation
      };
    }
  }

  /**
   * Preprocess an input image for model prediction
   * @param {HTMLImageElement|tf.Tensor} image - Input image
   * @returns {tf.Tensor} Preprocessed image tensor
   */
  preprocessImage(image) {
    if (!image) return null;

    // Convert to tensor if it's an HTML element
    const imgTensor = image instanceof tf.Tensor 
      ? image 
      : tf.browser.fromPixels(image);
    
    // Resize to expected input size (most models use 224x224)
    const resized = tf.image.resizeBilinear(imgTensor, [224, 224]);
    
    // Create a batch (add batch dimension)
    const batched = resized.expandDims(0);
    
    // Normalize based on model type (MobileNet, Inception, etc.)
    let normalized;
    
    if (this.model.modelType.includes('mobilenet')) {
      // MobileNet normalization: values between -1 and 1
      normalized = batched.div(127.5).sub(1);
    } else if (this.model.modelType.includes('inception')) {
      // Inception normalization: values between -1 and 1
      normalized = batched.div(255).sub(0.5).mul(2);
    } else {
      // Default normalization: values between 0 and 1
      normalized = batched.div(255);
    }
    
    // Clean up intermediate tensors
    if (image !== imgTensor) {
      imgTensor.dispose();
    }
    resized.dispose();
    
    return normalized;
  }

  /**
   * Make a prediction using the model
   * @param {HTMLImageElement|tf.Tensor} image - Input image
   * @returns {Promise<Object>} Prediction results
   */
  async predict(image) {
    if (!this.tfModel) {
      throw new Error('TensorFlow.js model not available');
    }

    try {
      // Preprocess the image
      const preprocessed = this.preprocessImage(image);
      
      // Run prediction
      const predictions = await this.tfModel.predict(preprocessed);
      
      // Get probabilities as array
      const probabilities = await predictions.data();
      
      // Get the top k predictions
      const topK = this.getTopKClasses(probabilities, 5);
      
      // Format result
      const result = {
        topPredictions: topK,
        rawProbabilities: Array.from(probabilities),
        topPrediction: topK[0],
      };
      
      // Clean up tensors
      preprocessed.dispose();
      predictions.dispose();
      
      return result;
    } catch (error) {
      console.error('Error making prediction:', error);
      throw error;
    }
  }

  /**
   * Get the top K class predictions from probability array
   * @param {Float32Array} probabilities - Array of class probabilities
   * @param {number} k - Number of top classes to return
   * @returns {Array<Object>} Array of top K predictions with class name and probability
   */
  getTopKClasses(probabilities, k = 5) {
    // Get indices of probabilities in descending order
    const indices = Array.from(probabilities)
      .map((p, i) => ({ probability: p, index: i }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, k);
    
    // Map indices to class names and probabilities
    return indices.map(({ probability, index }) => ({
      className: this.classDictionary ? 
        (this.classDictionary[index] || `Class ${index}`) : 
        `Class ${index}`,
      probability: probability,
      index: index
    }));
  }

  /**
   * Format a probability as a percentage with specified precision
   * @param {number} probability - Probability value (0-1)
   * @param {number} precision - Number of decimal places
   * @returns {string} Formatted percentage string
   */
  static formatProbability(probability, precision = 2) {
    return (probability * 100).toFixed(precision) + '%';
  }
}

export default PredictionHelper;
