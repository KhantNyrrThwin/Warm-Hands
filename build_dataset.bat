@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (".venv\Scripts\python.exe" build_dataset.py %*) else (python build_dataset.py %*)
