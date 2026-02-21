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

# Try to import torch at module level (available check)
try:
    import torch
    import torchvision.models as tv_models
    PYTORCH_AVAILABLE = True
except ImportError:
    PYTORCH_AVAILABLE = False

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


# Predefined torchvision CNN models
AVAILABLE_MODELS = {
    'vgg16': {'display_name': 'VGG16', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'vgg19': {'display_name': 'VGG19', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'resnet18': {'display_name': 'ResNet18', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'resnet34': {'display_name': 'ResNet34', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'resnet50': {'display_name': 'ResNet50', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'resnet101': {'display_name': 'ResNet101', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'densenet121': {'display_name': 'DenseNet121', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'densenet161': {'display_name': 'DenseNet161', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'mobilenet_v2': {'display_name': 'MobileNetV2', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'mobilenet_v3_small': {'display_name': 'MobileNetV3-Small', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'mobilenet_v3_large': {'display_name': 'MobileNetV3-Large', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'squeezenet1_0': {'display_name': 'SqueezeNet1_0', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'squeezenet1_1': {'display_name': 'SqueezeNet1_1', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'alexnet': {'display_name': 'AlexNet', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'inception_v3': {'display_name': 'InceptionV3', 'input_shape': (1, 3, 299, 299), 'framework': 'pytorch'},
    'googlenet': {'display_name': 'GoogLeNet', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'shufflenet_v2_x1_0': {'display_name': 'ShuffleNetV2', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'efficientnet_b0': {'display_name': 'EfficientNet-B0', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
    'efficientnet_b1': {'display_name': 'EfficientNet-B1', 'input_shape': (1, 3, 240, 240), 'framework': 'pytorch'},
    'regnet_y_400mf': {'display_name': 'RegNet-Y-400MF', 'input_shape': (1, 3, 224, 224), 'framework': 'pytorch'},
}

# HuggingFace Transformer models (architecture visualization only, no image inference)
# 'hf_class' is the importable base model class name from transformers
AVAILABLE_TRANSFORMER_MODELS = {
    'bert-base-uncased': {
        'display_name': 'BERT-Base',
        'hf_name': 'bert-base-uncased',
        'hf_class': 'BertModel',
        'arch_type': 'encoder_only',
        'framework': 'transformer'
    },
    'roberta-base': {
        'display_name': 'RoBERTa-Base',
        'hf_name': 'roberta-base',
        'hf_class': 'RobertaModel',
        'arch_type': 'encoder_only',
        'framework': 'transformer'
    },
    'distilbert-base-uncased': {
        'display_name': 'DistilBERT',
        'hf_name': 'distilbert-base-uncased',
        'hf_class': 'DistilBertModel',
        'arch_type': 'encoder_only',
        'framework': 'transformer'
    },
    'gpt2': {
        'display_name': 'GPT-2',
        'hf_name': 'gpt2',
        'hf_class': 'GPT2Model',
        'arch_type': 'decoder_only',
        'framework': 'transformer'
    },
    'distilgpt2': {
        'display_name': 'DistilGPT-2',
        'hf_name': 'distilgpt2',
        'hf_class': 'GPT2Model',
        'arch_type': 'decoder_only',
        'framework': 'transformer'
    },
    't5-small': {
        'display_name': 'T5-Small',
        'hf_name': 't5-small',
        'hf_class': 'T5Model',
        'arch_type': 'encoder_decoder',
        'framework': 'transformer'
    },
}


@app.route('/api/models/list', methods=['GET'])
def list_models():
    """List all predefined CNN + Transformer models with their visualization JSON status."""
    try:
        output_folder = app.config['OUTPUT_FOLDER']
        
        available_models = []

        # ---- CNN models (torchvision) ----
        for model_key, model_info in AVAILABLE_MODELS.items():
            viz_path = output_folder / f"{model_key}_visualization.json"
            has_visualization = viz_path.exists()
            
            available_models.append({
                'name': model_key,
                'display_name': model_info['display_name'],
                'has_visualization': has_visualization,
                'visualization_file': f"{model_key}_visualization.json" if has_visualization else None,
                'framework': 'pytorch',
                'model_type': 'cnn',
                'input_shape': list(model_info['input_shape']),
                'is_downloaded': True,
                'is_ready': has_visualization,
                'model_size_mb': 0,
                'notes': 'CNN model. Supports live inference + Grad-CAM.'
            })

        # ---- Transformer models (HuggingFace) ----
        for model_key, model_info in AVAILABLE_TRANSFORMER_MODELS.items():
            viz_path = output_folder / f"{model_key.replace('/', '_')}_visualization.json"
            has_visualization = viz_path.exists()

            available_models.append({
                'name': model_key,
                'display_name': f"🤖 {model_info['display_name']}",
                'has_visualization': has_visualization,
                'visualization_file': f"{model_key.replace('/', '_')}_visualization.json" if has_visualization else None,
                'framework': 'transformer',
                'model_type': 'transformer',
                'arch_type': model_info['arch_type'],
                'input_shape': [1, 128],   # [batch, seq_len]
                'is_downloaded': True,
                'is_ready': has_visualization,
                'model_size_mb': 0,
                'supports_inference': False,
                'notes': f"Transformer ({model_info['arch_type']}). Architecture viz only; no image inference."
            })
        
        logger.info(f"Listed {len(available_models)} models ({len(AVAILABLE_MODELS)} CNN + {len(AVAILABLE_TRANSFORMER_MODELS)} Transformer)")
        
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
    Generate visualization JSON for a CNN or Transformer model.
    
    JSON body:
        - model_name: name of the model (e.g., 'vgg16', 'bert-base-uncased')
        - framework: 'pytorch' or 'transformer' (optional, auto-detected)
    """
    try:
        data = request.get_json()
        model_name = data.get('model_name')
        requested_framework = data.get('framework', '').lower()
        
        if not model_name:
            return jsonify({'error': 'model_name is required'}), 400
        
        # Auto-detect framework from model name if not provided
        if model_name in AVAILABLE_TRANSFORMER_MODELS:
            framework = 'transformer'
        elif model_name in AVAILABLE_MODELS:
            framework = 'pytorch'
        else:
            return jsonify({'error': f'Model {model_name} not in predefined list'}), 400

        if framework == 'transformer':
            # ---- HuggingFace Transformer visualization ----
            try:
                from transformers import AutoModel
            except ImportError:
                return jsonify({'error': 'transformers package not installed. Run: pip install transformers'}), 501
            
            from extractors.transformer_extractor import TransformerExtractor
            import json
            
            model_info = AVAILABLE_TRANSFORMER_MODELS[model_name]
            hf_name = model_info['hf_name']
            hf_class_name = model_info['hf_class']
            
            logger.info(f"Loading {hf_class_name} from HuggingFace: {hf_name}...")

            # Import the exact base model class directly — avoids Auto class resolution
            # issues (e.g. DistilBertModel not found when Auto resolves to task-specific class)
            import importlib
            transformers_mod = importlib.import_module('transformers')
            model_cls = getattr(transformers_mod, hf_class_name, None)
            if model_cls is None:
                return jsonify({'error': f'transformers class {hf_class_name} not found. '
                                         'Try: pip install --upgrade transformers'}), 500

            hf_model = model_cls.from_pretrained(hf_name)
            hf_model.eval()
            
            extractor = TransformerExtractor(
                model=hf_model,
                model_name=model_info['display_name'],
                extract_weights=False
            )
            
            extracted_data = extractor.extract()
            
            # Save directly (TransformerExtractor returns the viz-ready dict)
            safe_name = model_name.replace('/', '_')
            output_file = app.config['OUTPUT_FOLDER'] / f"{safe_name}_visualization.json"
            with open(output_file, 'w') as f:
                json.dump(extracted_data, f)
            
            logger.info(f"✓ Generated transformer visualization: {output_file.name}")
            
            return jsonify({
                'success': True,
                'model_name': model_name,
                'visualization_file': output_file.name,
                'message': 'Transformer visualization generated successfully'
            })

        else:
            # ---- CNN / torchvision visualization ----
            model_info = AVAILABLE_MODELS[model_name]
            input_shape = model_info['input_shape']
            
            logger.info(f"Generating CNN visualization for {model_name}...")
            
            model_fn = getattr(tv_models, model_name)
            model = model_fn(weights=None)
            model.eval()
            
            extractor = PyTorchExtractor(
                model,
                input_shape=input_shape,
                model_name=model_name,
                extract_weights=False
            )
            
            extracted_data = extractor.extract()
            
            converter = UniversalConverter(include_weights=False)
            viz_data = converter.convert(extracted_data)
            
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


# Torchvision model name -> constructor mapping (for inference by model name)
TORCHVISION_MODEL_MAP = {
    'vgg16': lambda: tv_models.vgg16(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'vgg19': lambda: tv_models.vgg19(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'resnet18': lambda: tv_models.resnet18(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'resnet34': lambda: tv_models.resnet34(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'resnet50': lambda: tv_models.resnet50(weights='IMAGENET1K_V2') if PYTORCH_AVAILABLE else None,
    'resnet101': lambda: tv_models.resnet101(weights='IMAGENET1K_V2') if PYTORCH_AVAILABLE else None,
    'densenet121': lambda: tv_models.densenet121(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'densenet161': lambda: tv_models.densenet161(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'mobilenet_v2': lambda: tv_models.mobilenet_v2(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'mobilenet_v3_small': lambda: tv_models.mobilenet_v3_small(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'mobilenet_v3_large': lambda: tv_models.mobilenet_v3_large(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'alexnet': lambda: tv_models.alexnet(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'squeezenet1_0': lambda: tv_models.squeezenet1_0(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'squeezenet1_1': lambda: tv_models.squeezenet1_1(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'googlenet': lambda: tv_models.googlenet(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'inception_v3': lambda: tv_models.inception_v3(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'shufflenet_v2_x1_0': lambda: tv_models.shufflenet_v2_x1_0(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'efficientnet_b0': lambda: tv_models.efficientnet_b0(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'efficientnet_b1': lambda: tv_models.efficientnet_b1(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
    'regnet_y_400mf': lambda: tv_models.regnet_y_400mf(weights='IMAGENET1K_V1') if PYTORCH_AVAILABLE else None,
}


def _load_model_for_inference(model_path, framework):
    """Load model with caching.
    
    Accepts either:
    - A torchvision model name (e.g. 'vgg16') → downloads pretrained weights on first call
    - A relative filename in the UPLOAD_FOLDER (e.g. 'mymodel.pth')
    - An absolute file path
    """
    cache_key = f"{framework}_{model_path}"
    
    if cache_key in model_cache:
        logger.info(f"Using cached model: {cache_key}")
        return model_cache[cache_key]
    
    logger.info(f"Loading model: {model_path}")
    
    if framework == 'pytorch':
        if not PYTORCH_AVAILABLE:
            raise RuntimeError('PyTorch is not installed')
        
        from collections import OrderedDict
        
        # --- Case 1: Known torchvision model name ---
        model_name_lower = model_path.lower().strip()
        if model_name_lower in TORCHVISION_MODEL_MAP:
            logger.info(f"Loading pretrained torchvision model: {model_name_lower}")
            model = TORCHVISION_MODEL_MAP[model_name_lower]()
            model.eval()
            model_cache[cache_key] = model
            logger.info(f"Pretrained {model_name_lower} loaded and cached")
            return model
        
        # --- Case 2: File path (relative or absolute) ---
        if not Path(model_path).is_absolute():
            full_path = app.config['UPLOAD_FOLDER'] / model_path
        else:
            full_path = Path(model_path)
        
        if not full_path.exists():
            raise FileNotFoundError(
                f"Model file not found: {model_path}. "
                "Either use a torchvision model name (e.g. 'vgg16') or upload a .pth file first."
            )
        
        loaded = torch.load(full_path, map_location='cpu', weights_only=False)
        
        # Check if loaded object is a state_dict or a full model
        if isinstance(loaded, (OrderedDict, dict)) and not hasattr(loaded, 'forward'):
            # It's a state_dict — try to infer architecture from filename
            name_stem = full_path.stem.lower()
            model_fn = None
            for known_name, fn in TORCHVISION_MODEL_MAP.items():
                if known_name in name_stem:
                    model_fn = fn
                    logger.info(f"Detected architecture {known_name} from filename")
                    break
            
            if model_fn is None:
                raise ValueError(
                    f"Cannot load state_dict from '{model_path}': architecture unknown. "
                    "Name the file to match a known model (e.g. 'vgg16_custom.pth') or "
                    "save the full model with torch.save(model, path)."
                )
            
            model = model_fn()
            # Remove classifier head mismatch gracefully
            try:
                model.load_state_dict(loaded)
            except RuntimeError:
                model.load_state_dict(loaded, strict=False)
                logger.warning("Loaded state_dict with strict=False (some keys skipped)")
        else:
            # Full model object already
            model = loaded
        
        model.eval()
    else:
        from tensorflow import keras
        full_path = app.config['UPLOAD_FOLDER'] / model_path if not Path(model_path).is_absolute() else Path(model_path)
        if not full_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        model = keras.models.load_model(full_path)
    
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
        
        # Only check for a file on disk when the model_path is NOT a known torchvision model name.
        # Known names (e.g. 'vgg16', 'resnet18') are loaded directly by _load_model_for_inference
        # via torchvision with pretrained weights — no .pth file needed.
        is_torchvision_name = model_path.lower().strip() in TORCHVISION_MODEL_MAP
        if not is_torchvision_name:
            full_model_path = os.path.join(app.config['UPLOAD_FOLDER'], model_path)
            if not os.path.exists(full_model_path):
                return jsonify({'error': f'Model file not found: {model_path}'}), 404
            
        # Load model using existing inference loader (handles torchvision names + file paths)
        if framework == 'pytorch':
            model = _load_model_for_inference(model_path, framework)
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
        
        if not PYTORCH_AVAILABLE:
            return jsonify({'error': 'PyTorch not installed'}), 501
        
        # Run inference to get predictions
        with torch.no_grad():
            output = model(processed_image)
            # Handle GoogLeNet/InceptionV3 aux output tuple
            if isinstance(output, (tuple, list)):
                output = output[0]
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

        elif method == 'guided_backprop':
            from core.explainability import GuidedBackpropGenerator
            generator = GuidedBackpropGenerator(model, framework=framework)
            heatmap = generator.generate(
                processed_image,
                target_class=target_class
            )
            target_layer_name = None  # Not applicable for guided backprop
            
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


@app.route('/api/explainability/compare', methods=['POST'])
def explainability_compare():
    """
    Compare multiple explainability methods on the same image.
    Runs Grad-CAM, Saliency, and Guided Backpropagation in one call.

    Expected form data:
    - image: Image file
    - model_path: Path/name of model
    - framework: 'pytorch'
    - target_class (optional): int
    - input_shape (optional): e.g. '(224, 224)'
    """
    try:
        if 'image' not in request.files or 'model_path' not in request.form:
            return jsonify({'error': 'image and model_path are required'}), 400

        image_file = request.files['image']
        model_path = request.form['model_path']
        framework = request.form.get('framework', 'pytorch').lower()

        if framework != 'pytorch':
            return jsonify({'error': 'Only pytorch supported for compare'}), 400
        if not PYTORCH_AVAILABLE:
            return jsonify({'error': 'PyTorch not installed'}), 501

        # Load model (cached)
        model = _load_model_for_inference(model_path, framework)

        # Preprocess image once
        preprocessor = ImagePreprocessor()
        input_shape_str = request.form.get('input_shape', '(224, 224)')
        try:
            input_shape = eval(input_shape_str)
        except Exception:
            input_shape = (224, 224)
        if len(input_shape) == 2:
            input_shape = (1, 3, input_shape[0], input_shape[1])

        original_image = preprocessor.load_image(image_file)
        image_file.seek(0)
        processed_image = preprocessor.preprocess_pytorch(image_file, input_shape)
        orig_w, orig_h = original_image.size  # PIL (width, height)

        # Run inference to determine target class
        with torch.no_grad():
            out = model(processed_image)
            if isinstance(out, (tuple, list)):
                out = out[0]
            probs = torch.nn.functional.softmax(out[0], dim=0)
            top5_prob, top5_idx = torch.topk(probs, 5)

        target_class_req = request.form.get('target_class')
        target_class = int(target_class_req) if target_class_req else top5_idx[0].item()

        predictions = [
            {'class_index': int(idx), 'confidence': float(p)}
            for p, idx in zip(top5_prob, top5_idx)
        ]

        from core.explainability import GuidedBackpropGenerator

        results = {}

        # --- 1. Grad-CAM ---
        try:
            gradcam_gen = GradCAMGenerator(model, framework='pytorch')
            gc_map = gradcam_gen.generate(processed_image.clone(), target_class=target_class)
            results['gradcam'] = {
                'label': 'Grad-CAM',
                'description': 'Highlights class-discriminative regions using gradient-weighted activation maps.',
                'heatmap': serialize_heatmap(gc_map, (orig_h, orig_w)),
                'target_layer': None,
                'success': True
            }
        except Exception as e:
            results['gradcam'] = {'success': False, 'error': str(e), 'label': 'Grad-CAM'}
            logger.warning(f'Grad-CAM failed: {e}')

        # --- 2. Saliency Map ---
        try:
            sal_gen = SaliencyMapGenerator(model, framework='pytorch')
            sal_map = sal_gen.generate(processed_image.clone(), target_class=target_class)
            results['saliency'] = {
                'label': 'Saliency Map',
                'description': 'Raw gradient magnitude: shows which pixels most influence the prediction.',
                'heatmap': serialize_heatmap(sal_map, (orig_h, orig_w)),
                'target_layer': None,
                'success': True
            }
        except Exception as e:
            results['saliency'] = {'success': False, 'error': str(e), 'label': 'Saliency Map'}
            logger.warning(f'Saliency failed: {e}')

        # --- 3. Guided Backpropagation ---
        try:
            gbp_gen = GuidedBackpropGenerator(model, framework='pytorch')
            gbp_map = gbp_gen.generate(processed_image.clone(), target_class=target_class)
            results['guided_backprop'] = {
                'label': 'Guided Backprop',
                'description': 'Sharpened gradient: only positive gradient through positive activations passes.',
                'heatmap': serialize_heatmap(gbp_map, (orig_h, orig_w)),
                'target_layer': None,
                'success': True
            }
        except Exception as e:
            results['guided_backprop'] = {'success': False, 'error': str(e), 'label': 'Guided Backprop'}
            logger.warning(f'Guided Backprop failed: {e}')

        logger.info(f'Compare explainability done for class {target_class}: '
                    f"{[k for k, v in results.items() if v.get('success')]} succeeded")

        return jsonify({
            'success': True,
            'target_class': target_class,
            'predictions': predictions,
            'results': results
        })

    except Exception as e:
        logger.error(f'Error in compare explainability: {str(e)}')
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
