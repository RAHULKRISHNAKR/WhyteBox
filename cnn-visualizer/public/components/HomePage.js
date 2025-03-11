import React from 'react';

const HomePage = ({ 
  onViewModelClick, 
  onHelpClick, 
  modelName = 'MobileNetV2',
  availableModels = [],
  selectedModel,
  onModelChange
}) => {
  // Model descriptions for different architectures
  const modelDescriptions = {
    mobilenetv2: {
      name: "MobileNetV2",
      description: "MobileNetV2 is a lightweight convolutional neural network designed for mobile and edge devices. It uses depthwise separable convolutions to minimize computation while maintaining high accuracy.",
      features: [
        { label: "Architecture", value: "53 layers with inverted residual structure" },
        { label: "Parameters", value: "~3.5 million parameters (compared to ~138 million in VGG16)" },
        { label: "Input Size", value: "224×224 RGB images" },
        { label: "Output", value: "1000-class classification (ImageNet)" },
        { label: "Key Feature", value: "Uses depthwise separable convolutions for efficiency" }
      ]
    },
    mobilenetv1: {
      name: "MobileNetV1",
      description: "The original MobileNet architecture that introduced depthwise separable convolutions for efficient deep learning on mobile devices.",
      features: [
        { label: "Architecture", value: "28 layers including depthwise and pointwise convolutions" },
        { label: "Parameters", value: "~4.2 million parameters" },
        { label: "Input Size", value: "224×224 RGB images" },
        { label: "Output", value: "1000-class classification (ImageNet)" },
        { label: "Key Feature", value: "First model to use depthwise separable convolutions for mobile" }
      ]
    },
    resnet50: {
      name: "ResNet50",
      description: "ResNet50 is a 50-layer deep CNN that introduced residual connections to solve the vanishing gradient problem in very deep networks.",
      features: [
        { label: "Architecture", value: "50 layers with residual connections" },
        { label: "Parameters", value: "~25.6 million parameters" },
        { label: "Input Size", value: "224×224 RGB images" },
        { label: "Output", value: "1000-class classification (ImageNet)" },
        { label: "Key Feature", value: "Uses skip connections to enable training of very deep networks" }
      ]
    },
    inceptionv3: {
      name: "Inception V3",
      description: "Inception V3 is a widely-used image recognition model that has been shown to attain greater than 78.1% accuracy on the ImageNet dataset.",
      features: [
        { label: "Architecture", value: "48 layers with inception modules" },
        { label: "Parameters", value: "~23.8 million parameters" },
        { label: "Input Size", value: "299×299 RGB images" },
        { label: "Output", value: "1000-class classification (ImageNet)" },
        { label: "Key Feature", value: "Uses inception modules with factorized convolutions" }
      ]
    },
    efficientnetb0: {
      name: "EfficientNet B0",
      description: "EfficientNet uses a compound scaling method to balance network depth, width, and resolution for optimal performance and efficiency.",
      features: [
        { label: "Architecture", value: "~18 layers with MBConv blocks" },
        { label: "Parameters", value: "~5.3 million parameters" },
        { label: "Input Size", value: "224×224 RGB images" },
        { label: "Output", value: "1000-class classification (ImageNet)" },
        { label: "Key Feature", value: "Uses compound scaling for balanced network dimensions" }
      ]
    }
  };

  // Get the current model info
  const currentModelInfo = modelDescriptions[selectedModel] || modelDescriptions.mobilenetv2;

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>WhyteBox: Neural Network Visualizer</h1>
        <p className="tagline">Explore and understand Convolutional Neural Networks through interactive 3D visualization</p>
        
        <div className="model-selection">
          <label>Choose a pre-trained model:</label>
          <select 
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="model-dropdown"
          >
            {availableModels.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </div>
        
        <div className="hero-buttons">
          <button className="view-model-btn" onClick={onViewModelClick}>
            View Model
            <span className="btn-icon">→</span>
          </button>
          
          <button className="guide-btn" onClick={onHelpClick}>
            Beginners Guide
            <span className="btn-icon">?</span>
          </button>
        </div>
      </div>
      
      <div className="model-info-panel">
        <h2>About {currentModelInfo.name}</h2>
        <p>{currentModelInfo.description}</p>
        <ul className="model-features">
          {currentModelInfo.features.map((feature, index) => (
            <li key={index}><strong>{feature.label}:</strong> {feature.value}</li>
          ))}
        </ul>
      </div>
      
      <div className="project-details">
        <div className="detail-section">
          <h2>About This Project</h2>
          <p>WhyteBox is an interactive tool designed to demystify Convolutional Neural Networks (CNNs). 
             By visualizing the architecture and internal workings of CNNs in 3D, we aim to make 
             deep learning more accessible and understandable.</p>
        </div>
        
        <div className="detail-section">
          <h2>Key Features</h2>
          <ul className="feature-list">
            <li>
              <span className="feature-icon">🔍</span>
              <div>
                <h3>3D Model Visualization</h3>
                <p>Explore CNN architecture in an interactive 3D environment</p>
              </div>
            </li>
            <li>
              <span className="feature-icon">🧠</span>
              <div>
                <h3>Layer Inspection</h3>
                <p>View and understand different layers and their functions</p>
              </div>
            </li>
            <li>
              <span className="feature-icon">🔄</span>
              <div>
                <h3>Real-time Processing</h3>
                <p>See how images are processed through the network</p>
              </div>
            </li>
            <li>
              <span className="feature-icon">💡</span>
              <div>
                <h3>Explainable AI</h3>
                <p>Understand how and why the model makes specific predictions</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="detail-section">
          <h2>How to Use</h2>
          <ol className="steps-list">
            <li>Choose a pre-trained model from the dropdown menu</li>
            <li>Click the "View Model" button to load the 3D CNN visualization</li>
            <li>Use your mouse to rotate and explore the model from different angles</li>
            <li>Click on specific layers to see detailed information</li>
            <li>Toggle different visualization options to understand model behavior</li>
          </ol>
        </div>
        
        <div className="detail-section">
          <h2>About the Team</h2>
          <p>This project was developed as part of the KTU S6 Data Science Mini Project.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
