import React from 'react';

const LayerInfoPanel = ({ layerInfo, onClose }) => {
  if (!layerInfo) return null;

  // Get layer-specific explanation text
  const getLayerExplanation = (type) => {
    const explanations = {
      'conv2d': 'Standard convolutional layer that applies filters across the input, detecting features like edges, textures, and patterns.',
      'depthwiseConv2d': 'Applies a single filter per input channel, drastically reducing parameters while maintaining spatial information. Key building block of MobileNetV2\'s efficiency.',
      'batchnorm': 'Normalizes layer outputs, helping training stability and allowing higher learning rates. Crucial for deep networks.',
      'activation': 'Applies non-linearity (typically ReLU6 in MobileNetV2). ReLU6 is capped at 6, helping with robustness for low-precision inference.',
      'add': 'Residual/skip connection that adds two feature maps, helping with gradient flow during training and enabling deeper networks.',
      'pooling2d': 'Reduces spatial dimensions while maintaining feature information, reducing computation needs in deeper layers.',
      'flatten': 'Converts 2D feature maps to 1D vectors for the final classification layers.',
      'dense': 'Fully connected layer for final classification, connecting to all neurons in the previous layer.'
    };
    
    return explanations[type] || 'This layer processes features extracted by earlier layers.';
  };

  // Get MobileNetV2-specific role explanation for this layer type
  const getMobileNetRoleExplanation = (type, name) => {
    if (type === 'conv2d' && name === 'Conv1') {
      return 'Initial feature extraction layer that processes the raw image input.';
    } else if (type === 'conv2d' && name.includes('expand')) {
      return 'Expansion layer that increases the channel dimension, part of MobileNetV2\'s inverted residual structure.';
    } else if (type === 'conv2d' && name.includes('project')) {
      return 'Projection layer that reduces dimensions back down, completing the inverted residual block.';
    } else if (type === 'depthwiseConv2d') {
      return 'Core efficiency component that processes each channel separately, dramatically reducing computation.';
    } else if (type === 'add') {
      return 'Skip connection that enables better gradient flow and improves training of deep networks.';
    } else if (type === 'batchnorm') {
      return 'Normalizes activations to stabilize training, particularly important after convolutions.';
    } else if (type === 'dense' && name.includes('Logits')) {
      return 'Final classification layer that outputs class probabilities.';
    }
    
    return '';
  };

  return (
    <div className="layer-info-panel">
      <div className="layer-info-header">
        <h3>{layerInfo.name}</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="layer-type">
        <span className="label">Type:</span> 
        <span className="value">{layerInfo.type}</span>
      </div>
      
      <div className="layer-explanation">
        <p>{getLayerExplanation(layerInfo.type)}</p>
        {getMobileNetRoleExplanation(layerInfo.type, layerInfo.name) && (
          <p className="role-explanation">
            <strong>Role in MobileNetV2:</strong> {getMobileNetRoleExplanation(layerInfo.type, layerInfo.name)}
          </p>
        )}
      </div>
      
      <div className="layer-details">
        {layerInfo.config.filters && (
          <div className="detail-item">
            <span className="label">Filters:</span>
            <span className="value">{layerInfo.config.filters}</span>
          </div>
        )}
        
        {layerInfo.config.kernelSize && (
          <div className="detail-item">
            <span className="label">Kernel Size:</span>
            <span className="value">{layerInfo.config.kernelSize.join(' × ')}</span>
          </div>
        )}
        
        {layerInfo.config.units && (
          <div className="detail-item">
            <span className="label">Units:</span>
            <span className="value">{layerInfo.config.units}</span>
          </div>
        )}
        
        {layerInfo.config.activation && (
          <div className="detail-item">
            <span className="label">Activation:</span>
            <span className="value">{layerInfo.config.activation}</span>
          </div>
        )}
      </div>
      
      {/* MobileNetV2 Efficiency Info Section */}
      {(layerInfo.type === 'depthwiseConv2d' || layerInfo.name.includes('expand') || layerInfo.name.includes('project')) && (
        <div className="efficiency-info">
          <h4>Efficiency Impact</h4>
          <p>
            This layer is part of MobileNetV2's inverted residual structure, which allows the network 
            to maintain high accuracy while using up to 10x fewer parameters than traditional CNNs.
          </p>
          {layerInfo.type === 'depthwiseConv2d' && (
            <p>
              Depthwise convolutions reduce computation by a factor of N (number of output channels) 
              compared to standard convolutions.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LayerInfoPanel;
