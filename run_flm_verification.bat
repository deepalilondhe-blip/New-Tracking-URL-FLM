@echo off
REM FLM Agent - Cake Verification Process Runner

echo =============================================
echo FLM Agent - Cake Verification Process
echo =============================================
echo.

REM Navigate to the project directory
cd /d "%~dp0"

REM Run the verification script with headed browser (visible)
node CakeProcess.js\cake_verification.js --headed

REM Pause to keep window open
pause
