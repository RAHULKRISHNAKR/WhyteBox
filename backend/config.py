# Configuration for WhyteBox Backend

# API Settings
API_HOST = '0.0.0.0'
API_PORT = 5000
API_DEBUG = True

# File Upload Settings
MAX_UPLOAD_SIZE_MB = 500
ALLOWED_EXTENSIONS = ['pth', 'pt', 'h5', 'keras', 'onnx', 'pb']

# Extraction Settings
DEFAULT_INPUT_SHAPE = (1, 3, 224, 224)
EXTRACT_WEIGHTS_DEFAULT = False
EXTRACT_DETAILED_PARAMS_DEFAULT = True

# Conversion Settings
INCLUDE_WEIGHTS_IN_OUTPUT = False
COMPRESS_JSON_OUTPUT = False
ADD_VISUALIZATION_HINTS = True

# Validation Settings
VALIDATE_ON_CONVERSION = True
STRICT_VALIDATION = False

# Paths (relative to backend directory)
UPLOAD_FOLDER = 'models'
OUTPUT_FOLDER = 'output'
TEMP_FOLDER = 'temp'

# Logging
LOG_LEVEL = 'INFO'
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# Converter Settings
COLOR_SCHEME = 'gradient'
LAYER_SPACING = 2.0
VERTICAL_SPACING = 1.5
DEFAULT_CAMERA_DISTANCE = 10.0

# Performance Settings
MAX_TENSOR_SIZE_FOR_INLINE = 10000  # Max elements to include inline in JSON
PARALLEL_PROCESSING = False
MAX_WORKERS = 4
