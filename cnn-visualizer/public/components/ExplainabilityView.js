import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import GradCAM from '../utils/gradCAM';
import FilterVisualizer from '../utils/FilterVisualizer';
import IntegratedGradients from '../utils/IntegratedGradients';
import PredictionExplainer from './PredictionExplainer';
import FeatureExplorer from './FeatureExplorer';
import ExplainabilityDocs from './ExplainabilityDocs';
import ErrorHandler from '../utils/ErrorHandler';

const ExplainabilityView = ({ model }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [availableLayers, setAvailableLayers] = useState([]);
  const [heatmapImage, setHeatmapImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('predictions');
  const [filterVisualizations, setFilterVisualizations] = useState([]);
  const [activationVisualizations, setActivationVisualizations] = useState([]);
  const [attributionMap, setAttributionMap] = useState(null);
  const [memoryWarning, setMemoryWarning] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [activeTechnique, setActiveTechnique] = useState('');
  
  const canvasRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const attributionCanvasRef = useRef(null);
  
  // Initialize available layers when model changes
  useEffect(() => {
    if (model && model.model && model.model.layers) {
      try {
        // Filter for conv layers which are suitable for visualization
        const convLayers = model.model.layers.filter(layer => 
          layer.type && (layer.type.toLowerCase().includes('conv') || 
                         layer.type.toLowerCase().includes('dense'))
        );
        setAvailableLayers(convLayers);
        if (convLayers.length > 0) {
          setSelectedLayer(convLayers[convLayers.length - 1]); // Select the last layer by default
        }
      } catch (error) {
        console.error("Error processing model layers:", error);
        setErrorMessage("Could not process model layers. Model structure may be incompatible.");
      }
    }
  }, [model]);

  // Cleanup function for tensor memory
  const cleanupTensors = () => {
    try {
      const numTensors = tf.memory().numTensors;
      if (numTensors > 100) {
        console.warn(`High tensor count (${numTensors}), cleaning up...`);
        tf.engine().endScope();
        tf.engine().startScope();
        setMemoryWarning(true);
        setTimeout(() => setMemoryWarning(false), 5000); // Clear warning after 5 seconds
      }
    } catch (e) {
      console.error("Error cleaning up tensors:", e);
    }
  };
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setSelectedImage(img);
          // Draw the image on the canvas
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
          
            // Clear existing visualizations when a new image is uploaded
            setHeatmapImage(null);
            setFilterVisualizations([]);
            setActivationVisualizations([]);
            setAttributionMap(null);
            setErrorMessage(null);
          }
        };
        img.onerror = () => {
          setErrorMessage("Failed to load image. Please try another file.");
        };
        img.src = event.target.result;
      };
      reader.onerror = () => {
        setErrorMessage("Failed to read image file.");
      }
      reader.readAsDataURL(file);
    }
  };
  
  const generateGradCAM = async () => {
    if (!selectedImage || !selectedLayer || !model || !model.tfModel) {
      setErrorMessage(
        ErrorHandler.formatUserError(
          "Missing required inputs",
          "Please select an image and layer first, or ensure the model is loaded."
        )
      );
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      // Start a new scope to manage memory
      tf.engine().startScope();
      
      // Convert the image to a tensor
      const imgTensor = tf.browser.fromPixels(selectedImage);
      
      // Create GradCAM instance
      const gradCAM = new GradCAM(model);
      
      // Generate heatmap for the selected layer
      const heatmap = await gradCAM.generateHeatmap(
        imgTensor, 
        selectedLayer.name
      );
      
      if (heatmap) {
        // Apply heatmap to the original image
        const overlaidImage = await gradCAM.applyHeatmapToImage(
          selectedImage, 
          heatmap,
          0.7 // Alpha blending factor
        );
        
        // Render the heatmap on the canvas
        const heatmapCanvas = heatmapCanvasRef.current;
        
        // Set canvas dimensions to match the image
        if (heatmapCanvas) {
          heatmapCanvas.width = selectedImage.width;
          heatmapCanvas.height = selectedImage.height;
          
          // Draw the heatmap
          await tf.browser.toPixels(overlaidImage, heatmapCanvas);
          setHeatmapImage(heatmapCanvas.toDataURL());
        }
        
        // Cleanup tensors
        imgTensor.dispose();
        heatmap.dispose();
        overlaidImage.dispose();
      } else {
        setErrorMessage("Failed to generate heatmap. Check console for details.");
      }
    } catch (error) {
      const errorMsg = ErrorHandler.handleError("GradCAM Generation", error);
      setErrorMessage(ErrorHandler.formatUserError(errorMsg));
    } finally {
      // End the scope to release memory
      tf.engine().endScope();
      setIsProcessing(false);
      cleanupTensors();
    }
  };

  // Visualize filters from selected layer
  const visualizeFilters = async () => {
    if (!selectedLayer || !model || !model.tfModel) {
      setErrorMessage("Please ensure a layer is selected and the model is loaded.");
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    setFilterVisualizations([]);
    
    try {
      // Start a new scope to manage memory
      tf.engine().startScope();
      
      const filterVisualizer = new FilterVisualizer(model);
      
      // Generate filter visualizations
      const visualizations = await filterVisualizer.visualizeFilters(
        selectedLayer.name,
        { maxFilters: 16, size: 64 }
      );
      
      if (visualizations && visualizations.length > 0) {
        // Convert ImageData objects to displayable images
        const filterImages = visualizations.map((imageData, index) => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
            
            return {
              id: index,
              src: canvas.toDataURL(),
              title: `Filter ${index + 1}`
            };
          } catch (err) {
            console.error(`Error creating visualization for filter ${index}:`, err);
            return null;
          }
        }).filter(Boolean); // Remove any null entries from failed conversions
        
        setFilterVisualizations(filterImages);
      } else {
        setErrorMessage(`No filters could be visualized for layer "${selectedLayer.name}". The layer may not be a convolutional layer or have accessible weights.`);
      }
    } catch (error) {
      console.error("Error visualizing filters:", error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      // End the scope to release memory
      tf.engine().endScope();
      setIsProcessing(false);
      cleanupTensors();
    }
  };
  
  // Visualize activations from selected image through selected layer
  const visualizeActivations = async () => {
    if (!selectedImage || !selectedLayer || !model || !model.tfModel) {
      setErrorMessage("Please select an image and layer first, and ensure the model is loaded.");
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    setActivationVisualizations([]);
    
    try {
      // Start a new scope to manage memory
      tf.engine().startScope();
      
      const filterVisualizer = new FilterVisualizer(model);
      
      // Generate activation visualizations
      const visualizations = await filterVisualizer.visualizeActivations(
        selectedImage,
        selectedLayer.name,
        { maxActivations: 16, size: 64 }
      );
      
      if (visualizations && visualizations.length > 0) {
        // Convert ImageData objects to displayable images
        const activationImages = visualizations.map((imageData, index) => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
            
            return {
              id: index,
              src: canvas.toDataURL(),
              title: `Channel ${index + 1}`
            };
          } catch (err) {
            console.error(`Error creating visualization for activation ${index}:`, err);
            return null;
          }
        }).filter(Boolean); // Remove any null entries from failed conversions
        
        setActivationVisualizations(activationImages);
      } else {
        setErrorMessage(`No activations could be visualized for layer "${selectedLayer.name}". The layer may not be suitable for activation visualization.`);
      }
    } catch (error) {
      console.error("Error visualizing activations:", error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      // End the scope to release memory
      tf.engine().endScope();
      setIsProcessing(false);
      cleanupTensors();
    }
  };
  
  // Generate Integrated Gradients attribution map
  const generateAttributions = async () => {
    if (!selectedImage || !model || !model.tfModel) {
      setErrorMessage("Please select an image first, and ensure the model is loaded.");
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    setAttributionMap(null);
    
    try {
      // Start a new scope to manage memory
      tf.engine().startScope();
      
      // Create Integrated Gradients instance
      const integratedGrads = new IntegratedGradients(model);
      
      // Generate attributions
      const attributions = await integratedGrads.generateAttributions(
        selectedImage, 
        null, // Use predicted class
        50    // Number of steps
      );
      
      if (attributions) {
        // Apply attribution map to the original image
        const visualized = await integratedGrads.applyAttributionMap(
          selectedImage,
          attributions,
          0.6 // Alpha blending factor
        );
        
        // Render on canvas
        const canvas = attributionCanvasRef.current;
        if (canvas) {
          canvas.width = selectedImage.width;
          canvas.height = selectedImage.height;
          
          await tf.browser.toPixels(visualized, canvas);
          setAttributionMap(canvas.toDataURL());
        }
        
        // Clean up
        attributions.dispose();
        visualized.dispose();
      } else {
        setErrorMessage("Failed to generate attributions. Check console for details.");
      }
    } catch (error) {
      console.error("Error generating Integrated Gradients:", error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      // End the scope to release memory
      tf.engine().endScope();
      setIsProcessing(false);
      cleanupTensors();
    }
  };
  
  // Show documentation for a specific technique
  const handleShowDocs = (technique) => {
    setActiveTechnique(technique);
    setShowDocs(true);
  };
  
  // Generate a help button for a section
  const renderHelpButton = (technique) => (
    <button 
      className="help-indicator"
      onClick={(e) => {
        e.stopPropagation();
        handleShowDocs(technique);
      }}
      title={`Learn about ${technique}`}
    >
      ?
    </button>
  );
  
  // Render the selected explainability tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'predictions':
        return (
          <div className="predictions-section">
            <PredictionExplainer 
              model={model}
              image={selectedImage}
            />
          </div>
        );
        
      case 'gradcam':
        return (
          <div className="gradcam-section">
            <button 
              onClick={generateGradCAM} 
              disabled={!selectedImage || !selectedLayer || isProcessing}
              className="generate-button"
            >
              {isProcessing ? 'Processing...' : 'Generate GradCAM'}
            </button>
            
            {heatmapImage && (
              <div className="results-section">
                <h3>GradCAM Results</h3>
                <div className="visualization-container">
                  <div>
                    <h4>Heatmap Overlay</h4>
                    <canvas ref={heatmapCanvasRef} className="heatmap-canvas"></canvas>
                  </div>
                  <div className="explanation">
                    <h4>What is GradCAM?</h4>
                    <p>
                      Gradient-weighted Class Activation Mapping (GradCAM) highlights regions
                      in the image that are important for the model's prediction. Red areas indicate
                      regions that strongly influence the model's decision.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'filters':
        return (
          <div className="filters-section">
            <button 
              onClick={visualizeFilters} 
              disabled={!selectedLayer || isProcessing}
              className="generate-button"
            >
              {isProcessing ? 'Processing...' : 'Visualize Filters'}
            </button>
            
            {filterVisualizations.length > 0 && (
              <div className="results-section">
                <h3>Filter Visualizations</h3>
                <div className="explanation">
                  <p>
                    These visualizations show what patterns each filter in the selected layer is detecting. 
                    Brighter areas show the patterns that activate the filter most strongly.
                  </p>
                </div>
                <div className="filter-grid">
                  {filterVisualizations.map(filter => (
                    <div key={filter.id} className="filter-item">
                      <img src={filter.src} alt={filter.title} title={filter.title} />
                      <span className="filter-title">{filter.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'activations':
        return (
          <div className="activations-section">
            <button 
              onClick={visualizeActivations} 
              disabled={!selectedImage || !selectedLayer || isProcessing}
              className="generate-button"
            >
              {isProcessing ? 'Processing...' : 'Visualize Activations'}
            </button>
            
            {activationVisualizations.length > 0 && (
              <div className="results-section">
                <h3>Activation Visualizations</h3>
                <div className="explanation">
                  <p>
                    These visualizations show how each filter in the selected layer responds to the input image.
                    Red areas indicate strong activations, meaning those parts of the image strongly match the filter's pattern.
                  </p>
                </div>
                <div className="activation-grid">
                  {activationVisualizations.map(activation => (
                    <div key={activation.id} className="activation-item">
                      <img src={activation.src} alt={activation.title} title={activation.title} />
                      <span className="activation-title">{activation.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'integrated-gradients':
        return (
          <div className="attributions-section">
            <button 
              onClick={generateAttributions} 
              disabled={!selectedImage || isProcessing}
              className="generate-button"
            >
              {isProcessing ? 'Processing...' : 'Generate Integrated Gradients'}
            </button>
            
            {attributionMap && (
              <div className="results-section">
                <h3>Integrated Gradients Results</h3>
                <div className="visualization-container">
                  <div>
                    <h4>Attribution Map</h4>
                    <canvas ref={attributionCanvasRef} className="attribution-canvas"></canvas>
                  </div>
                  <div className="explanation">
                    <h4>What are Integrated Gradients?</h4>
                    <p>
                      Integrated Gradients is a feature attribution method that assigns importance scores to
                      individual pixels in the input image. It shows how each pixel contributes to the model's
                      prediction relative to a baseline (typically a black image).
                    </p>
                    <p>
                      <strong>Red</strong> areas show pixels with the strongest positive contributions to the prediction,
                      while <strong>blue</strong> areas show negative contributions. Yellow regions have moderate influence.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'features':
        return <FeatureExplorer model={model} />;
        
      default:
        return <div>Select a visualization method above</div>;
    }
  };
  
  // Render the tab headers with help buttons
  const renderTabHeaders = () => (
    <div className="tabs">
      <button 
        className={`tab ${activeTab === 'predictions' ? 'active' : ''}`}
        onClick={() => setActiveTab('predictions')}
      >
        Predictions
      </button>
      <div className="section-header">
        <button 
          className={`tab ${activeTab === 'gradcam' ? 'active' : ''}`}
          onClick={() => setActiveTab('gradcam')}
        >
          GradCAM
        </button>
        {renderHelpButton('gradcam')}
      </div>
      <div className="section-header">
        <button 
          className={`tab ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          Filter Visualization
        </button>
        {renderHelpButton('filterVisualization')}
      </div>
      <div className="section-header">
        <button 
          className={`tab ${activeTab === 'activations' ? 'active' : ''}`}
          onClick={() => setActiveTab('activations')}
        >
          Activation Visualization
        </button>
        {renderHelpButton('activationVisualization')}
      </div>
      <div className="section-header">
        <button 
          className={`tab ${activeTab === 'integrated-gradients' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrated-gradients')}
        >
          Integrated Gradients
        </button>
        {renderHelpButton('integratedGradients')}
      </div>
      <div className="section-header">
        <button 
          className={`tab ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          Feature Explorer
        </button>
        {renderHelpButton('featureVisualization')}
      </div>
    </div>
  );
  
  return (
    <div className="explainability-view">
      <h2>Explainability View</h2>
      
      {/* Documentation overlay */}
      <ExplainabilityDocs 
        technique={activeTechnique}
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />
      
      {memoryWarning && (
        <div className="memory-warning">
          High memory usage detected. Some visualizations may be slower.
        </div>
      )}
      
      <div className="explainability-controls">
        <div className="control-section">
          <h3>1. Select an Image</h3>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          {selectedImage && (
            <div className="selected-image-container">
              <h4>Original Image</h4>
              <canvas ref={canvasRef} className="image-preview"></canvas>
            </div>
          )}
        </div>
        
        <div className="control-section">
          <h3>2. Choose Layer to Visualize</h3>
          <select 
            value={selectedLayer?.name || ''}
            onChange={(e) => {
              const layer = availableLayers.find(l => l.name === e.target.value);
              setSelectedLayer(layer);
            }}
            disabled={activeTab === 'integrated-gradients' || activeTab === 'predictions' || activeTab === 'features'} 
          >
            <option value="">Select a layer</option>
            {availableLayers.map(layer => (
              <option key={layer.name} value={layer.name}>
                {layer.name} ({layer.type})
              </option>
            ))}
          </select>
          
          {activeTab === 'integrated-gradients' && (
            <p className="helper-text">
              Note: Integrated Gradients analyzes the entire model, so layer selection is not required.
            </p>
          )}
          
          {activeTab === 'predictions' && (
            <p className="helper-text">
              Note: Layer selection is not needed for predictions.
            </p>
          )}
          
          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}
        </div>
      </div>
      
      <div className="visualization-tabs">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            Predictions
          </button>
          <div className="section-header">
            <button 
              className={`tab ${activeTab === 'gradcam' ? 'active' : ''}`}
              onClick={() => setActiveTab('gradcam')}
            >
              GradCAM
            </button>
            {renderHelpButton('gradcam')}
          </div>
          <div className="section-header">
            <button 
              className={`tab ${activeTab === 'filters' ? 'active' : ''}`}
              onClick={() => setActiveTab('filters')}
            >
              Filter Visualization
            </button>
            {renderHelpButton('filterVisualization')}
          </div>
          <div className="section-header">
            <button 
              className={`tab ${activeTab === 'activations' ? 'active' : ''}`}
              onClick={() => setActiveTab('activations')}
            >
              Activation Visualization
            </button>
            {renderHelpButton('activationVisualization')}
          </div>
          <div className="section-header">
            <button 
              className={`tab ${activeTab === 'integrated-gradients' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrated-gradients')}
            >
              Integrated Gradients
            </button>
            {renderHelpButton('integratedGradients')}
          </div>
          <div className="section-header">
            <button 
              className={`tab ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              Feature Explorer
            </button>
            {renderHelpButton('featureVisualization')}
          </div>
        </div>
        
        <div className="tab-content">
          {renderTabContent()}
        </div>
      </div>
      
      {!selectedImage && !filterVisualizations.length && !activationVisualizations.length && !heatmapImage && !attributionMap && (
        <div className="placeholder-feature">
          <h3>How to use explainability features:</h3>
          <ol>
            <li>Upload an image you want to analyze</li>
            <li>View model predictions and confidence scores</li>
            <li>Select a convolutional layer to visualize (for specific techniques)</li>
            <li>Choose a visualization method:
              <ul>
                <li><strong>Predictions:</strong> See what the model thinks the image contains</li>
                <li><strong>GradCAM:</strong> Shows which parts of the image influence the prediction</li>
                <li><strong>Filter Visualization:</strong> Shows what patterns each filter is looking for</li>
                <li><strong>Activation Visualization:</strong> Shows how filters respond to your image</li>
                <li><strong>Integrated Gradients:</strong> Shows how each pixel contributes to the prediction</li>
                <li><strong>Feature Explorer:</strong> Generates inputs that maximize filter activations</li>
              </ul>
            </li>
          </ol>
          <p>These visualizations help you understand how the CNN interprets images and makes decisions.</p>
        </div>
      )}
    </div>
  );
};

export default ExplainabilityView;