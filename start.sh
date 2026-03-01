#!/bin/bash

echo ""
echo "  ====================================================="
echo "   WhyteBox Neural Network Visualizer"
echo "  ====================================================="
echo ""

# Check Python is available
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python not found. Please install Python 3.9+"
    exit 1
fi

echo "Python version:"
python3 --version

# Check pip packages (quick check on flask)
if ! python3 -c "import flask" &> /dev/null; then
    echo "[INFO] Installing backend dependencies..."
    pip3 install -r backend/requirements.txt
fi

echo "[1/2] Starting Flask backend on http://localhost:5001 ..."
(cd backend/api && python3 -c "
import sys
sys.path.insert(0, '.')
from app import app
app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)
") &
BACKEND_PID=$!

# Give the backend a moment to start
sleep 3

echo "[2/2] Starting static file server on http://localhost:8000 ..."
python3 -m http.server 8000 &
FRONTEND_PID=$!

sleep 2

echo ""
echo "  ====================================================="
echo "   WhyteBox is ready!"
echo "  ====================================================="
echo ""
echo "   Open your browser and go to:"
echo ""
echo "   http://localhost:8000/frontend/examples/visualize-model.html"
echo ""
echo "   Backend API:   http://localhost:5001"
echo "   Health check:  http://localhost:5001/api/health"
echo ""
echo "  ====================================================="
echo ""
echo "  Opening browser automatically in 3 seconds..."
echo "  Press Ctrl+C to stop both servers"
echo ""

sleep 3

# Open browser (macOS)
open http://localhost:8000/frontend/examples/visualize-model.html

# Wait for user interrupt
wait

# Made with Bob
