"""
Schema Validator - Validate visualization JSON against schema

Ensures that generated visualization files conform to the expected format.
"""

import json
import jsonschema
from jsonschema import validate, ValidationError
from typing import Dict, List, Any, Tuple
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class SchemaValidator:
    """
    Validates visualization JSON files against defined schemas.
    """
    
    # Define the schema for visualization JSON
    VISUALIZATION_SCHEMA = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "WhyteBox Visualization Format",
        "type": "object",
        "required": ["metadata", "layers", "connections"],
        "properties": {
            "metadata": {
                "type": "object",
                "required": ["model_name", "framework", "total_layers", "total_parameters"],
                "properties": {
                    "model_name": {"type": "string"},
                    "framework": {"type": "string"},
                    "framework_version": {"type": "string"},
                    "total_layers": {"type": "integer", "minimum": 0},
                    "total_parameters": {"type": "integer", "minimum": 0},
                    "input_shape": {"type": "array"},
                    "output_shape": {"type": "array"},
                    "timestamp": {"type": "string"}
                }
            },
            "layers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["id", "name", "type", "index"],
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "type": {"type": "string"},
                        "index": {"type": "integer", "minimum": 0},
                        "input_shape": {"type": ["array", "null"]},
                        "output_shape": {"type": ["array", "null"]},
                        "parameters": {"type": "object"},
                        "activation": {"type": ["string", "null"]},
                        "trainable": {"type": "boolean"}
                    }
                }
            },
            "connections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["from_layer", "to_layer"],
                    "properties": {
                        "id": {"type": "string"},
                        "from_layer": {"type": "string"},
                        "to_layer": {"type": "string"},
                        "connection_type": {"type": "string"},
                        "data_flow": {"type": "string"}
                    }
                }
            },
            "architecture": {"type": "object"},
            "topology": {"type": "object"},
            "visualization_hints": {"type": "object"}
        }
    }
    
    def __init__(self, custom_schema: Dict = None):
        """
        Initialize validator.
        
        Args:
            custom_schema: Optional custom JSON schema to use instead of default
        """
        self.schema = custom_schema or self.VISUALIZATION_SCHEMA
        logger.info("Initialized SchemaValidator")
    
    def validate(self, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate visualization data against schema.
        
        Args:
            data: Visualization data dictionary
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        try:
            validate(instance=data, schema=self.schema)
            logger.info("✓ Schema validation passed")
            return True, []
            
        except ValidationError as e:
            error_msg = f"Schema validation error: {e.message}"
            errors.append(error_msg)
            logger.error(f"✗ {error_msg}")
            return False, errors
            
        except Exception as e:
            error_msg = f"Unexpected validation error: {str(e)}"
            errors.append(error_msg)
            logger.error(f"✗ {error_msg}")
            return False, errors
    
    def validate_file(self, file_path: str) -> Tuple[bool, List[str]]:
        """
        Validate a JSON file.
        
        Args:
            file_path: Path to JSON file
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            return self.validate(data)
            
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON file: {str(e)}"
            logger.error(f"✗ {error_msg}")
            return False, [error_msg]
            
        except FileNotFoundError:
            error_msg = f"File not found: {file_path}"
            logger.error(f"✗ {error_msg}")
            return False, [error_msg]
            
        except Exception as e:
            error_msg = f"Error reading file: {str(e)}"
            logger.error(f"✗ {error_msg}")
            return False, [error_msg]
    
    def validate_layers(self, layers: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
        """
        Validate layer data specifically.
        
        Args:
            layers: List of layer dictionaries
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check for duplicate IDs
        layer_ids = [layer.get('id') for layer in layers]
        if len(layer_ids) != len(set(layer_ids)):
            errors.append("Duplicate layer IDs found")
        
        # Check for required fields
        for i, layer in enumerate(layers):
            if not layer.get('id'):
                errors.append(f"Layer {i} missing required 'id' field")
            if not layer.get('name'):
                errors.append(f"Layer {i} missing required 'name' field")
            if not layer.get('type'):
                errors.append(f"Layer {i} missing required 'type' field")
        
        is_valid = len(errors) == 0
        
        if is_valid:
            logger.info(f"✓ Layer validation passed ({len(layers)} layers)")
        else:
            logger.error(f"✗ Layer validation failed with {len(errors)} errors")
        
        return is_valid, errors
    
    def validate_connections(
        self, 
        connections: List[Dict[str, Any]], 
        valid_layer_ids: List[str]
    ) -> Tuple[bool, List[str]]:
        """
        Validate connection data.
        
        Args:
            connections: List of connection dictionaries
            valid_layer_ids: List of valid layer IDs
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        valid_ids_set = set(valid_layer_ids)
        
        for i, conn in enumerate(connections):
            from_layer = conn.get('from_layer')
            to_layer = conn.get('to_layer')
            
            if not from_layer:
                errors.append(f"Connection {i} missing 'from_layer'")
            elif from_layer not in valid_ids_set:
                errors.append(f"Connection {i} references invalid from_layer: {from_layer}")
            
            if not to_layer:
                errors.append(f"Connection {i} missing 'to_layer'")
            elif to_layer not in valid_ids_set:
                errors.append(f"Connection {i} references invalid to_layer: {to_layer}")
        
        is_valid = len(errors) == 0
        
        if is_valid:
            logger.info(f"✓ Connection validation passed ({len(connections)} connections)")
        else:
            logger.error(f"✗ Connection validation failed with {len(errors)} errors")
        
        return is_valid, errors
    
    def get_schema(self) -> Dict[str, Any]:
        """
        Get the current validation schema.
        
        Returns:
            JSON schema dictionary
        """
        return self.schema
    
    def save_schema(self, output_path: str) -> None:
        """
        Save the schema to a JSON file.
        
        Args:
            output_path: Path to save schema
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(self.schema, f, indent=2)
        
        logger.info(f"✓ Schema saved to {output_path}")


# Utility function for quick validation
def validate_visualization_file(file_path: str) -> bool:
    """
    Quick utility to validate a visualization JSON file.
    
    Args:
        file_path: Path to JSON file
        
    Returns:
        True if valid, False otherwise
    """
    validator = SchemaValidator()
    is_valid, errors = validator.validate_file(file_path)
    
    if not is_valid:
        for error in errors:
            print(f"Error: {error}")
    
    return is_valid
