@echo off
setlocal
title ResearchPilot AI - Startup

set "ROOT=%~dp0"
pushd "%ROOT%"

echo.
echo ============================================
echo   ResearchPilot AI - Starting Up
echo ============================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)
echo [OK] Python found.

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found.

if not exist ".env" (
    echo [WARN] .env file not found.
    echo [INFO] Copying .env.example to .env...
    copy /Y ".env.example" ".env" >nul
)
echo [OK] .env file exists.

if not exist "backend\.venv\Scripts\python.exe" (
    echo.
    echo [INFO] Creating Python virtual environment...
    python -m venv "backend\.venv"
    if errorlevel 1 (
        echo [ERROR] Failed to create backend virtual environment.
        pause
        exit /b 1
    )
)
echo [OK] Virtual environment ready.

echo.
echo [INFO] Installing backend dependencies...
call "backend\.venv\Scripts\activate.bat"
python -m pip install --upgrade pip
if errorlevel 1 (
    echo [ERROR] Failed to upgrade pip.
    pause
    exit /b 1
)
python -m pip install -r "backend\requirements.txt"
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed.

echo.
echo [INFO] Installing frontend dependencies...
pushd "frontend"
call npm install
if errorlevel 1 (
    popd
    echo [ERROR] Failed to install frontend dependencies.
    pause
    exit /b 1
)
popd
echo [OK] Frontend dependencies installed.

echo.
echo [INFO] Starting FastAPI backend on port 8000...
start "ResearchPilot-Backend" /D "%ROOT%backend" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [INFO] Waiting for backend health check...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddSeconds(45); $ready=$false; while((Get-Date) -lt $deadline){ try { $res = Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/health; if($res.StatusCode -eq 200){ $ready=$true; break } } catch { Start-Sleep -Seconds 1 } }; if(-not $ready){ exit 1 }"
if errorlevel 1 (
    echo [ERROR] Backend did not become ready on http://localhost:8000/api/health
    pause
    exit /b 1
)
echo [OK] Backend is ready.

echo.
echo [INFO] Starting Next.js frontend on port 3000...
start "ResearchPilot-Frontend" /D "%ROOT%frontend" cmd /k "npm run dev"

echo [INFO] Waiting for frontend...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddSeconds(60); $ready=$false; while((Get-Date) -lt $deadline){ try { $res = Invoke-WebRequest -UseBasicParsing http://localhost:3000; if($res.StatusCode -eq 200){ $ready=$true; break } } catch { Start-Sleep -Seconds 1 } }; if(-not $ready){ exit 1 }"
if errorlevel 1 (
    echo [ERROR] Frontend did not become ready on http://localhost:3000
    pause
    exit /b 1
)
echo [OK] Frontend is ready.

echo.
echo [INFO] Opening browser...
start "" "http://localhost:3000"

echo.
echo ============================================
echo   ResearchPilot AI is running!
echo ============================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo   To stop: run stop.bat or close the terminal windows.
echo.
pause
