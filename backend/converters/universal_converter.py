"""
Universal Converter - Transform extracted model data into visualization format

Converts extracted model data into a standardized JSON format optimized
for 3D visualization in various frontend frameworks.
"""

import json
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class UniversalConverter:
    """
    Converts extracted model data into a universal visualization format.
    
    This format is designed to be consumed by:
    - TensorSpace.js
    - Babylon.js visualizers
    - Custom 3D rendering engines
    """
    
    def __init__(
        self,
        include_weights: bool = False,
        compress_output: bool = False,
        add_visualization_hints: bool = True
    ):
        """
        Initialize the converter.
        
        Args:
            include_weights: Include weight data in output (increases size)
            compress_output: Compress JSON output
            add_visualization_hints: Add hints for optimal visualization
        """
        self.include_weights = include_weights
        self.compress_output = compress_output
        self.add_visualization_hints = add_visualization_hints
        
        logger.info("Initialized UniversalConverter")
    
    def convert(self, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert extracted model data to visualization format.
        
        Args:
            extracted_data: Dictionary from extractor containing:
                - metadata
                - layers
                - connections
        
        Returns:
            Visualization-ready dictionary
        """
        logger.info("Converting extracted data to visualization format...")
        
        try:
            # Validate input
            self._validate_input(extracted_data)
            
            # Build visualization data
            viz_data = {
                'metadata': self._convert_metadata(extracted_data['metadata']),
                'layers': self._convert_layers(extracted_data['layers']),
                'connections': self._convert_connections(extracted_data['connections']),
                'architecture': self._generate_architecture_summary(extracted_data)
            }
            
            # Add visualization hints
            if self.add_visualization_hints:
                viz_data['visualization_hints'] = self._generate_visualization_hints(extracted_data)
            
            # Add topology analysis
            viz_data['topology'] = self._analyze_topology(extracted_data)
            
            logger.info("✓ Conversion completed successfully")
            
            return viz_data
            
        except Exception as e:
            logger.error(f"✗ Conversion failed: {str(e)}")
            raise
    
    def _validate_input(self, data: Dict[str, Any]) -> None:
        """Validate that input data has required structure."""
        required_keys = ['metadata', 'layers', 'connections']
        for key in required_keys:
            if key not in data:
                raise ValueError(f"Missing required key in extracted data: {key}")
        
        if not isinstance(data['layers'], list):
            raise ValueError("'layers' must be a list")
        
        if not isinstance(data['connections'], list):
            raise ValueError("'connections' must be a list")
    
    def _convert_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Convert and enhance metadata."""
        converted = {
            'model_name': metadata.get('model_name', 'UnknownModel'),
            'framework': metadata.get('framework', 'unknown'),
            'framework_version': metadata.get('framework_version', 'unknown'),
            'converter_version': '1.0.0',
            'total_layers': metadata.get('total_layers', 0),
            'total_parameters': metadata.get('total_parameters', 0),
            'trainable_parameters': metadata.get('trainable_parameters', metadata.get('total_parameters', 0)),
            'input_shape': metadata.get('input_shape', []),
            'output_shape': metadata.get('output_shape', []),
            'timestamp': datetime.now().isoformat(),
            'conversion_timestamp': datetime.now().isoformat()
        }
        
        return converted
    
    def _convert_layers(self, layers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert layers with enhanced information."""
        converted_layers = []
        
        for layer in layers:
            converted_layer = {
                'id': layer.get('id'),
                'name': layer.get('name'),
                'type': layer.get('type'),
                'index': layer.get('index'),
                'input_shape': layer.get('input_shape'),
                'output_shape': layer.get('output_shape'),
                'parameters': layer.get('parameters', {}),
                'activation': layer.get('activation'),
                'trainable': layer.get('trainable', True),
                'parameter_count': self._count_layer_parameters(layer)
            }
            
            # Add weight information if requested
            if self.include_weights and 'weights' in layer:
                converted_layer['weights'] = layer['weights']
            
            # Add visualization-specific attributes
            converted_layer['visualization'] = {
                'color': self._assign_layer_color(layer['type']),
                'opacity': 1.0,
                'size_hint': self._calculate_size_hint(layer),
                'display_name': self._format_display_name(layer)
            }
            
            converted_layers.append(converted_layer)
        
        return converted_layers
    
    def _convert_connections(self, connections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert connections with enhanced information."""
        converted_connections = []
        
        for conn in connections:
            converted_conn = {
                'id': f"conn_{len(converted_connections)}",
                'from_layer': conn.get('from_layer'),
                'to_layer': conn.get('to_layer'),
                'connection_type': conn.get('connection_type', 'sequential'),
                'data_flow': conn.get('data_flow', 'forward'),
                'visualization': {
                    'color': self._assign_connection_color(conn.get('connection_type')),
                    'width': self._calculate_connection_width(conn),
                    'style': self._get_connection_style(conn.get('connection_type'))
                }
            }
            
            converted_connections.append(converted_conn)
        
        return converted_connections
    
    def _generate_architecture_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate high-level architecture summary."""
        layers = data['layers']
        
        # Count layer types
        layer_type_counts = {}
        for layer in layers:
            layer_type = layer.get('type', 'Unknown')
            layer_type_counts[layer_type] = layer_type_counts.get(layer_type, 0) + 1
        
        # Identify stages/blocks (simplified)
        stages = self._identify_stages(layers)
        
        return {
            'layer_type_distribution': layer_type_counts,
            'stages': stages,
            'depth': len(layers),
            'has_skip_connections': self._has_skip_connections(data['connections']),
            'architecture_type': self._infer_architecture_type(data)
        }
    
    def _generate_visualization_hints(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate hints for optimal visualization."""
        layers = data['layers']
        
        return {
            'recommended_layout': self._recommend_layout(data),
            'color_scheme': 'gradient',
            'camera_position': self._suggest_camera_position(data),
            'layer_spacing': 2.0,
            'vertical_spacing': 1.5,
            'show_feature_maps': True,
            'show_connections': True,
            'interactive_layers': [layer['id'] for layer in layers if self._is_interesting_layer(layer)],
            'highlight_layers': self._identify_important_layers(layers)
        }
    
    def _analyze_topology(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze network topology."""
        layers = data['layers']
        connections = data['connections']
        
        # Build adjacency information
        adjacency = {}
        for conn in connections:
            from_id = conn['from_layer']
            to_id = conn['to_layer']
            
            if from_id not in adjacency:
                adjacency[from_id] = {'incoming': [], 'outgoing': []}
            if to_id not in adjacency:
                adjacency[to_id] = {'incoming': [], 'outgoing': []}
            
            adjacency[from_id]['outgoing'].append(to_id)
            adjacency[to_id]['incoming'].append(from_id)
        
        return {
            'is_sequential': len(connections) == len(layers) - 1 and all(
                conn['connection_type'] == 'sequential' for conn in connections
            ),
            'has_branches': any(len(adj['outgoing']) > 1 for adj in adjacency.values()),
            'has_merges': any(len(adj['incoming']) > 1 for adj in adjacency.values()),
            'max_branching_factor': max((len(adj['outgoing']) for adj in adjacency.values()), default=1),
            'max_merge_factor': max((len(adj['incoming']) for adj in adjacency.values()), default=1),
            'adjacency': adjacency
        }
    
    def _count_layer_parameters(self, layer: Dict[str, Any]) -> int:
        """Count parameters in a layer."""
        if 'weights' in layer:
            return layer['weights'].get('total_params', 0)
        return 0
    
    def _assign_layer_color(self, layer_type: str) -> str:
        """Assign color based on layer type."""
        color_map = {
            'Conv1d': '#4A90E2',
            'Conv2d': '#4A90E2',
            'Conv3d': '#4A90E2',
            'Linear': '#50C878',
            'Dense': '#50C878',
            'MaxPool': '#F5A623',
            'AvgPool': '#F5A623',
            'BatchNorm': '#BD10E0',
            'Dropout': '#B8E986',
            'ReLU': '#FF6B6B',
            'Sigmoid': '#FF6B6B',
            'Tanh': '#FF6B6B',
            'Flatten': '#8B8B8B',
            'Reshape': '#8B8B8B'
        }
        
        # Match partial names
        for key, color in color_map.items():
            if key.lower() in layer_type.lower():
                return color
        
        return '#CCCCCC'  # Default gray
    
    def _assign_connection_color(self, connection_type: str) -> str:
        """Assign color based on connection type."""
        color_map = {
            'sequential': '#4A90E2',
            'skip': '#F5A623',
            'merge': '#50C878',
            'branch': '#BD10E0'
        }
        return color_map.get(connection_type, '#CCCCCC')
    
    def _calculate_size_hint(self, layer: Dict[str, Any]) -> float:
        """Calculate relative size hint for visualization."""
        output_shape = layer.get('output_shape', [])
        if not output_shape or not isinstance(output_shape, list):
            return 1.0
        
        # Calculate based on output dimensions
        size = 1.0
        for dim in output_shape[1:]:  # Skip batch dimension
            if isinstance(dim, int) and dim > 0:
                size *= (dim ** 0.3)  # Cube root scaling
        
        return min(max(size / 10, 0.5), 3.0)  # Clamp between 0.5 and 3.0
    
    def _calculate_connection_width(self, connection: Dict[str, Any]) -> float:
        """Calculate connection line width."""
        connection_type = connection.get('connection_type', 'sequential')
        width_map = {
            'sequential': 1.0,
            'skip': 1.5,
            'merge': 2.0,
            'branch': 1.5
        }
        return width_map.get(connection_type, 1.0)
    
    def _get_connection_style(self, connection_type: str) -> str:
        """Get connection line style."""
        style_map = {
            'sequential': 'solid',
            'skip': 'dashed',
            'merge': 'solid',
            'branch': 'dotted'
        }
        return style_map.get(connection_type, 'solid')
    
    def _format_display_name(self, layer: Dict[str, Any]) -> str:
        """Format a user-friendly display name."""
        name = layer.get('name', '')
        layer_type = layer.get('type', '')
        
        # If name is generic, enhance it
        if name.startswith('layer_') or not name:
            return f"{layer_type}_{layer.get('index', 0)}"
        
        return name
    
    def _identify_stages(self, layers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify architectural stages/blocks."""
        stages = []
        current_stage = []
        current_type = None
        
        for layer in layers:
            layer_type = layer.get('type', '')
            
            # Start new stage on certain layer types
            if layer_type in ['Conv2d', 'Conv1d'] and current_type and current_type != layer_type:
                if current_stage:
                    stages.append({
                        'layers': [l['id'] for l in current_stage],
                        'type': current_type
                    })
                current_stage = [layer]
                current_type = layer_type
            else:
                current_stage.append(layer)
                if not current_type:
                    current_type = layer_type
        
        if current_stage:
            stages.append({
                'layers': [l['id'] for l in current_stage],
                'type': current_type
            })
        
        return stages
    
    def _has_skip_connections(self, connections: List[Dict[str, Any]]) -> bool:
        """Check if model has skip connections."""
        return any(conn.get('connection_type') in ['skip', 'merge'] for conn in connections)
    
    def _infer_architecture_type(self, data: Dict[str, Any]) -> str:
        """Infer the type of architecture."""
        model_name = data['metadata'].get('model_name', '').lower()
        
        if 'resnet' in model_name:
            return 'ResNet'
        elif 'vgg' in model_name:
            return 'VGG'
        elif 'inception' in model_name:
            return 'Inception'
        elif 'mobilenet' in model_name:
            return 'MobileNet'
        elif 'efficientnet' in model_name:
            return 'EfficientNet'
        elif self._has_skip_connections(data['connections']):
            return 'Residual'
        else:
            return 'Sequential'
    
    def _recommend_layout(self, data: Dict[str, Any]) -> str:
        """Recommend visualization layout."""
        topology = self._analyze_topology(data)
        
        if topology['is_sequential']:
            return 'linear'
        elif topology['has_branches'] or topology['has_merges']:
            return 'graph'
        else:
            return 'hierarchical'
    
    def _suggest_camera_position(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Suggest initial camera position."""
        num_layers = len(data['layers'])
        
        return {
            'x': num_layers * 1.5,
            'y': 5.0,
            'z': num_layers * 2.0,
            'target_x': num_layers * 0.5,
            'target_y': 0.0,
            'target_z': 0.0
        }
    
    def _is_interesting_layer(self, layer: Dict[str, Any]) -> bool:
        """Determine if layer is interesting for interaction."""
        interesting_types = ['Conv2d', 'Conv1d', 'Dense', 'Linear', 'Attention']
        layer_type = layer.get('type', '')
        return any(t in layer_type for t in interesting_types)
    
    def _identify_important_layers(self, layers: List[Dict[str, Any]]) -> List[str]:
        """Identify important layers to highlight."""
        important = []
        
        # First and last layers
        if layers:
            important.append(layers[0]['id'])
            important.append(layers[-1]['id'])
        
        # Layers with many parameters
        for layer in layers:
            param_count = self._count_layer_parameters(layer)
            if param_count > 1000000:  # More than 1M parameters
                important.append(layer['id'])
        
        return important
    
    def save_to_file(
        self, 
        viz_data: Dict[str, Any], 
        output_path: str,
        pretty_print: bool = True
    ) -> None:
        """
        Save visualization data to JSON file.
        
        Args:
            viz_data: Visualization data dictionary
            output_path: Output file path
            pretty_print: Format JSON for readability
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            if pretty_print and not self.compress_output:
                json.dump(viz_data, f, indent=2)
            else:
                json.dump(viz_data, f)
        
        file_size = output_path.stat().st_size / 1024  # KB
        logger.info(f"✓ Saved visualization data to {output_path} ({file_size:.2f} KB)")
    
    def load_from_file(self, input_path: str) -> Dict[str, Any]:
        """
        Load visualization data from JSON file.
        
        Args:
            input_path: Input file path
            
        Returns:
            Visualization data dictionary
        """
        with open(input_path, 'r') as f:
            data = json.load(f)
        
        logger.info(f"✓ Loaded visualization data from {input_path}")
        return data
