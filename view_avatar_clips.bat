@echo off
rem Opens the 3D-avatar sign gallery in the browser (http://localhost:5199), each sign looping.
rem   view_avatar_clips.bat           every sign: the earlier ones and the 30 from MSL for Warm Hands.xlsx
rem   view_avatar_clips.bat new       only the 30 spreadsheet signs
rem   view_avatar_clips.bat kachin    one sign (or several: kachin,fine)
cd /d "%~dp0"
set SHOW=all
if not "%~1"=="" set SHOW=%~1
npx vite --config tools/avatar/vite.render.config.ts --port 5199 --open "/tools/avatar/gallery.html?show=%SHOW%"
