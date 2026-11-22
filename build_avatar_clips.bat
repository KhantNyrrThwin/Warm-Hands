@echo off
rem Rebuild the 3D-avatar clips from the recordings in data\msl77\raw.
rem   build_avatar_clips.bat              every recorded sign
rem   build_avatar_clips.bat fever cough  only these signs
cd /d "%~dp0"
set PY=python
if exist ".venv\Scripts\python.exe" set PY=.venv\Scripts\python.exe
%PY% -W ignore tools\avatar\build_clips.py %* || exit /b 1
node --import ./tools/avatar/ts-resolve.mjs tools/avatar/fix_contacts.mjs %* || exit /b 1
node --import ./tools/avatar/ts-resolve.mjs --test tests/recorded.test.mjs
