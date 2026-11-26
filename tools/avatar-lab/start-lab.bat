@echo off
rem Starts a small local web server for the Avatar Lab and opens it in the browser.
cd /d "%~dp0"
set PORT=8080
start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%/"
where py >nul 2>nul && (py -m http.server %PORT% & goto :eof)
where python >nul 2>nul && (python -m http.server %PORT% & goto :eof)
where npx >nul 2>nul && (npx --yes http-server -p %PORT% -c-1 & goto :eof)
echo.
echo Could not find Python or Node.js. Install one of them (see README.md), then run this again.
pause
