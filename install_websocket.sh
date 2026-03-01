#!/bin/bash

echo ""
echo "  ====================================================="
echo "   Installing WebSocket Support for WhyteBox"
echo "  ====================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ Error: Please run this script from the WhyteBox root directory"
    exit 1
fi

echo "📦 Installing flask-socketio and python-socketio..."
echo ""

# Install WebSocket dependencies
pip3 install flask-socketio>=5.3.0 python-socketio>=5.9.0

if [ $? -eq 0 ]; then
    echo ""
    echo "  ====================================================="
    echo "   ✅ WebSocket Support Installed Successfully!"
    echo "  ====================================================="
    echo ""
    echo "  Next steps:"
    echo "  1. Run the app: ./start.sh"
    echo "  2. Backend will now support WebSocket on ws://localhost:5001/ws"
    echo "  3. Check logs for 'WebSocket support enabled' message"
    echo ""
    echo "  Test WebSocket connection:"
    echo "  - Open browser console"
    echo "  - Run: const ws = new WebSocket('ws://localhost:5001/ws');"
    echo "  - Check for 'Connected to WhyteBox backend' message"
    echo ""
else
    echo ""
    echo "  ====================================================="
    echo "   ❌ Installation Failed"
    echo "  ====================================================="
    echo ""
    echo "  Try manual installation:"
    echo "  pip3 install flask-socketio python-socketio"
    echo ""
    exit 1
fi

# Made with Bob
