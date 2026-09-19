@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found on this computer.
  echo Install Python, or publish the app to a web host first.
  pause
  exit /b 1
)

echo Starting Pose Cognitive Trainer...
echo.
echo The application will open at http://localhost:8080/?v=1.0.3
echo Keep this window open while using the application.
echo Close this window to stop the local application.
echo.

start "" "http://localhost:8080/?v=1.0.3"
python -m http.server 8080

if errorlevel 1 (
  echo.
  echo Could not start the application. Port 8080 may already be in use.
  pause
)
