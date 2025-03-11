import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import FeatureVisualizer from '../utils/FeatureVisualizer';

const FeatureExplorer = ({ model }) => {
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [availableLayers, setAvailableLayers] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [iterations, setIterations] = useState(100);
  const [filterVisualizations, setFilterVisualizations] = useState([]);
  const [gridVisualization, setGridVisualization] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [visualizationMode, setVisualizationMode] = useState('grid'); // 'grid' or 'individual'
  
  const canvasRef = useRef(null);
  
  // Initialize available layers when model changes
  useEffect(() => {
    if (model && model.model && model.model.layers) {
      // Get all convolutional layers
      const convLayers = model.model.layers.filter(layer => 
        layer.type && (
          layer.type.toLowerCase().includes('conv') || 
          layer.type.toLowerCase().includes('dense')
        )
      );
      
      setAvailableLayers(convLayers);
      
      // Select the first convolutional layer by default
      const firstConvLayer = convLayers.find(layer => 
        layer.type.toLowerCase().includes('conv')
      );
      
      if (firstConvLayer) {
        setSelectedLayer(firstConvLayer);
      }
    }
  }, [model]);
  
  const handleGenerateVisualizations = async () => {
    if (!model || !model.tfModel || !selectedLayer) {
      setErrorMessage("Please ensure a model is loaded and a layer is selected.");
      return;
    }
    
    setIsGenerating(true);
    setProgress(0);
    setErrorMessage(null);
    setFilterVisualizations([]);
    setGridVisualization(null);
    
    try {
      const visualizer = new FeatureVisualizer(model);
      
      if (visualizationMode === 'grid') {
        // Generate a grid visualization of multiple filters
        setProgress(10); // Initial progress
        
        const grid = await visualizer.visualizeLayerFilters(selectedLayer.name, {
          numFilters: 16,
          gridWidth: 4,
          tileWidth: 100,
          tileHeight: 100,
          iterations: iterations,
          learningRate: 0.1,
          regularization: 0.001
        });
        
        setProgress(90);
        
        if (grid) {
          // Convert tensor to image data
          const imageData = await visualizer.tensorToImageData(grid);
          
          // Draw to canvas
          if (imageData) {
            const canvas = canvasRef.current;
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
            
            setGridVisualization(canvas.toDataURL());
          }
          
          // Clean up tensor
          grid.dispose();
        } else {
          setErrorMessage("Failed to generate visualization grid");
        }
      } else {
        // Generate individual filter visualizations
        const numFilters = 16;
        const results = [];
        
        for (let i = 0; i < numFilters; i++) {
          // Update progress
          setProgress(Math.floor((i / numFilters) * 100));
          
          // Generate visualization for this filter
          const filterVis = await visualizer.visualizeFilter(selectedLayer.name, i, {
            width: 128,
            height: 128,
            iterations: iterations,
            learningRate: 0.1,
            regularization: 0.001
          });
          
          if (filterVis) {
            // Convert tensor to image data
            const imageData = await visualizer.tensorToImageData(filterVis);
            
            if (imageData) {
              // Create a canvas to convert to image URL
              const canvas = document.createElement('canvas');
              canvas.width = imageData.width;
              canvas.height = imageData.height;
              
              const ctx = canvas.getContext('2d');
              ctx.putImageData(imageData, 0, 0);
              
              results.push({
                id: i,
                src: canvas.toDataURL(),
                title: `Filter ${i + 1}`
              });
            }
            
            // Clean up tensor
            filterVis.dispose();
          }
        }
        
        setFilterVisualizations(results);
      }
      
      setProgress(100);
    } catch (error) {
      console.error("Error generating feature visualizations:", error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="feature-visualization-section">
      <h3>Feature Visualization</h3>
      <p>
        Generate visualizations of the patterns that specific filters in the neural network are detecting.
        This helps understand what features the model has learned to recognize.
      </p>
      
      <div className="feature-controls">
        <div className="feature-control-group">
          <label>Select Layer:</label>
          <select
            value={selectedLayer?.name || ''}
            onChange={(e) => {
              const layer = availableLayers.find(l => l.name === e.target.value);
              setSelectedLayer(layer);
            }}
            disabled={isGenerating}
          >
            <option value="">Select a layer</option>
            {availableLayers.map(layer => (
              <option key={layer.name} value={layer.name}>
                {layer.name} ({layer.type})
              </option>
            ))}
          </select>
        </div>
        
        <div className="feature-control-group">
          <label>Visualization Mode:</label>
          <select
            value={visualizationMode}
            onChange={(e) => setVisualizationMode(e.target.value)}
            disabled={isGenerating}
          >
            <option value="grid">Grid View</option>
            <option value="individual">Individual Filters</option>
          </select>
        </div>
        
        <div className="feature-control-group">
          <label>Optimization Iterations:</label>
          <input
            type="number"
            value={iterations}
            onChange={(e) => setIterations(parseInt(e.target.value) || 50)}
            min={50}
            max={300}
            disabled={isGenerating}
          />
          <span className="helper-text">Higher = better quality but slower</span>
        </div>
        
        <button
          className="generate-button"
          onClick={handleGenerateVisualizations}
          disabled={isGenerating || !selectedLayer}
        >
          {isGenerating ? 'Generating...' : 'Generate Feature Visualization'}
        </button>
      </div>
      
      {errorMessage && (
        <div className="error-message">{errorMessage}</div>
      )}
      
      {isGenerating && (
        <div className="feature-progress">
          <p>Generating visualizations... {progress}%</p>
          <div className="feature-progress-bar">
            <div 
              className="feature-progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="feature-visualization-container">
        {visualizationMode === 'grid' && gridVisualization && (
          <div className="grid-visualization">
            <h4>Filter Patterns in {selectedLayer?.name}</h4>
            <img 
              src={gridVisualization} 
              alt="Grid of filter visualizations"
              className="feature-canvas"
            />
          </div>
        )}
        
        {visualizationMode === 'individual' && filterVisualizations.length > 0 && (
          <div className="individual-visualizations">
            <h4>Individual Filter Patterns in {selectedLayer?.name}</h4>
            <div className="feature-grid">
              {filterVisualizations.map(filter => (
                <div key={filter.id} className="feature-grid-item">
                  <img 
                    src={filter.src} 
                    alt={filter.title} 
                    title={filter.title} 
                  />
                  <div className="feature-grid-label">{filter.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {(gridVisualization || filterVisualizations.length > 0) && (
        <div className="visualization-explanation">
          <h4>Understanding Feature Visualization</h4>
          <p>
            These visualizations show what patterns or features each filter in the neural network 
            is detecting. They are generated by creating synthetic inputs that maximally activate 
            specific neurons in the network.
          </p>
          <p>
            <strong>Earlier layers</strong> typically detect simple features like edges, textures, and colors.
            <strong>Deeper layers</strong> combine these to detect more complex patterns like shapes, parts of objects, or entire objects.
          </p>
          <p>
            This technique helps us understand the internal representations learned by the CNN and
            provides insight into how the model "sees" the world.
          </p>
        </div>
      )}
      
      {!gridVisualization && filterVisualizations.length === 0 && !isGenerating && (
        <div className="placeholder-feature">
          <p>
            Select a layer and click "Generate Feature Visualization" to see what patterns
            the filters in that layer are detecting.
          </p>
          <p>
            <strong>Note:</strong> Feature visualization can be computationally intensive and may take some time,
            especially for deeper layers with many filters.
          </p>
        </div>
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default FeatureExplorer;
