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

# Make Keras import optional (lazy load)
try:
    from extractors.keras_extractor import KerasExtractor
    KERAS_AVAILABLE = True
except ImportError:
    KERAS_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("TensorFlow/Keras not available. Only PyTorch models supported.")

from converters.universal_converter import UniversalConverter
from validators.schema_validator import SchemaValidator

# Import inference utilities
sys.path.insert(0, str(Path(__file__).parent.parent / 'core'))
sys.path.insert(0, str(Path(__file__).parent.parent / 'utils'))
from activation_extractor import ActivationExtractor
from image_preprocessor import ImagePreprocessor, decode_predictions
from explainability import GradCAMGenerator, SaliencyMapGenerator, serialize_heatmap

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

# Model cache for inference (avoid reloading)
model_cache = {}


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
            if not KERAS_AVAILABLE:
                return jsonify({'error': 'TensorFlow/Keras not installed. Install with: pip install tensorflow'}), 501
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


# Predefined torchvision models
AVAILABLE_MODELS = {
    'vgg16': {'display_name': 'VGG16', 'input_shape': (1, 3, 224, 224)},
    'vgg19': {'display_name': 'VGG19', 'input_shape': (1, 3, 224, 224)},
    'resnet18': {'display_name': 'ResNet18', 'input_shape': (1, 3, 224, 224)},
    'resnet34': {'display_name': 'ResNet34', 'input_shape': (1, 3, 224, 224)},
    'resnet50': {'display_name': 'ResNet50', 'input_shape': (1, 3, 224, 224)},
    'resnet101': {'display_name': 'ResNet101', 'input_shape': (1, 3, 224, 224)},
    'densenet121': {'display_name': 'DenseNet121', 'input_shape': (1, 3, 224, 224)},
    'densenet161': {'display_name': 'DenseNet161', 'input_shape': (1, 3, 224, 224)},
    'mobilenet_v2': {'display_name': 'MobileNetV2', 'input_shape': (1, 3, 224, 224)},
    'mobilenet_v3_small': {'display_name': 'MobileNetV3-Small', 'input_shape': (1, 3, 224, 224)},
    'mobilenet_v3_large': {'display_name': 'MobileNetV3-Large', 'input_shape': (1, 3, 224, 224)},
    'squeezenet1_0': {'display_name': 'SqueezeNet1_0', 'input_shape': (1, 3, 224, 224)},
    'squeezenet1_1': {'display_name': 'SqueezeNet1_1', 'input_shape': (1, 3, 224, 224)},
    'alexnet': {'display_name': 'AlexNet', 'input_shape': (1, 3, 224, 224)},
    'inception_v3': {'display_name': 'InceptionV3', 'input_shape': (1, 3, 299, 299)},
    'googlenet': {'display_name': 'GoogLeNet', 'input_shape': (1, 3, 224, 224)},
    'shufflenet_v2_x1_0': {'display_name': 'ShuffleNetV2', 'input_shape': (1, 3, 224, 224)},
    'efficientnet_b0': {'display_name': 'EfficientNet-B0', 'input_shape': (1, 3, 224, 224)},
    'efficientnet_b1': {'display_name': 'EfficientNet-B1', 'input_shape': (1, 3, 240, 240)},
    'regnet_y_400mf': {'display_name': 'RegNet-Y-400MF', 'input_shape': (1, 3, 224, 224)},
}


