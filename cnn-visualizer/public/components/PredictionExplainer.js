import React, { useState, useEffect } from 'react';
import PredictionHelper from '../utils/PredictionHelper';

/**
 * Component for displaying and explaining model predictions
 */
const PredictionExplainer = ({ model, image }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  useEffect(() => {
    // Reset predictions when image or model changes
    setPredictions(null);
    setError(null);
    
    // Get predictions if we have both model and image
    if (model && model.tfModel && image) {
      generatePredictions();
    }
  }, [model, image]);
  
  const generatePredictions = async () => {
    if (!model || !model.tfModel || !image) {
      setError("Model or image not available");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create prediction helper instance
      const predictionHelper = new PredictionHelper(model);
      
      // Get predictions
      const results = await predictionHelper.predict(image);
      setPredictions(results);
    } catch (err) {
      console.error("Prediction error:", err);
      setError(`Error making prediction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Format a confidence value (0-1) as a percentage
  const formatConfidence = (confidence) => {
    return PredictionHelper.formatProbability(confidence);
  };
  
  // Get a friendly description of what the image contains
  const getPredictionDescription = () => {
    if (!predictions || !predictions.topPrediction) return "";
    
    const topClass = predictions.topPrediction.className;
    const confidence = predictions.topPrediction.probability;
    
    if (confidence > 0.9) {
      return `This is definitely a ${topClass}.`;
    } else if (confidence > 0.7) {
      return `This appears to be a ${topClass}.`;
    } else if (confidence > 0.5) {
      return `This might be a ${topClass}, but I'm not very confident.`;
    } else {
      return `I'm not sure, but my best guess is this might be a ${topClass}.`;
    }
  };
  
  // Get a explanation of the confidence level
  const getConfidenceExplanation = () => {
    if (!predictions || !predictions.topPrediction) return "";
    
    const confidence = predictions.topPrediction.probability;
    
    if (confidence > 0.95) {
      return "The model is extremely confident in this prediction.";
    } else if (confidence > 0.8) {
      return "The model is quite confident in this prediction.";
    } else if (confidence > 0.6) {
      return "The model has moderate confidence in this prediction.";
    } else if (confidence > 0.4) {
      return "The model has low confidence. Consider using GradCAM to see what features it's focusing on.";
    } else {
      return "The model is very uncertain. This image may be confusing for the model or contain features from multiple classes.";
    }
  };
  
  // Get explanation of alternative predictions
  const getAlternativesExplanation = () => {
    if (!predictions || !predictions.topPredictions || predictions.topPredictions.length <= 1) {
      return "";
    }
    
    // Look at the second prediction
    const alternative = predictions.topPredictions[1];
    const topConfidence = predictions.topPrediction.probability;
    const altConfidence = alternative.probability;
    const confidenceDiff = topConfidence - altConfidence;
    
    if (confidenceDiff < 0.1) {
      return `The model is also considering ${alternative.className} (${formatConfidence(altConfidence)}), which is very close to the top prediction.`;
    } else if (confidenceDiff < 0.3) {
      return `The model also sees some similarity to ${alternative.className} (${formatConfidence(altConfidence)}).`;
    } else {
      return `Other much less likely possibilities include ${alternative.className} (${formatConfidence(altConfidence)}).`;
    }
  };
  
  // Render a bar chart for confidence scores
  const renderConfidenceBar = (value, maxValue = 1) => {
    const percentage = (value / maxValue) * 100;
    const barColor = 
      percentage > 90 ? '#4caf50' : 
      percentage > 70 ? '#8bc34a' : 
      percentage > 50 ? '#ffeb3b' : 
      percentage > 30 ? '#ff9800' : '#f44336';
      
    return (
      <div className="confidence-bar-container">
        <div className="confidence-bar-wrapper">
          <div 
            className="confidence-bar" 
            style={{ 
              width: `${percentage}%`,
              backgroundColor: barColor
            }}
          />
          <span className="confidence-bar-value">
            {formatConfidence(value)}
          </span>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="prediction-explainer loading">
        <div className="loading-spinner"></div>
        <p>Analyzing image...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="prediction-explainer error">
        <div className="error-message">
          <h3>Error Making Prediction</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!predictions) {
    return (
      <div className="prediction-explainer placeholder">
        {image ? (
          <p>Click "Generate Predictions" to analyze this image.</p>
        ) : (
          <p>Please upload an image to get predictions.</p>
        )}
        {image && (
          <button 
            className="generate-button" 
            onClick={generatePredictions}
            disabled={!model || !model.tfModel}
          >
            Generate Predictions
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="prediction-explainer">
      <div className="prediction-summary">
        <h3>Model Prediction</h3>
        <div className="top-prediction">
          <div className="prediction-class">{predictions.topPrediction.className}</div>
          <div className="prediction-confidence">
            {renderConfidenceBar(predictions.topPrediction.probability)}
          </div>
        </div>
        
        <div className="prediction-explanation">
          <p>{getPredictionDescription()}</p>
          <p>{getConfidenceExplanation()}</p>
          <p>{getAlternativesExplanation()}</p>
        </div>
      </div>
      
      {predictions.topPredictions.length > 1 && (
        <div className="alternative-predictions">
          <h4>Alternative Predictions</h4>
          <ul className="predictions-list">
            {predictions.topPredictions.slice(1, 5).map((prediction, index) => (
              <li key={index} className="prediction-item">
                <div className="prediction-item-label">
                  {prediction.className}
                </div>
                {renderConfidenceBar(prediction.probability)}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="prediction-actions">
        <button 
          className="toggle-advanced-button"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide Advanced Details' : 'Show Advanced Details'}
        </button>
      </div>
      
      {showAdvanced && (
        <div className="advanced-details">
          <h4>How CNN Models Make Predictions</h4>
          <div className="process-explanation">
            <p>The model analyzes the image through these steps:</p>
            <ol>
              <li><strong>Feature Extraction:</strong> Convolutional layers detect patterns like edges, textures, and shapes</li>
              <li><strong>Feature Combination:</strong> Deeper layers combine these features into more complex patterns</li>
              <li><strong>Classification:</strong> Final layers connect these patterns to specific object classes</li>
            </ol>
            <p>For more insights, use the GradCAM or Activation features to visualize how the model "sees" this image.</p>
          </div>
          
          <div className="model-confidence-explanation">
            <h4>Understanding Confidence Scores</h4>
            <p>
              Confidence scores are probabilities (0-100%) that represent how certain the model is about its prediction.
              These are calculated using a softmax function that turns raw model outputs into a probability distribution 
              across all possible classes.
            </p>
            <p>
              <strong>Higher confidence doesn't always mean correct prediction.</strong> Models can be confidently wrong, 
              especially with images that differ from their training data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionExplainer;
