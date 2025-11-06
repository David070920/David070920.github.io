@echo off
REM ========================================
REM Wall Painting Robot - Local Server Startup
REM ========================================
REM This script starts a local web server so you can use the application.
REM The application uses ES6 modules which require a web server (double-clicking index.html won't work).

echo.
echo ========================================
echo Wall Painting Robot - Starting Server
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    echo.
    echo This application requires Python to run a local web server.
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo Python found! Starting server...
echo.
echo The application will open in your browser at:
echo http://localhost:8000
echo.
echo IMPORTANT: Keep this window open while using the application!
echo Press Ctrl+C to stop the server when you're done.
echo.
echo ========================================
echo.

REM Wait a moment then open browser
start "" http://localhost:8000

REM Start the Python HTTP server
python -m http.server 8000