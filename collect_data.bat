@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (".venv\Scripts\python.exe" collect_data.py %*) else (python collect_data.py %*)
