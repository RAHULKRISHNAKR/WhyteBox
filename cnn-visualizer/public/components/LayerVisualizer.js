import React from 'react';

class LayerVisualizer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            layers: [],
            selectedLayer: null,
        };
    }

    componentDidMount() {
        this.loadLayers();
    }

    componentDidUpdate(prevProps) {
        // Reload layers if model changes
        if (prevProps.model !== this.props.model) {
            this.loadLayers();
        }
    }

    loadLayers() {
        if (!this.props.model || !this.props.model.model) {
            console.log("No model available yet");
            return;
        }
        
        try {
            // Get layers from the model
            const layers = this.props.model.getLayers();
            console.log("Loaded layers:", layers);
            this.setState({ layers });
        } catch (error) {
            console.error("Error loading layers:", error);
        }
    }

    handleLayerSelect = (layer) => {
        this.setState({ selectedLayer: layer });
        this.props.onLayerSelect(layer); // Notify parent component
    };

    render() {
        const { layers, selectedLayer } = this.state;

        if (!layers || layers.length === 0) {
            return (
                <div className="layer-visualizer">
                    <h2>Layer Visualizer</h2>
                    <p>No layers available. Please check if the model is loaded correctly.</p>
                </div>
            );
        }

        return (
            <div className="layer-visualizer">
                <h2>Layer Visualizer</h2>
                <ul>
                    {layers.map((layer, index) => (
                        <li key={index} onClick={() => this.handleLayerSelect(layer)}>
                            {layer.type} {selectedLayer === layer ? '(Selected)' : ''}
                        </li>
                    ))}
                </ul>
                {selectedLayer && (
                    <div className="layer-details">
                        <h3>{selectedLayer.type} Details</h3>
                        <pre>{JSON.stringify(selectedLayer, null, 2)}</pre>
                    </div>
                )}
            </div>
        );
    }
}

export default LayerVisualizer;