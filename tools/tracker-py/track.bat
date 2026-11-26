@echo off
rem Drag a signer video onto this file, or run: track.bat "video.mp4" [--mode holistic]
title Tracker
cd /d "%~dp0"
if "%~1"=="" (
  echo Drag a video file onto track.bat, or run: track.bat "path\to\video.mp4"
  pause
  exit /b 1
)
if not exist .venv\Scripts\python.exe (
  echo Run setup.bat first.
  pause
  exit /b 1
)
.venv\Scripts\python track.py %* 2> .venv\last-run-log.txt
if errorlevel 1 (
  echo.
  echo Tracking failed. Messages:
  type .venv\last-run-log.txt | findstr /v /b "W0000 I0000 INFO:"
  pause
  exit /b 1
)
echo.
echo The results folder opens now. Log of messages: .venv\last-run-log.txt
start "" "%~dp0out\%~n1"
pause
