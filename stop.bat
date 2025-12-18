@echo off
echo Stopping Backend and Frontend...

:: Kill Node.js (React)
taskkill /F /IM node.exe /T >nul 2>&1

:: Kill Python (FastAPI/Uvicorn)
taskkill /F /IM python.exe /T >nul 2>&1

echo Services stopped.
timeout /t 2
exit