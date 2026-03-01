# 📦 WhyteBox Installation Guide

Complete step-by-step installation instructions for WhyteBox Neural Network Visualizer.

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Installation](#quick-installation)
3. [Detailed Installation](#detailed-installation)
4. [Platform-Specific Instructions](#platform-specific-instructions)
5. [Troubleshooting](#troubleshooting)
6. [Verification](#verification)
7. [Next Steps](#next-steps)

---

## 🖥️ System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Python**: 3.9 or higher
- **RAM**: 8 GB
- **Storage**: 2 GB free space
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

### Recommended Requirements
- **OS**: Windows 11, macOS 13+, or Linux (Ubuntu 22.04+)
- **Python**: 3.10 or 3.11
- **RAM**: 16 GB or more
- **Storage**: 5 GB free space (for model caching)
- **GPU**: NVIDIA GPU with CUDA support (optional, for faster inference)
- **Browser**: Latest Chrome or Edge

---

## ⚡ Quick Installation

For experienced users who want to get started immediately:

```bash
# Clone repository
git clone https://github.com/yourusername/WhyteBox.git
cd WhyteBox

# Install dependencies
cd backend
pip install -r requirements.txt

# Start servers (macOS/Linux)
cd ..
./start.sh

# Or on Windows
start.bat

# Open browser
# http://localhost:8000/frontend/examples/visualize-model.html
```

---

## 📖 Detailed Installation

### Step 1: Install Python

#### Windows
1. Download Python from [python.org](https://www.python.org/downloads/)
2. Run the installer
3. ✅ **Important**: Check "Add Python to PATH"
4. Click "Install Now"
5. Verify installation:
```cmd
python --version
```

#### macOS
```bash
# Using Homebrew (recommended)
brew install python@3.11

# Or download from python.org
# Verify installation
python3 --version
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
python3 --version
```

### Step 2: Install Git

#### Windows
Download from [git-scm.com](https://git-scm.com/download/win)

#### macOS
```bash
# Git comes with Xcode Command Line Tools
xcode-select --install

# Or use Homebrew
brew install git
```

#### Linux
```bash
sudo apt install git
```

### Step 3: Clone Repository

```bash
# Navigate to your projects directory
cd ~/Documents  # or wherever you keep projects

# Clone the repository
git clone https://github.com/yourusername/WhyteBox.git

# Enter the directory
cd WhyteBox
```

### Step 4: Set Up Python Virtual Environment (Recommended)

#### Why use a virtual environment?
- Isolates project dependencies
- Prevents conflicts with other Python projects
- Makes it easy to reproduce the environment

#### Create virtual environment

**Windows:**
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

### Step 5: Install Backend Dependencies

```bash
# Make sure you're in the backend directory with venv activated
pip install --upgrade pip
pip install -r requirements.txt
```

This will install:
- Flask (web server)
- PyTorch (deep learning)
- torchvision (pretrained models)
- NumPy (numerical computing)
- Pillow (image processing)
- opencv-python (computer vision)
- flask-cors (cross-origin requests)

**Installation time**: 5-10 minutes depending on your internet speed

### Step 6: Verify Installation

```bash
# Test imports
python -c "import torch; import flask; import cv2; print('✅ All dependencies installed!')"
```

If you see "✅ All dependencies installed!", you're good to go!

---

## 🔧 Platform-Specific Instructions

### macOS Specific

#### Port 5000 Conflict
macOS Monterey and later use port 5000 for AirPlay Receiver. WhyteBox uses port 5001 instead.

**Option 1: Use port 5001 (default)**
- No action needed, start.sh already uses 5001

**Option 2: Disable AirPlay Receiver**
1. System Preferences → Sharing
2. Uncheck "AirPlay Receiver"
3. Change `backend/config.py` to use port 5000

#### Permission Issues
If you get permission errors:
```bash
chmod +x start.sh
./start.sh
```

### Windows Specific

#### PowerShell Execution Policy
If you get "cannot be loaded because running scripts is disabled":
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Firewall Warnings
Windows Firewall may ask for permission:
- ✅ Allow Python to access network
- ✅ Allow for both Private and Public networks

### Linux Specific

#### Python 3.9+ Not Available
On older distributions:
```bash
# Add deadsnakes PPA (Ubuntu/Debian)
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev
```

#### Port Already in Use
If ports 5001 or 8000 are occupied:
```bash
# Find process using port
sudo lsof -i :5001
sudo lsof -i :8000

# Kill process
sudo kill -9 <PID>
```

---

## 🚀 Starting the Application

### Method 1: Using Start Scripts (Recommended)

**macOS/Linux:**
```bash
./start.sh
```

**Windows:**
```cmd
start.bat
```

The script will:
1. Check Python installation
2. Install dependencies if needed
3. Start Flask backend on port 5001
4. Start static file server on port 8000
5. Open browser automatically

### Method 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend/api
python app.py
```

**Terminal 2 - Frontend:**
```bash
# From project root
python -m http.server 8000
```

**Browser:**
```
http://localhost:8000/frontend/examples/visualize-model.html
```

### Method 3: Development Mode

For development with auto-reload:

**Backend:**
```bash
cd backend/api
export FLASK_ENV=development  # Linux/macOS
set FLASK_ENV=development     # Windows
python app.py
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Python not found"
**Solution:**
- Windows: Reinstall Python with "Add to PATH" checked
- macOS/Linux: Use `python3` instead of `python`

#### 2. "pip: command not found"
**Solution:**
```bash
# macOS/Linux
python3 -m ensurepip --upgrade

# Windows
python -m ensurepip --upgrade
```

#### 3. "Port already in use"
**Solution:**
```bash
# Find and kill process
# macOS/Linux
lsof -ti:5001 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

#### 4. "ModuleNotFoundError: No module named 'torch'"
**Solution:**
```bash
# Activate virtual environment first
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Then install
pip install -r requirements.txt
```

#### 5. "CUDA not available" (GPU users)
**Solution:**
```bash
# Install PyTorch with CUDA support
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

#### 6. "Failed to fetch" in browser
**Solution:**
- Check backend is running on port 5001
- Check browser console for CORS errors
- Verify `http://localhost:5001/api/health` returns JSON

#### 7. "Model file not found"
**Solution:**
- Pretrained models download automatically on first use
- For custom models, place in `backend/models/` directory
- Check file permissions

### Getting Help

If you encounter issues not listed here:

1. **Check logs**: Look at terminal output for error messages
2. **Browser console**: Press F12 and check Console tab
3. **GitHub Issues**: Search existing issues or create new one
4. **Documentation**: Check [USER_GUIDE.md](USER_GUIDE.md) for usage help

---

## ✅ Verification

### Test Backend

```bash
# Test health endpoint
curl http://localhost:5001/api/health

# Expected output:
# {"status": "healthy", "pytorch_available": true, ...}
```

### Test Frontend

1. Open browser to `http://localhost:8000/frontend/examples/visualize-model.html`
2. Click "Load VGG16"
3. Should see 3D model appear
4. Try rotating with mouse

### Test Inference

1. Click "📷 Upload Image"
2. Select any image
3. Click "▶️ Run Inference"
4. Should see predictions and heatmaps

---

## 🎯 Next Steps

Now that WhyteBox is installed:

1. **Read the User Guide**: [USER_GUIDE.md](USER_GUIDE.md)
2. **Try Examples**: Explore different models and images
3. **Check API Reference**: [backend/API_REFERENCE.md](backend/API_REFERENCE.md)
4. **Join Community**: Star the repo and join discussions

---

## 🔄 Updating WhyteBox

To update to the latest version:

```bash
# Pull latest changes
git pull origin main

# Update dependencies
cd backend
pip install -r requirements.txt --upgrade

# Restart servers
cd ..
./start.sh  # or start.bat on Windows
```

---

## 🗑️ Uninstallation

To completely remove WhyteBox:

```bash
# Deactivate virtual environment
deactivate

# Remove directory
cd ..
rm -rf WhyteBox  # macOS/Linux
rmdir /s WhyteBox  # Windows
```

---

## 📞 Support

- **Documentation**: [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/WhyteBox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/WhyteBox/discussions)

---

**Installation complete! 🎉**

[← Back to README](README.md) | [User Guide →](USER_GUIDE.md)