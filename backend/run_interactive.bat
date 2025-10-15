@echo off
REM WhyteBox Interactive Model Converter
REM This script runs the interactive CLI tool for converting neural networks

echo ========================================
echo WhyteBox - Interactive Model Converter
echo ========================================
echo.

cd /d "%~dp0.."
python examples\interactive_converter.py

pause
