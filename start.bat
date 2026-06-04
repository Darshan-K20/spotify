@echo off
title Darshtify Launcher
echo --------------------------------------------------
echo           Darshtify Web Player
echo --------------------------------------------------
echo Checking server requirements...
echo.

:: Try to launch with Node/npx (since Node.js is verified)
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Node.js found. Starting server via npx http-server...
    echo Serving files on http://localhost:8000
    start cmd /c "npx --yes http-server -p 8000 -c-1"
    timeout /t 3 >nul
    start http://localhost:8000
    exit
)

:: Fallback to Python
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Python found. Starting server via python http.server...
    echo Serving files on http://localhost:8000
    start cmd /c "python -m http.server 8000"
    timeout /t 3 >nul
    start http://localhost:8000
    exit
)

echo.
echo ERROR: Neither Node.js nor Python was found on your PATH.
echo Please open index.html directly in a browser, or install Node.js/Python to run local servers.
pause
