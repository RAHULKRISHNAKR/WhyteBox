# WhyteBox Interactive Model Converter
# PowerShell launcher script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WhyteBox - Interactive Model Converter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

python examples\interactive_converter.py

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
