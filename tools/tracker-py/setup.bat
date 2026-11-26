@echo off
rem One-time setup for the Python tracker. Everything stays inside this folder:
rem   .venv\   Python packages      models\   MediaPipe model files      .cache\   download cache
title Tracker setup
cd /d "%~dp0"
set PIP_CACHE_DIR=%~dp0.cache\pip
where py >nul 2>nul && (set PY=py) || (set PY=python)
if not exist .venv\Scripts\python.exe (
  echo Creating the Python environment in %~dp0.venv
  %PY% -m venv .venv || goto :fail
)
.venv\Scripts\python -m pip install --upgrade -r requirements.txt || goto :fail
if not exist models mkdir models
set G=https://storage.googleapis.com/mediapipe-models
for %%M in (pose_landmarker/pose_landmarker_heavy pose_landmarker/pose_landmarker_full hand_landmarker/hand_landmarker face_landmarker/face_landmarker holistic_landmarker/holistic_landmarker) do (
  for %%F in (%%~nxM) do (
    if not exist models\%%F.task (
      echo Downloading %%F.task
      curl -sfL -o models\%%F.task %G%/%%M/float16/latest/%%F.task || goto :fail
    )
  )
)
echo.
echo Setup finished. Drag a video onto track.bat, or run:  track.bat "path\to\video.mp4"
pause
exit /b 0
:fail
echo.
echo Setup failed. Check the internet connection and that Python is installed, then run this again.
pause
exit /b 1
