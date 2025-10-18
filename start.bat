@echo off
docker compose up --build -d
REM Wait 5 seconds, then open browser automatically.
powershell -Command "Start-Sleep -Seconds 5; Start-Process http://localhost:3000"
