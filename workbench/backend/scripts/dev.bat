@echo off
REM Start the Canonization workbench backend (embedded PostgreSQL + FastAPI).
setlocal
cd /d %~dp0\..
if not exist .venv\Scripts\python.exe (
    echo Creating virtual environment...
    python -m venv .venv
)
if not exist .venv\.deps-ready (
    echo Installing backend dependencies...
    call .venv\Scripts\python.exe -m pip install --upgrade pip
    if errorlevel 1 exit /b 1
    call .venv\Scripts\python.exe -m pip install -r requirements.txt
    if errorlevel 1 exit /b 1
    type nul > .venv\.deps-ready
)
start "Canonization API" .venv\Scripts\pythonw.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8471
echo Backend starting at http://127.0.0.1:8471
endlocal
