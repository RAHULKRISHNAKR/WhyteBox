@echo off
setlocal enabledelayedexpansion

echo.
echo  ██╗    ██╗██╗  ██╗██╗   ██╗████████╗███████╗██████╗  ██████╗ ██╗  ██╗
echo  ██║    ██║██║  ██║╚██╗ ██╔╝╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝
echo  ██║ █╗ ██║███████║ ╚████╔╝    ██║   █████╗  ██████╔╝██║   ██║ ╚███╔╝
echo  ██║███╗██║██╔══██║  ╚██╔╝     ██║   ██╔══╝  ██╔══██╗██║   ██║ ██╔██╗
echo  ╚███╔███╔╝██║  ██║   ██║      ██║   ███████╗██████╔╝╚██████╔╝██╔╝ ██╗
echo   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝
echo.
echo  AI Model Explainability Platform v2.0
echo  ========================================
echo.

:: ── Check Python ──────────────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python not found. Install from https://www.python.org/downloads/
        echo         Make sure to check "Add Python to PATH" during installation.
        pause
        exit /b 1
    )
    set PYTHON=py
) else (
    set PYTHON=python
)

:: ── Check Node.js ─────────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

:: ── Check virtual environment ─────────────────────────────────────────────────
if not exist "backend\venv\Scripts\activate.bat" (
    echo [SETUP] Creating Python virtual environment...
    cd backend
    %PYTHON% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    cd ..
    echo [SETUP] Installing Python dependencies (this may take several minutes)...
    cd backend
    call venv\Scripts\activate.bat
    pip install --quiet fastapi==0.109.0 uvicorn[standard]==0.27.0 python-multipart==0.0.6 ^
        pydantic==2.5.3 pydantic-settings==2.1.0 ^
        aiosqlite==0.19.0 sqlalchemy==2.0.25 alembic==1.13.1 ^
        pillow==10.2.0 numpy==1.26.3 ^
        python-dotenv==1.0.0 aiofiles==23.2.1 ^
        prometheus-client==0.19.0 python-json-logger==2.0.7 psutil==5.9.7
    echo [SETUP] Installing PyTorch (CPU)...
    pip install --quiet torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cpu
    cd ..
    echo [SETUP] Python dependencies installed.
)

:: ── Check Node modules ────────────────────────────────────────────────────────
if not exist "frontend\node_modules" (
    echo [SETUP] Installing Node.js dependencies...
    cd frontend
    npm install --silent
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    cd ..
    echo [SETUP] Node.js dependencies installed.
)

:: ── Create backend .env if missing ────────────────────────────────────────────
if not exist "backend\.env" (
    echo [SETUP] Creating backend\.env with SQLite defaults...
    (
        echo DATABASE_URL=sqlite+aiosqlite:///./whytebox.db
        echo REDIS_URL=
        echo DEBUG=true
        echo ENVIRONMENT=development
        echo SECRET_KEY=dev-secret-key-change-in-production-32chars
        echo CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
    ) > backend\.env
    echo [SETUP] backend\.env created.
)

:: ── Create frontend .env.local if missing ─────────────────────────────────────
if not exist "frontend\.env.local" (
    echo [SETUP] Creating frontend\.env.local...
    (
        echo VITE_API_URL=http://localhost:8000/api/v1
        echo VITE_WS_URL=ws://localhost:8000/ws
    ) > frontend\.env.local
    echo [SETUP] frontend\.env.local created.
)

:: ── Start Backend ─────────────────────────────────────────────────────────────
echo [START] Launching backend on http://localhost:8000 ...
start "WhyteBox Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to initialise
echo [WAIT]  Waiting for backend to start...
timeout /t 4 /nobreak > nul

:: ── Start Frontend ────────────────────────────────────────────────────────────
echo [START] Launching frontend on http://localhost:5173 ...
start "WhyteBox Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: ── Done ──────────────────────────────────────────────────────────────────────
echo.
echo  ✅ WhyteBox is starting up!
echo.
echo     Frontend  →  http://localhost:5173
echo     Backend   →  http://localhost:8000
echo     API Docs  →  http://localhost:8000/docs
echo.
echo  Both services are running in separate windows.
echo  Close those windows (or press Ctrl+C in each) to stop.
echo.
echo  First run: ResNet-50 model weights (~100 MB) will download on first use.
echo.
pause

@REM Made with Bob
