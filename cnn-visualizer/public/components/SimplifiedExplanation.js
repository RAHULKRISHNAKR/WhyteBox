import React from 'react';

const SimplifiedExplanation = ({ predictionData, heatmapSrc }) => {
  // Default content if no prediction data is available
  if (!predictionData) {
    return (
      <div className="simplified-explanation">
        <div className="explanation-placeholder">
          <h3>How the AI Sees Images</h3>
          <p>Upload or select an image to see how the AI analyzes it!</p>
          <img 
            src="/assets/images/explanation-placeholder.png" 
            alt="Explanation example" 
            className="placeholder-img" 
          />
        </div>
      </div>
    );
  }
  
  // With prediction data
  const { prediction, confidence } = predictionData;
  const confidencePercent = (confidence * 100).toFixed(0);
  
  return (
    <div className="simplified-explanation">
      <h3>The AI's Analysis</h3>
      
      <div className="prediction-result">
        <div className="prediction-header">
          <span className="prediction-label">The AI thinks this is:</span>
          <span className="prediction-value">{prediction}</span>
          <div className="confidence-meter">
            <div className="confidence-bar" style={{width: `${confidencePercent}%`}}></div>
            <span className="confidence-label">{confidencePercent}% confident</span>
          </div>
        </div>
      </div>
      
      <div className="explanation-visual">
        <h4>Why did the AI make this decision?</h4>
        <p>The highlighted areas show what was most important to the AI:</p>
        
        <div className="heatmap-container">
          <div className="original-image">
            <h5>Original Image</h5>
            <img src={predictionData.imageUrl} alt="Original" />
          </div>
          <div className="heatmap-image">
            <h5>AI's Focus Areas</h5>
            <img src={heatmapSrc} alt="Heatmap visualization" />
          </div>
        </div>
        
        <div className="explanation-text">
          <p>
            The brighter areas in the heatmap show what features the AI focused on when making 
            its decision. For example, when identifying a cat, the AI often looks at ears, 
            whiskers and eyes rather than the background.
          </p>
        </div>
      </div>
      
      <div className="ai-thinking">
        <h4>How the AI Processes Images - Step by Step</h4>
        <ol className="processing-steps">
          <li>
            <strong>First:</strong> The AI breaks down the image into simple patterns like edges and colors
          </li>
          <li>
            <strong>Next:</strong> It combines these patterns to identify shapes like circles, rectangles, and curves
          </li>
          <li>
            <strong>Then:</strong> It recognizes specific features (like eyes, wheels, or wings)
          </li>
          <li>
            <strong>Finally:</strong> It compares these features with what it learned during training to make a prediction
          </li>
        </ol>
      </div>
    </div>
  );
};

export default SimplifiedExplanation;
