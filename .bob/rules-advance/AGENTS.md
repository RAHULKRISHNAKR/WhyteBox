# Advance Mode Rules (Non-Obvious Only)

## Path Resolution Patterns
- Always use `sys.path.insert(0, '.')` when running from backend/api/
- Parent imports need: `sys.path.insert(0, str(Path(__file__).parent.parent))`
- Core module imports need: `sys.path.insert(0, str(Path(__file__).parent.parent / 'core'))`

## PyTorch Gradient Manipulation
- Use `.detach().clone()` not `.clone()` in backward hooks
- Pattern: `grad_input[0].detach().clone().clamp(min=0.0)` prevents "view modified inplace" errors
- Critical for Guided Backpropagation in backend/core/explainability.py

## Import Strategy
- Wrap TensorFlow/Keras imports in try/except with KERAS_AVAILABLE flag
- Allows PyTorch-only operation without TensorFlow
- See backend/api/app.py lines 31-37 for pattern

## Model Caching
- Use `model_cache = {}` dict at module level in API endpoints
- Prevents memory exhaustion from repeated model loading
- Not optional - required for inference endpoints

## Port Configuration
- Backend MUST run on port 5001 (not config.py's 5000)
- macOS AirPlay Receiver occupies port 5000
- All frontend fetch calls hardcoded to port 5001

## Access to MCP and Browser Tools
- Advance mode has access to MCP servers and browser automation
- Can use browser_action for testing frontend functionality
- Can leverage MCP tools for extended capabilities