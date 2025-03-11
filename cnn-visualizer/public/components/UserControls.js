import React from 'react';

class UserControls extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedLayer: null,
            parameters: {}
        };
    }

    handleLayerSelect = (layer) => {
        this.setState({ selectedLayer: layer });
        this.props.onLayerChange(layer);
    };

    handleParameterChange = (param, value) => {
        this.setState(prevState => ({
            parameters: {
                ...prevState.parameters,
                [param]: value
            }
        }));
        this.props.onParameterChange(param, value);
    };

    
    render() {
        return (
            <div className="user-controls">
                <h2>User Controls</h2>
                <div>
                    <label>Select Layer:</label>
                    <select onChange={(e) => this.handleLayerSelect(e.target.value)}>
                    {this.props.layers.map((layer, index) => (
    <option key={`${layer}-${index}`} value={layer}>{layer}</option>
))}

                    </select>
                </div>
                <div>
                    <label>Adjust Parameter:</label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        onChange={(e) => this.handleParameterChange('parameterName', e.target.value)}
                    />
                </div>
            </div>
        );
    }
}

export default UserControls;