@app.route('/api/models/list', methods=['GET'])
def list_models():
    """List all predefined torchvision models with their visualization JSON status."""
    try:
        output_folder = app.config['OUTPUT_FOLDER']
        
        available_models = []
        for model_key, model_info in AVAILABLE_MODELS.items():
            # Check if visualization JSON exists
            viz_path = output_folder / f"{model_key}_visualization.json"
            has_visualization = viz_path.exists()
            
            model_data = {
                'name': model_key,
                'display_name': model_info['display_name'],
                'has_visualization': has_visualization,
                'visualization_file': f"{model_key}_visualization.json" if has_visualization else None,
                'framework': 'pytorch',
                'input_shape': model_info['input_shape']
            }
            
            available_models.append(model_data)
        
        logger.info(f"Listed {len(available_models)} models")
        
        return jsonify({
            'success': True,
            'count': len(available_models),
            'models': available_models
        })
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/models/generate', methods=['POST'])
def generate_model_visualization():
    """
    Generate visualization JSON for a model using universal converter.
    The converter downloads from torchvision internally if needed.
    
    JSON body:
        - model_name: name of the model (e.g., 'vgg16', 'resnet50')
    """
    try:
        data = request.get_json()
        model_name = data.get('model_name')
        
        if not model_name:
            return jsonify({'error': 'model_name is required'}), 400
        
        # Check if this is a predefined model
        if model_name not in AVAILABLE_MODELS:
            return jsonify({'error': f'Model {model_name} not in predefined list'}), 400
        
        model_info = AVAILABLE_MODELS[model_name]
        input_shape = model_info['input_shape']
        
        logger.info(f"Generating visualization for {model_name} using universal converter...")
        
        # Import torchvision and get model
        import torch
        import torchvision.models as models
        
        # Get the model function from torchvision
        model_fn = getattr(models, model_name)
        
        # Create model WITHOUT pretrained weights (we only need architecture for visualization)
        logger.info(f"Creating {model_name} architecture (no weight download needed)...")
        model = model_fn(weights=None)  # No download! Just architecture
        model.eval()
        
        # Extract model structure using PyTorchExtractor
        extractor = PyTorchExtractor(
            model,
            input_shape=input_shape,
            model_name=model_name,
            extract_weights=False
        )
        
        extracted_data = extractor.extract()
        
        # Convert to visualization format using UniversalConverter
        converter = UniversalConverter(include_weights=False)
        viz_data = converter.convert(extracted_data)
        
        # Save to output folder
        output_file = app.config['OUTPUT_FOLDER'] / f"{model_name}_visualization.json"
        converter.save_to_file(viz_data, str(output_file))
        
        logger.info(f"✓ Generated visualization: {output_file.name}")
        
        return jsonify({
            'success': True,
            'model_name': model_name,
            'visualization_file': output_file.name,
            'message': 'Visualization generated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error generating model visualization: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


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


@app.route('/api/inference', methods=['POST'])
def run_inference():
    """
    Run inference on an uploaded image.
    
    Form parameters:
        - image: Image file (required)
        - model_path: Path to model file in output folder (required)
        - framework: 'pytorch' or 'keras' (required)
        - input_shape: Input shape as comma-separated values (optional)
        - include_activations: Include layer activations (optional, default: true)
        - max_features: Max feature maps per layer (optional, default: 64)
        - layers: Comma-separated layer names to extract (optional, default: all)
    """
    try:
        # Check if image is in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get parameters
        model_path = request.form.get('model_path')
        if not model_path:
            return jsonify({'error': 'model_path is required'}), 400
        
        framework = request.form.get('framework', '').lower()
        if framework not in ['pytorch', 'keras']:
            return jsonify({'error': 'framework must be pytorch or keras'}), 400
        
        if framework == 'keras' and not KERAS_AVAILABLE:
            return jsonify({'error': 'TensorFlow/Keras not installed. Only PyTorch is available.'}), 400
        
        input_shape_str = request.form.get('input_shape', '1,3,224,224' if framework == 'pytorch' else '1,224,224,3')
        input_shape = tuple(map(int, input_shape_str.split(',')))
        
        include_activations = request.form.get('include_activations', 'true').lower() == 'true'
        max_features = int(request.form.get('max_features', 64))
        
        layers_str = request.form.get('layers', '')
        selected_layers = [l.strip() for l in layers_str.split(',')] if layers_str else None
        
        logger.info(f"Running inference: framework={framework}, model={model_path}")
        
        # Load model (with caching)
        model = _load_model_for_inference(model_path, framework)
        
        # Preprocess image
        preprocessor = ImagePreprocessor(framework=framework, normalization='imagenet')
        image_tensor = preprocessor.preprocess(image_file.stream, input_shape)
        
        # Run inference
        if framework == 'pytorch':
            predictions, activations = _run_pytorch_inference(
                model, image_tensor, include_activations, selected_layers, max_features
            )
        else:
            predictions, activations = _run_keras_inference(
                model, image_tensor, include_activations, selected_layers, max_features
            )
        
        # Decode predictions
        top_predictions = decode_predictions(predictions, top_k=5)
        
        # Build response
        response = {
            'success': True,
            'predictions': top_predictions,
            'input_shape': list(input_shape),
            'framework': framework
        }
        
        if include_activations:
            response['activations'] = activations
            response['num_activations'] = len(activations)
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


def _load_model_for_inference(model_path, framework):
    """Load model with caching."""
    cache_key = f"{framework}_{model_path}"
    
    if cache_key in model_cache:
        logger.info(f"Using cached model: {cache_key}")
        return model_cache[cache_key]
    
    logger.info(f"Loading model: {model_path}")
    
    # Check if path is relative (in output folder) or absolute
    if not Path(model_path).is_absolute():
        full_path = app.config['UPLOAD_FOLDER'] / model_path
    else:
        full_path = Path(model_path)
    
    if not full_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    if framework == 'pytorch':
        import torch
        model = torch.load(full_path, map_location='cpu', weights_only=False)
        model.eval()  # Set to evaluation mode
    else:
        from tensorflow import keras
        model = keras.models.load_model(full_path)
    
    # Cache the model
    model_cache[cache_key] = model
    logger.info(f"Model loaded and cached: {cache_key}")
    
    return model


def _run_pytorch_inference(model, image_tensor, include_activations, selected_layers, max_features):
    """Run PyTorch inference."""
    import torch
    
    # Ensure tensor
    if not isinstance(image_tensor, torch.Tensor):
        image_tensor = torch.from_numpy(image_tensor).float()
    
    # Setup activation extractor
    activations = {}
    if include_activations:
        extractor = ActivationExtractor(model, framework='pytorch')
        extractor.register_hooks(layer_names=selected_layers)
    
    # Run inference
    with torch.no_grad():
        output = model(image_tensor)
    
    # Get predictions
    if isinstance(output, torch.Tensor):
        predictions = torch.softmax(output, dim=1).cpu().numpy()
    else:
        predictions = output.cpu().numpy()
    
    # Get activations
    if include_activations:
        activations = extractor.get_serialized_activations(
            max_features=max_features,
            selected_layers=selected_layers
        )
        extractor.clear_hooks()
    
    return predictions, activations


def _run_keras_inference(model, image_array, include_activations, selected_layers, max_features):
    """Run Keras inference."""
    import tensorflow as tf
    
    # Run inference
    predictions = model.predict(image_array, verbose=0)
    
    # Get activations
    activations = {}
    if include_activations:
        extractor = ActivationExtractor(model, framework='keras')
        extractor.register_hooks(layer_names=selected_layers)
        extractor.extract_activations(image_array)
        
        activations = extractor.get_serialized_activations(
            max_features=max_features,
            selected_layers=selected_layers
        )
    
    return predictions, activations


@app.route('/api/explainability', methods=['POST'])
def explainability():
    """
    Generate explainability heatmap (Grad-CAM or Saliency Map)
    
    Expected form data:
    - image: Image file
    - model_path: Path to model file (relative to UPLOAD_FOLDER)
    - framework: 'pytorch' or 'keras'
    - method: 'gradcam' or 'saliency'
    - target_class: Optional int (uses top prediction if not provided)
    - target_layer: Optional string (auto-detects if not provided)
    """
    try:
        # Validate request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
            
        if 'model_path' not in request.form:
            return jsonify({'error': 'No model_path provided'}), 400
            
        if 'framework' not in request.form:
            return jsonify({'error': 'No framework specified'}), 400
            
        method = request.form.get('method', 'gradcam').lower()
        if method not in ['gradcam', 'saliency']:
            return jsonify({'error': f'Invalid method: {method}. Must be gradcam or saliency'}), 400
           
        framework = request.form['framework'].lower()
        model_path = request.form['model_path']
        image_file = request.files['image']
        
        logger.info(f"Generating {method} for {framework} model: {model_path}")
        
        # Construct full model path
        full_model_path = os.path.join(app.config['UPLOAD_FOLDER'], model_path)
        if not os.path.exists(full_model_path):
            return jsonify({'error': f'Model file not found: {model_path}'}), 404
            
        # Load model
        if framework == 'pytorch':
            import torch
            # PyTorch 2.6+ requires weights_only=False for models with class definitions
            model = torch.load(full_model_path, map_location='cpu', weights_only=False)
            model.eval()
        else:
            return jsonify({'error': f'Framework {framework} not yet supported for explainability'}), 400
            
        # Preprocess image
        preprocessor = ImagePreprocessor()
        input_shape = request.form.get('input_shape', '(224, 224)')
        try:
            input_shape = eval(input_shape)
        except:
            input_shape = (224, 224)
        
        # Add batch and channels to shape for preprocessing
        if len(input_shape) == 2:
            input_shape = (1, 3, input_shape[0], input_shape[1])
            
        # Load and get original image for heatmap sizing
        original_image = preprocessor.load_image(image_file)
        image_file.seek(0)  # Reset file pointer
        
        # Preprocess for PyTorch (returns tensor)
        processed_image = preprocessor.preprocess_pytorch(image_file, input_shape)
        
        # Run inference to get predictions
        with torch.no_grad():
            output = model(processed_image)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            top5_prob, top5_indices = torch.topk(probabilities, 5)
            
        # Get target class
        target_class = request.form.get('target_class')
        if target_class is None:
            target_class = top5_indices[0].item()  # Use top prediction
        else:
            target_class = int(target_class)
            
        # Get predictions for context
        predictions = []
        for prob, idx in zip(top5_prob, top5_indices):
            predictions.append({
                'class_index': idx.item(),
                'confidence': float(prob.item())
            })
            
        # Generate explainability heat map
        if method == 'gradcam':
            generator = GradCAMGenerator(model, framework=framework)
            target_layer_name = request.form.get('target_layer')
            
            # Get target layer object if name provided
            target_layer = None
            if target_layer_name:
                # Try to find layer by name
                for name, module in model.named_modules():
                    if name == target_layer_name:
                        target_layer = module
                        break
                        
            heatmap = generator.generate(
                processed_image,
                target_class=target_class,
                target_layer=target_layer
            )
            
            # Get actual target layer name
            if target_layer is None:
                target_layer = generator._find_last_conv_layer_pytorch()
                # Find name of this layer
                target_layer_name = None
                for name, module in model.named_modules():
                    if module is target_layer:
                        target_layer_name = name
                        break
                        
        elif method == 'saliency':
            generator = SaliencyMapGenerator(model, framework=framework)
            heatmap = generator.generate(
                processed_image,
                target_class=target_class
            )
            target_layer_name = None  # Not applicable for saliency
            
        # Serialize heatmap (original_image is PIL Image)
        original_w, original_h = original_image.size  # PIL uses (width, height)
        heatmap_data = serialize_heatmap(heatmap, (original_h, original_w))
        
        # Build response
        response = {
            'success': True,
            'method': method,
            'framework': framework,
            'heatmap': heatmap_data,
            'target_class': target_class,
            'target_layer': target_layer_name,
            'predictions': predictions
        }
        
        logger.info(f"Generated {method} heatmap for class {target_class}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error generating explainability: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


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
        debug=False,  # Disable debug mode to prevent auto-reload issues
        use_reloader=False  # Explicitly disable auto-reloader
    )
