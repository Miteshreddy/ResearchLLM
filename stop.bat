@echo off
title ResearchPilot AI - Shutdown
echo.
echo ============================================
echo   ResearchPilot AI - Stopping
echo ============================================
echo.

echo [INFO] Stopping backend server...
taskkill /FI "WINDOWTITLE eq ResearchPilot-Backend*" /F >nul 2>&1

echo [INFO] Stopping frontend server...
taskkill /FI "WINDOWTITLE eq ResearchPilot-Frontend*" /F >nul 2>&1

echo [INFO] Killing any remaining processes on ports 8000 and 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 8000,3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo.
echo [OK] ResearchPilot AI stopped.
echo.
pause
