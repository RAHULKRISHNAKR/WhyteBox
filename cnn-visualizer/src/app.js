import React from 'react';
import ReactDOM from 'react-dom';
import CNNModel from '../public/components/CNNModel';
import ExplainabilityView from '../public/components/ExplainabilityView';
import LayerVisualizer from '../public/components/LayerVisualizer';
import UserControls from '../public/components/UserControls';
import ThreeJSCNNVisualizer from '../public/components/ThreeJSCNNVisualizer';
import HomePage from '../public/components/HomePage';
import BeginnersGuide from '../public/components/BeginnersGuide';
import ExplainabilityDocs from '../public/components/ExplainabilityDocs';
import '../public/assets/css/styles.css';
import * as THREE from 'three';
window.THREE = THREE; // ✅ Makes Three.js global
import * as TWEEN from '@tweenjs/tween.js';
window.TWEEN = TWEEN; // Ensure it's available globally



class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            model: null,
            layers: [],
            selectedLayer: null,
            isLoading: true,
            error: null,
            currentView: 'home',
            activeTab: 'visualizer',
            showBeginnersGuide: false,
            // Now using MobileNetV2 detailed visualization
            selectedModelType: 'mobilenetv2-vis'
        };
    }
    
    async componentDidMount() {
        try {
            console.log("App mounting, loading MobileNetV2 model...");
            // Use the MobileNetV2 visualization model
            await this.loadModel('mobilenetv2-vis');
        } catch (error) {
            console.error("Error in componentDidMount:", error);
            this.setState({
                isLoading: false,
                error: "Failed to initialize the application: " + error.message
            });
        }
    }
    
    async loadModel(modelType = 'mobilenetv2-vis') {
        try {
            this.setState({ 
                isLoading: true, 
                error: null
            });
            
            console.log(`Loading MobileNetV2 model...`);
            // Create model instance
            const model = new CNNModel();
            // Load the MobileNetV2 visualization model (simplified to only use this model)
            const loadedModel = await model.loadModel('mobilenetv2-vis');
            
            // Error handling
            if (!loadedModel) {
                throw new Error(`Failed to load model - no model returned`);
            }
            
            if (!loadedModel.model || !loadedModel.model.layers) {
                throw new Error("Model loaded but has invalid structure");
            }
            
            // Get layers for visualization
            const layers = model.getLayers().map(layer => layer.type) || [];
            console.log(`Loaded MobileNetV2 model with ${layers.length} layers`);
            
            this.setState({
                model: model,
                layers: layers,
                modelName: 'MobileNetV2',
                isLoading: false,
                selectedModelType: 'mobilenetv2-vis',
                error: null
            });
        } catch (error) {
            console.error("Error loading model:", error);
            this.setState({ 
                isLoading: false,
                error: `Failed to load model: ${error.message}`
            });
        }
    }
    
    handleLayerChange = (layer) => {
        console.log("Layer selected:", layer);
        this.setState({ selectedLayer: layer });
    };

    handleParameterChange = (param, value) => {
        console.log(`Parameter ${param} changed to ${value}`);
    };

    setActiveTab = (tab) => {
        this.setState({ activeTab: tab });
    };
    
    handleViewModelClick = () => {
        this.setState({ currentView: 'model' });
    };
    
    handleBackToHome = () => {
        this.setState({ currentView: 'home' });
    };

    toggleBeginnersGuide = () => {
        this.setState(prevState => ({ 
            showBeginnersGuide: !prevState.showBeginnersGuide 
        }));
    }

    renderContent() {
        const { 
            model, 
            layers, 
            selectedLayer, 
            isLoading, 
            error, 
            activeTab, 
            currentView, 
            showBeginnersGuide, 
            modelName,
            selectedModelType
        } = this.state;

        if (isLoading) {
            return (
                <div className="loading-container">
                    <p>Loading 3D CNN Visualization...</p>
                    <div className="spinner"></div>
                    <p className="loading-tip">Please wait while we initialize the visualization...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="error-container">
                    <h2>Error Loading Model</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button 
                            className="button" 
                            onClick={() => this.loadModel('mobilenetv2-vis')}
                        >
                            Try Again
                        </button>
                        <button 
                            className="button secondary" 
                            onClick={this.handleBackToHome}
                        >
                            Return to Home
                        </button>
                    </div>
                </div>
            );
        }
        
        return (
            <>
                {showBeginnersGuide && <BeginnersGuide onClose={this.toggleBeginnersGuide} />}
                
                {currentView === 'home' ? (
                    <HomePage 
                        onViewModelClick={this.handleViewModelClick} 
                        onHelpClick={this.toggleBeginnersGuide}
                        modelName={modelName}
                    />
                ) : (
                    <>
                        <header>
                            <div className="header-content">
                                <button className="back-button" onClick={this.handleBackToHome}>
                                    &larr; Back to Home
                                </button>
                                <h1>{modelName}</h1>
                                <button className="help-button" onClick={this.toggleBeginnersGuide}>
                                    Need Help?
                                </button>
                            </div>
                            <div className="tabs">
                                <button 
                                    className={`tab ${activeTab === 'visualizer' ? 'active' : ''}`}
                                    onClick={() => this.setActiveTab('visualizer')}
                                >
                                    3D Model Visualization
                                </button>
                                <button 
                                    className={`tab ${activeTab === 'explainability' ? 'active' : ''}`}
                                    onClick={() => this.setActiveTab('explainability')}
                                >
                                    Explainability
                                </button>
                            </div>
                        </header>

                        {activeTab === 'visualizer' ? (
                            <div className="model-container">
                                <UserControls 
                                    layers={layers} 
                                    onLayerChange={this.handleLayerChange}
                                    onParameterChange={this.handleParameterChange}
                                />
                                <ThreeJSCNNVisualizer 
                                    model={model} 
                                    modelType={selectedModelType}
                                    onLayerSelect={this.handleLayerChange}
                                />
                            </div>
                        ) : (
                            <div className="explainability-container">
                                <ExplainabilityView 
                                    model={model}
                                />
                            </div>
                        )}
                    </>
                )}
            </>
        );
    }

    render() {
        return (
            <div className="container">
                {this.renderContent()}
            </div>
        );
    }
}

ReactDOM.render(<App />, document.getElementById('app'));