@echo off
cd /d "%~dp0"
".venv\Scripts\python.exe" data_collection.py --live %*
