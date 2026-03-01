#!/bin/bash

# WhyteBox v2.0 - Complete Setup Script
# This script sets up the entire development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Track what needs to be installed
NEEDS_NODE=false
NEEDS_PYTHON_DEPS=false
NEEDS_FRONTEND_DEPS=false

print_header "WhyteBox v2.0 - Complete Setup"

echo "This script will set up your development environment."
echo "It will check for required dependencies and install what's needed."
echo ""

# Check Python
print_status "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_success "Python $PYTHON_VERSION found"
else
    print_error "Python 3 not found. Please install Python 3.11 or higher."
    exit 1
fi

# Check pip
print_status "Checking pip installation..."
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version | cut -d' ' -f2)
    print_success "pip $PIP_VERSION found"
else
    print_error "pip not found. Please install pip."
    exit 1
fi

# Check Node.js
print_status "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION found"
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION found"
    else
        print_error "npm not found but Node.js is installed. Please reinstall Node.js."
        exit 1
    fi
else
    print_warning "Node.js not found"
    NEEDS_NODE=true
    echo ""
    echo "Node.js is required for the frontend. You have two options:"
    echo ""
    echo "Option 1: Install via Homebrew (recommended)"
    echo "  brew install node@18"
    echo ""
    echo "Option 2: Install via nvm (Node Version Manager)"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  # Restart terminal, then:"
    echo "  nvm install 18"
    echo "  nvm use 18"
    echo ""
    read -p "Would you like to install Node.js via Homebrew now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Installing Node.js via Homebrew..."
        if command -v brew &> /dev/null; then
            brew install node@18
            print_success "Node.js installed successfully"
            NEEDS_NODE=false
        else
            print_error "Homebrew not found. Please install Homebrew first:"
            echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
            exit 1
        fi
    else
        print_warning "Skipping Node.js installation. You'll need to install it manually later."
        print_warning "Frontend setup will be skipped."
    fi
fi

# Check Docker (optional)
print_status "Checking Docker installation (optional)..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    print_success "Docker $DOCKER_VERSION found"
else
    print_warning "Docker not found (optional for local development)"
fi

print_header "Setting Up Backend"

# Navigate to backend directory
cd backend

# Create virtual environment
print_status "Creating Python virtual environment..."
if [ -d "venv" ]; then
    print_warning "Virtual environment already exists. Removing..."
    rm -rf venv
fi
python3 -m venv venv
print_success "Virtual environment created"

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate
print_success "Virtual environment activated"

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
print_success "pip upgraded"

# Install backend dependencies
print_status "Installing backend dependencies..."
print_warning "This may take a few minutes..."
pip install -r requirements.txt > /dev/null 2>&1
print_success "Production dependencies installed"

print_status "Installing development dependencies..."
pip install -r requirements-dev.txt > /dev/null 2>&1
print_success "Development dependencies installed"

# Create .env file
print_status "Setting up environment file..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success ".env file created"
    print_warning "Please edit .env file with your configuration"
else
    print_warning ".env file already exists, skipping"
fi

# Initialize database
print_status "Initializing database..."
if [ -f "whytebox.db" ]; then
    print_warning "Database already exists, skipping initialization"
else
    # Create empty database file
    touch whytebox.db
    print_success "SQLite database created"
fi

cd ..

# Frontend setup (only if Node.js is available)
if [ "$NEEDS_NODE" = false ]; then
    print_header "Setting Up Frontend"
    
    cd frontend
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    print_warning "This may take several minutes..."
    npm install
    print_success "Frontend dependencies installed"
    
    # Create .env.local file
    print_status "Setting up frontend environment file..."
    if [ ! -f ".env.local" ]; then
        cp .env.example .env.local
        print_success ".env.local file created"
    else
        print_warning ".env.local file already exists, skipping"
    fi
    
    cd ..
else
    print_warning "Skipping frontend setup (Node.js not installed)"
fi

# Install pre-commit hooks
print_header "Setting Up Development Tools"

print_status "Installing pre-commit..."
pip install pre-commit > /dev/null 2>&1
print_success "pre-commit installed"

print_status "Installing pre-commit hooks..."
pre-commit install > /dev/null 2>&1
print_success "pre-commit hooks installed"

# Make scripts executable
print_status "Making scripts executable..."
chmod +x scripts/*.sh
print_success "Scripts are now executable"

# Summary
print_header "Setup Complete!"

echo "✅ Backend setup complete"
if [ "$NEEDS_NODE" = false ]; then
    echo "✅ Frontend setup complete"
else
    echo "⚠️  Frontend setup skipped (Node.js not installed)"
fi
echo "✅ Development tools installed"
echo ""

print_header "Next Steps"

echo "1. Start the backend server:"
echo "   ${CYAN}cd backend${NC}"
echo "   ${CYAN}source venv/bin/activate${NC}"
echo "   ${CYAN}uvicorn app.main:app --reload${NC}"
echo ""

if [ "$NEEDS_NODE" = false ]; then
    echo "2. Start the frontend server (in a new terminal):"
    echo "   ${CYAN}cd frontend${NC}"
    echo "   ${CYAN}npm run dev${NC}"
    echo ""
    echo "3. Open your browser:"
    echo "   Backend API: ${CYAN}http://localhost:8000${NC}"
    echo "   API Docs: ${CYAN}http://localhost:8000/docs${NC}"
    echo "   Frontend: ${CYAN}http://localhost:3000${NC}"
else
    echo "2. Install Node.js to enable frontend development:"
    echo "   ${CYAN}brew install node@18${NC}"
    echo "   Then run this script again to complete frontend setup"
    echo ""
    echo "3. Backend is ready:"
    echo "   Backend API: ${CYAN}http://localhost:8000${NC}"
    echo "   API Docs: ${CYAN}http://localhost:8000/docs${NC}"
fi

echo ""
print_header "Useful Commands"

echo "Run tests:"
echo "  ${CYAN}./scripts/run-tests.sh all${NC}"
echo ""
echo "Run linting:"
echo "  ${CYAN}./scripts/run-tests.sh lint${NC}"
echo ""
echo "Run type checking:"
echo "  ${CYAN}./scripts/run-tests.sh type${NC}"
echo ""
echo "View documentation:"
echo "  ${CYAN}cat docs/SETUP_GUIDE.md${NC}"
echo ""

print_success "Setup complete! Happy coding! 🚀"

# Made with Bob
