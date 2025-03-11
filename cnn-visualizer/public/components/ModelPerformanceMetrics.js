import React from 'react';

const ModelPerformanceMetrics = ({ modelType, onClose }) => {
  // Pre-defined metrics for popular architectures
  const modelMetrics = {
    mobilenetv2: {
      name: 'MobileNetV2',
      params: '3.4 million',
      size: '14 MB',
      inference: '22 ms',
      accuracy: '71.8%',
      operations: '300 million',
      efficiency: 10,
      highlights: [
        'Inverted residual blocks reduce computation',
        'Depthwise separable convolutions minimize parameters',
        'Linear bottlenecks preserve information in narrow layers',
        'ReLU6 activation for better quantization properties'
      ]
    },
    mobilenetv1: {
      name: 'MobileNetV1',
      params: '4.2 million',
      size: '16 MB',
      inference: '27 ms',
      accuracy: '70.6%',
      operations: '569 million',
      efficiency: 8,
      highlights: [
        'Standard depthwise separable convolutions',
        'Simple stacking of layers without residual connections',
        'Linear structure with reduced parameters'
      ]
    },
    resnet50: {
      name: 'ResNet50',
      params: '25.6 million',
      size: '98 MB',
      inference: '87 ms',
      accuracy: '76.0%',
      operations: '3.9 billion',
      efficiency: 4,
      highlights: [
        'Deep network with residual connections',
        'High accuracy but significantly more parameters',
        'Higher computational and memory requirements'
      ]
    },
    efficientnetb0: {
      name: 'EfficientNetB0',
      params: '5.3 million',
      size: '20 MB',
      inference: '24 ms',
      accuracy: '77.1%',
      operations: '390 million',
      efficiency: 9,
      highlights: [
        'Compound scaling for balanced network dimensions',
        'Optimized for accuracy and efficiency trade-off',
        'Squeezing and excitation techniques for channel attention'
      ]
    },
    inceptionv3: {
      name: 'InceptionV3',
      params: '23.8 million',
      size: '92 MB',
      inference: '74 ms',
      accuracy: '77.9%',
      operations: '5.7 billion',
      efficiency: 3,
      highlights: [
        'Multi-branch architecture with parallel convolutions',
        'Good accuracy but high computational complexity',
        'Optimized for server-side deployment'
      ]
    },
    vgg16: {
      name: 'VGG16',
      params: '138 million',
      size: '528 MB',
      inference: '128 ms',
      accuracy: '71.3%',
      operations: '15.5 billion',
      efficiency: 1,
      highlights: [
        'Simple stack of convolutional layers',
        'Very high parameter count',
        'Extremely memory intensive',
        'Used primarily as a benchmark or base architecture'
      ]
    }
  };

  // Get current model or default to mobilenetv2
  const currentModel = modelMetrics[modelType?.toLowerCase()] || modelMetrics.mobilenetv2;
  
  // Array of models to compare
  const comparisonModels = [
    modelMetrics.mobilenetv2,
    modelMetrics.mobilenetv1,
    modelMetrics.resnet50,
    modelMetrics.vgg16
  ];

  // Helper to calculate relative bar width
  const calculateBarWidth = (value, max, property) => {
    switch(property) {
      case 'efficiency':
        return `${value * 10}%`; // Scale from 0-10 to 0-100%
      case 'params':
      case 'size':
      case 'inference':
      case 'operations':
        const maxValue = max || 100;
        const values = comparisonModels.map(model => parseFloat(model[property]));
        const highest = Math.max(...values);
        // Inverse relationship for these metrics (lower is better)
        return `${(1 - (parseFloat(value) / highest)) * 100}%`;
      case 'accuracy':
        // Direct relationship (higher is better)
        return `${parseFloat(value) * 100 / 100}%`;
      default:
        return '50%';
    }
  };

  return (
    <div className="model-performance-metrics">
      <div className="metrics-header">
        <h3>Model Efficiency Comparison</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="metrics-current-model">
        <h4>{currentModel.name} Advantages</h4>
        <ul>
          {currentModel.highlights.map((highlight, index) => (
            <li key={index}>{highlight}</li>
          ))}
        </ul>
      </div>

      <div className="metrics-comparison">
        <h4>Performance Comparison</h4>
        
        <div className="metrics-chart">
          <div className="metrics-chart-label">Parameters</div>
          <div className="metrics-chart-bars">
            {comparisonModels.map((model, index) => (
              <div key={index} className="metrics-bar-container">
                <div className="metrics-bar-label">{model.name}</div>
                <div className="metrics-bar-wrapper">
                  <div
                    className="metrics-bar"
                    style={{ 
                      width: calculateBarWidth(model.params, null, 'params'),
                      backgroundColor: model.name === currentModel.name ? '#4caf50' : '#6e8efb'
                    }}
                  ></div>
                  <span className="metrics-bar-value">{model.params}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="metrics-chart">
          <div className="metrics-chart-label">Model Size</div>
          <div className="metrics-chart-bars">
            {comparisonModels.map((model, index) => (
              <div key={index} className="metrics-bar-container">
                <div className="metrics-bar-label">{model.name}</div>
                <div className="metrics-bar-wrapper">
                  <div
                    className="metrics-bar"
                    style={{ 
                      width: calculateBarWidth(model.size, null, 'size'),
                      backgroundColor: model.name === currentModel.name ? '#4caf50' : '#6e8efb'
                    }}
                  ></div>
                  <span className="metrics-bar-value">{model.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="metrics-chart">
          <div className="metrics-chart-label">Inference Time</div>
          <div className="metrics-chart-bars">
            {comparisonModels.map((model, index) => (
              <div key={index} className="metrics-bar-container">
                <div className="metrics-bar-label">{model.name}</div>
                <div className="metrics-bar-wrapper">
                  <div
                    className="metrics-bar"
                    style={{ 
                      width: calculateBarWidth(model.inference, null, 'inference'),
                      backgroundColor: model.name === currentModel.name ? '#4caf50' : '#6e8efb'
                    }}
                  ></div>
                  <span className="metrics-bar-value">{model.inference}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="metrics-chart">
          <div className="metrics-chart-label">Accuracy (ImageNet)</div>
          <div className="metrics-chart-bars">
            {comparisonModels.map((model, index) => (
              <div key={index} className="metrics-bar-container">
                <div className="metrics-bar-label">{model.name}</div>
                <div className="metrics-bar-wrapper">
                  <div
                    className="metrics-bar"
                    style={{ 
                      width: model.accuracy.replace('%', '') + '%',
                      backgroundColor: model.name === currentModel.name ? '#4caf50' : '#6e8efb'
                    }}
                  ></div>
                  <span className="metrics-bar-value">{model.accuracy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="metrics-footer">
        <p className="metrics-note">
          <strong>Note:</strong> These metrics are based on benchmarks on ImageNet dataset. 
          Inference time measured on a Pixel 3 phone CPU. Parameter counts and sizes are approximate.
        </p>
        <button className="metrics-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ModelPerformanceMetrics;
