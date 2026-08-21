@echo off
setlocal

cd /d "%~dp0"

call npm run tauri:android:verify
if errorlevel 1 exit /b %errorlevel%

call npm run tauri:android:build
exit /b %errorlevel%
