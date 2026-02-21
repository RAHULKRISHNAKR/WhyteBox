@echo off
title WhyteBox - Startup
echo.
echo  =====================================================
echo   WhyteBox Neural Network Visualizer
echo  =====================================================
echo.

REM Check Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

REM Check pip packages (quick check on flask)
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing backend dependencies...
    pip install -r backend\requirements.txt
)

echo [1/2] Starting Flask backend on http://localhost:5000 ...
start "WhyteBox Backend" cmd /k "cd /d %~dp0backend\api && python app.py"

REM Give the backend a moment to start
timeout /t 3 /nobreak >nul

echo [2/2] Starting static file server on http://localhost:8000 ...
start "WhyteBox Frontend" cmd /k "cd /d %~dp0 && python -m http.server 8000"

timeout /t 2 /nobreak >nul

echo.
echo  =====================================================
echo   WhyteBox is ready!
echo  =====================================================
echo.
echo   Open your browser and go to:
echo.
echo   http://localhost:8000/frontend/examples/visualize-model.html
echo.
echo   Backend API:   http://localhost:5000
echo   Health check:  http://localhost:5000/api/health
echo.
echo  =====================================================
echo.
echo  Press any key to open the browser automatically...
pause >nul

start http://localhost:8000/frontend/examples/visualize-model.html
