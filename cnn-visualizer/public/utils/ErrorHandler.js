/**
 * Utility class for centralized error handling
 */
class ErrorHandler {
  /**
   * Log and format an error
   * @param {string} context - Where the error occurred
   * @param {Error|string} error - The error object or message
   * @param {boolean} throwError - Whether to throw the error after handling
   */
  static handleError(context, error, throwError = false) {
    const errorMsg = error instanceof Error ? error.message : error;
    const formattedError = `[${context}] ${errorMsg}`;
    
    // Log error to console with stack trace if available
    if (error instanceof Error && error.stack) {
      console.error(formattedError, error.stack);
    } else {
      console.error(formattedError);
    }
    
    // Optional re-throw
    if (throwError) {
      throw new Error(formattedError);
    }
    
    return formattedError;
  }
  
  /**
   * Handle tensor-related errors with cleanup
   * @param {string} context - Where the error occurred
   * @param {Error|string} error - The error object or message
   * @param {Array<tf.Tensor>} tensors - Tensors to dispose
   */
  static handleTensorError(context, error, tensors = []) {
    // Clean up tensors
    tensors.forEach(tensor => {
      if (tensor && tensor.dispose) {
        try {
          tensor.dispose();
        } catch (e) {
          console.warn(`Failed to dispose tensor in error handler: ${e.message}`);
        }
      }
    });
    
    // Handle the error
    return this.handleError(context, error);
  }
  
  /**
   * Format a user-friendly error message
   * @param {string} message - The error message
   * @param {string} suggestion - Suggested action to fix the issue
   * @returns {string} Formatted user-friendly error
   */
  static formatUserError(message, suggestion = '') {
    let formattedMessage = message;
    
    // Make common error messages more user-friendly
    if (message.includes('of undefined')) {
      formattedMessage = 'Failed to access required data. The model structure might be incompatible.';
    } else if (message.includes('Maximum call stack size exceeded')) {
      formattedMessage = 'Operation too complex for browser. Try with a smaller model or fewer layers.';
    } else if (message.includes('out of memory')) {
      formattedMessage = 'Browser ran out of memory. Try closing other tabs or refreshing the page.';
    }
    
    if (suggestion) {
      formattedMessage += ` ${suggestion}`;
    }
    
    return formattedMessage;
  }
  
  /**
   * Get documentation for a specific explainability technique
   * @param {string} technique - The explainability technique
   * @returns {Object} Documentation including description, use cases and references
   */
  static getExplainabilityDocs(technique) {
    const docs = {
      gradcam: {
        title: 'Gradient-weighted Class Activation Mapping (GradCAM)',
        description: 'A technique that uses the gradients flowing into the final convolutional layer to produce a coarse localization map highlighting important regions in the image for prediction.',
        useCases: [
          'Identifying which parts of an image are most important for classification',
          'Understanding what the model is "looking at" when making a decision',
          'Debugging incorrect predictions by seeing what influenced the model'
        ],
        limitations: [
          'Limited to convolutional layers',
          'Provides only a coarse localization',
          'May not capture fine-grained feature importance'
        ],
        reference: 'Selvaraju, R.R., et al. "Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization." ICCV 2017'
      },
      
      filterVisualization: {
        title: 'Filter Visualization',
        description: 'Visualizes the learned weights of convolutional filters to show what patterns or features each filter is detecting.',
        useCases: [
          'Understanding what visual patterns each filter responds to',
          'Verifying that the model is learning useful features',
          'Comparing filters across different layers to see feature hierarchy'
        ],
        limitations: [
          'Direct filter visualization can be hard to interpret',
          'Higher layer filters often show abstract patterns',
          'Requires understanding of CNN architecture'
        ],
        reference: 'Zeiler, M.D., Fergus, R. "Visualizing and Understanding Convolutional Networks." ECCV 2014'
      },
      
      activationVisualization: {
        title: 'Activation Visualization',
        description: 'Shows how each filter in a layer responds to a specific input image, highlighting which parts of the image activate each filter.',
        useCases: [
          'Seeing which parts of an image trigger specific filters',
          'Understanding how the model decomposes an image into features',
          'Analyzing feature detectors across different layers'
        ],
        limitations: [
          'Activations can be noisy and hard to interpret',
          'Requires analyzing many activation maps',
          'Interpretation becomes more difficult in deeper layers'
        ],
        reference: 'Yosinski, J., et al. "Understanding Neural Networks Through Deep Visualization." ICML 2015'
      },
      
      integratedGradients: {
        title: 'Integrated Gradients',
        description: 'A feature attribution method that assigns an importance score to each input feature (pixel) by integrating gradients along a path from a baseline to the input.',
        useCases: [
          'Attributing a prediction to specific input pixels',
          'Identifying which pixels positively or negatively impact the prediction',
          'Providing pixel-level explanation of model behavior'
        ],
        limitations: [
          'Computationally intensive due to path integration',
          'Requires choosing an appropriate baseline',
          'Attribution maps can be hard to interpret'
        ],
        reference: 'Sundararajan, M., Taly, A., Yan, Q. "Axiomatic Attribution for Deep Networks." ICML 2017'
      },
      
      featureVisualization: {
        title: 'Feature Visualization',
        description: 'Generates synthetic inputs that maximize the activation of specific neurons to visualize what features or patterns the network has learned to detect.',
        useCases: [
          'Understanding what patterns each filter detects',
          'Visualizing the hierarchy of features across network layers',
          'Exploring the "visual vocabulary" learned by the model'
        ],
        limitations: [
          'Optimization process can be unstable',
          'Generated images may contain artifacts',
          'Visualizations can be abstract and hard to interpret'
        ],
        reference: 'Olah, C., et al. "Feature Visualization." Distill, 2017'
      }
    };
    
    return docs[technique.toLowerCase()] || {
      title: 'Unknown Technique',
      description: 'Documentation not available for this technique',
      useCases: [],
      limitations: [],
      reference: ''
    };
  }
}

export default ErrorHandler;
