@echo off
setlocal
title TinyMe - localhost:3100
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not available in PATH.
  pause
  exit /b 1
)
if not exist "node_modules\next\dist\bin\next" (
  call npm.cmd ci
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
echo TinyMe: http://127.0.0.1:3100
echo Keep this window open while using TinyMe. Press Ctrl+C to stop.
call npm.cmd run dev -- --port 3100
if errorlevel 1 (
  echo TinyMe could not start. See the error above.
  pause
)
