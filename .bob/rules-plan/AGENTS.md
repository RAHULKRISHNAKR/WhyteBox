# Plan Mode Rules (Non-Obvious Only)

## Architecture Constraints
- Backend and frontend are separate processes (not monolithic)
- Backend must run from backend/api/ directory for imports to work
- Port 5001 hardcoded throughout frontend (not configurable)

## Hidden Coupling
- Frontend fetch calls hardcoded to port 5001 in multiple files
- Model cache dict required at module level in API (not per-request)
- PyTorch backward hooks require .detach().clone() pattern (not just .clone())

## Non-Standard Patterns
- sys.path manipulation required for all backend imports
- TensorFlow/Keras optional with KERAS_AVAILABLE flag pattern
- Static file serving via Python HTTP server (no webpack/build)

## Performance Bottlenecks
- Model reloading without cache causes memory exhaustion
- Gradient computation in explainability requires specific detach pattern
- Large models (>500MB) limited by Flask MAX_CONTENT_LENGTH

## Deployment Considerations
- Two separate servers must run: API (5001) and static files (8000)
- macOS AirPlay Receiver blocks port 5000 (use 5001)
- No build step means frontend changes are immediate

## Testing Architecture
- Mock data tests independent of ML frameworks
- Real model tests require PyTorch installation
- pytest used but not configured in pyproject.toml