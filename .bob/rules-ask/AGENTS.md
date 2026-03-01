# Ask Mode Rules (Non-Obvious Only)

## Project Structure Counterintuitive Points
- "backend/" contains Python Flask API, not just data processing
- "frontend/" has no build step - serves static HTML/JS directly via Python HTTP server
- Port 5001 used instead of config.py's 5000 (macOS AirPlay conflict)

## Documentation Context
- AGENTS.md in project root contains critical port mismatch info
- backend/config.py shows port 5000 but start.sh overrides to 5001
- Model cache pattern not documented in config.py but critical for API

## Hidden Dependencies
- TensorFlow/Keras optional - wrapped in try/except throughout
- PyTorch required for core functionality
- opencv-python (cv2) required for explainability features

## Architecture Quirks
- Backend API runs from backend/api/ with sys.path manipulation
- Frontend and backend are separate processes (not integrated build)
- Static file server on 8000, API on 5001 - two separate servers

## Path Resolution Non-Standard
- Imports require explicit parent directory insertion
- Core modules need separate path insertion
- Running from wrong directory causes import failures

## Testing Context
- Mock data tests work without ML frameworks
- Real model tests require PyTorch/TensorFlow installation
- Tests in backend/tests/ use pytest