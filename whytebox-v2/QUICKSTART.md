# WhyteBox v2.0 - Quick Start Guide

Get WhyteBox running locally in 5 minutes!

## 🚀 Super Quick Start

```bash
# 1. Navigate to project
cd whytebox-v2

# 2. Run setup script
./scripts/local-dev.sh

# 3. Start the server
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

That's it! Visit http://localhost:8000/docs

## 📋 What You Get

Once running, you'll have access to:

- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)
- **Health Check**: http://localhost:8000/health
- **API Root**: http://localhost:8000/api/v1

## 🧪 Test the API

### Using curl:
```bash
# Health check
curl http://localhost:8000/health

# List models
curl http://localhost:8000/api/v1/models/

# Get specific model
curl http://localhost:8000/api/v1/models/vgg16
```

### Using the Browser:
1. Open http://localhost:8000/docs
2. Click on any endpoint
3. Click "Try it out"
4. Click "Execute"
5. See the response!

## 📊 Available Endpoints

### Models API (`/api/v1/models`)
- `GET /` - List all available models
- `GET /{model_id}` - Get model details
- `POST /load` - Load a model for visualization
- `POST /upload` - Upload custom model
- `DELETE /{model_id}` - Delete custom model

### Coming in Phase 2:
- Inference API (`/api/v1/inference`)
- Explainability API (`/api/v1/explainability`)

## 🔧 Development Mode

The server runs with hot reload enabled, so any code changes will automatically restart the server.

### Making Changes:
1. Edit files in `backend/app/`
2. Save the file
3. Server automatically reloads
4. Test your changes at http://localhost:8000/docs

## 📝 Configuration

The application uses `.env` file for configuration. Default settings:

```bash
# Database: SQLite (no setup needed)
DATABASE_URL=sqlite+aiosqlite:///./whytebox_local.db

# Server
HOST=127.0.0.1
PORT=8000
DEBUG=true

# ML: CPU mode (no GPU needed)
PYTORCH_DEVICE=cpu
```

## 🐛 Troubleshooting

### Port 8000 already in use?
```bash
# Find and kill the process
lsof -i :8000
kill -9 <PID>

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

### Import errors?
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements-local.txt
```

### Can't find uvicorn?
```bash
# Install it
pip install uvicorn[standard]
```

## 📚 Next Steps

1. **Explore the API** at http://localhost:8000/docs
2. **Read the docs** in `LOCAL_DEVELOPMENT.md`
3. **Check the plan** in `PHASE_1_DETAILED_PLAN.md`
4. **Start coding** - Add new endpoints or features!

## 🎯 What's Working Now

✅ FastAPI application running  
✅ SQLite database (auto-created)  
✅ Models API with mock data  
✅ Interactive API documentation  
✅ Hot reload for development  
✅ Health check endpoint  

## 🔜 Coming Soon (Phase 2)

⏳ Real model loading (PyTorch/TensorFlow)  
⏳ Inference API  
⏳ Explainability methods  
⏳ Frontend (React + BabylonJS)  

---

**Need help?** Check `LOCAL_DEVELOPMENT.md` for detailed instructions.

**Ready to contribute?** See `PHASE_1_DETAILED_PLAN.md` for the roadmap.