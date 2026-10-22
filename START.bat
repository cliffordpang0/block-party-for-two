@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 20 or newer is required. Install the LTS version from https://nodejs.org
 pause
 exit /b 1
)
node launch.mjs
pause
