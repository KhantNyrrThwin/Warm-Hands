@echo off
cd /d "%~dp0.."
set "WH_ROOT=%CD%"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" "server\main.py"
) else if exist "D:\WH\.venv\Scripts\python.exe" (
  "D:\WH\.venv\Scripts\python.exe" "server\main.py"
) else (
  echo Create .venv here and run: pip install -r requirements.txt
  exit /b 1
)
