"""
Flask API for Neural Network Model Conversion

REST API endpoints for uploading models and converting them to visualization format.
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sys
import logging
from pathlib import Path
from datetime import datetime
import traceback

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from extractors.pytorch_extractor import PyTorchExtractor
from extractors.keras_extractor import KerasExtractor
from converters.universal_converter import UniversalConverter
from validators.schema_validator import SchemaValidator

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Configuration
app.config['UPLOAD_FOLDER'] = Path(__file__).parent.parent / 'models'
app.config['OUTPUT_FOLDER'] = Path(__file__).parent.parent / 'output'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size
app.config['ALLOWED_EXTENSIONS'] = {'pth', 'pt', 'h5', 'keras', 'onnx', 'pb'}

# Create folders if they don't exist
app.config['UPLOAD_FOLDER'].mkdir(parents=True, exist_ok=True)
app.config['OUTPUT_FOLDER'].mkdir(parents=True, exist_ok=True)


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/')
def index():
    """API root endpoint."""
    return jsonify({
        'name': 'WhyteBox Backend API',
        'version': '1.0.0',
        'description': 'Neural network model conversion API',
        'endpoints': {
            'POST /api/convert': 'Convert a model to visualization format',
            'POST /api/convert/url': 'Convert a model from URL',
            'GET /api/models': 'List available converted models',
            'GET /api/download/<filename>': 'Download a converted model',
            'POST /api/validate': 'Validate a visualization JSON file',
            'GET /api/health': 'Health check'
        }
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'whytebox-backend'
    })


@app.route('/api/convert', methods=['POST'])
def convert_model():
    """
    Convert an uploaded model to visualization format.
    
    Form parameters:
        - model: Model file (required)
        - framework: 'pytorch', 'keras', or 'onnx' (required)
        - input_shape: Input shape as comma-separated values (optional)
        - model_name: Custom model name (optional)
        - extract_weights: Include weights in output (optional, default: false)
    """
    try:
        # Check if file is in request
        if 'model' not in request.files:
            return jsonify({'error': 'No model file provided'}), 400
        
        file = request.files['model']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Get parameters
        framework = request.form.get('framework', '').lower()
        if framework not in ['pytorch', 'keras', 'onnx']:
            return jsonify({'error': 'Invalid framework. Must be: pytorch, keras, or onnx'}), 400
        
        input_shape_str = request.form.get('input_shape', '1,3,224,224')
        input_shape = tuple(map(int, input_shape_str.split(',')))
        
        model_name = request.form.get('model_name', file.filename.rsplit('.', 1)[0])
        extract_weights = request.form.get('extract_weights', 'false').lower() == 'true'
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        saved_filename = f"{timestamp}_{filename}"
        file_path = app.config['UPLOAD_FOLDER'] / saved_filename
        file.save(file_path)
        
        logger.info(f"Received model: {filename} (framework: {framework})")
        
        # Convert based on framework
        if framework == 'pytorch':
            result = convert_pytorch_model(file_path, input_shape, model_name, extract_weights)
        elif framework == 'keras':
            result = convert_keras_model(file_path, model_name, extract_weights)
        elif framework == 'onnx':
            return jsonify({'error': 'ONNX support coming soon'}), 501
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Conversion error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


def convert_pytorch_model(file_path, input_shape, model_name, extract_weights):
    """Convert PyTorch model."""
    import torch
    
    # Load model
    model = torch.load(file_path, map_location='cpu')
    
    # Extract
    extractor = PyTorchExtractor(
        model=model,
        input_shape=input_shape,
        model_name=model_name,
        extract_weights=extract_weights
    )
    
    extracted_data = extractor.extract()
    
    # Convert
    converter = UniversalConverter(include_weights=extract_weights)
    viz_data = converter.convert(extracted_data)
    
    # Validate
    validator = SchemaValidator()
    is_valid, errors = validator.validate(viz_data)
    
    if not is_valid:
        raise ValueError(f"Validation failed: {errors}")
    
    # Save
    output_filename = f"{model_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_path = app.config['OUTPUT_FOLDER'] / output_filename
    converter.save_to_file(viz_data, str(output_path))
    
    return {
        'status': 'success',
        'message': 'Model converted successfully',
        'output_file': output_filename,
        'download_url': f'/api/download/{output_filename}',
        'metadata': viz_data['metadata'],
        'stats': {
            'total_layers': len(viz_data['layers']),
            'total_connections': len(viz_data['connections']),
            'architecture_type': viz_data['architecture']['architecture_type']
        }
    }


def convert_keras_model(file_path, model_name, extract_weights):
    """Convert Keras model."""
    from tensorflow import keras
    
    # Load model
    model = keras.models.load_model(file_path)
    
    # Extract
    extractor = KerasExtractor(
        model=model,
        model_name=model_name,
        extract_weights=extract_weights
    )
    
    extracted_data = extractor.extract()
    
    # Convert
    converter = UniversalConverter(include_weights=extract_weights)
    viz_data = converter.convert(extracted_data)
    
    # Validate
    validator = SchemaValidator()
    is_valid, errors = validator.validate(viz_data)
    
    if not is_valid:
        raise ValueError(f"Validation failed: {errors}")
    
    # Save
    output_filename = f"{model_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_path = app.config['OUTPUT_FOLDER'] / output_filename
    converter.save_to_file(viz_data, str(output_path))
    
    return {
        'status': 'success',
        'message': 'Model converted successfully',
        'output_file': output_filename,
        'download_url': f'/api/download/{output_filename}',
        'metadata': viz_data['metadata'],
        'stats': {
            'total_layers': len(viz_data['layers']),
            'total_connections': len(viz_data['connections']),
            'architecture_type': viz_data['architecture']['architecture_type']
        }
    }


@app.route('/api/models', methods=['GET'])
def list_models():
    """List all converted models in output folder."""
    try:
        files = []
        for file_path in app.config['OUTPUT_FOLDER'].glob('*.json'):
            stats = file_path.stat()
            files.append({
                'filename': file_path.name,
                'size_kb': round(stats.st_size / 1024, 2),
                'created': datetime.fromtimestamp(stats.st_ctime).isoformat(),
                'download_url': f'/api/download/{file_path.name}'
            })
        
        files.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify({
            'status': 'success',
            'count': len(files),
            'files': files
        })
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download a converted visualization file."""
    try:
        file_path = app.config['OUTPUT_FOLDER'] / filename
        
        if not file_path.exists():
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(
            file_path,
            mimetype='application/json',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/validate', methods=['POST'])
def validate_file():
    """Validate a visualization JSON file."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save temporarily
        import json
        data = json.load(file.stream)
        
        # Validate
        validator = SchemaValidator()
        is_valid, errors = validator.validate(data)
        
        return jsonify({
            'status': 'success' if is_valid else 'invalid',
            'valid': is_valid,
            'errors': errors
        })
        
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error."""
    return jsonify({'error': 'File too large. Maximum size is 500MB'}), 413


@app.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    logger.info("="*70)
    logger.info("WhyteBox Backend API Server")
    logger.info("="*70)
    logger.info(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    logger.info(f"Output folder: {app.config['OUTPUT_FOLDER']}")
    logger.info("Starting server on http://localhost:5000")
    logger.info("="*70)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
