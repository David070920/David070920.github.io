# ========================================
# Wall Painting Robot - Local Server Startup (PowerShell)
# ========================================
# This script starts a local web server so you can use the application.
# The application uses ES6 modules which require a web server (double-clicking index.html won't work).

Write-Host ""
Write-Host "========================================"
Write-Host "Wall Painting Robot - Starting Server"
Write-Host "========================================"
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found! Starting server..."
    Write-Host ""
} catch {
    Write-Host "ERROR: Python is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "This application requires Python to run a local web server."
    Write-Host ""
    Write-Host "Please install Python from: https://www.python.org/downloads/"
    Write-Host "Make sure to check 'Add Python to PATH' during installation."
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "The application will open in your browser at:"
Write-Host "http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Keep this window open while using the application!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server when you're done."
Write-Host ""
Write-Host "========================================"
Write-Host ""

# Wait a moment then open browser
Start-Sleep -Seconds 1
Start-Process "http://localhost:8000"

# Start the Python HTTP server
python -m http.server 8000