@echo off
REM ===========================================================
REM FLM Agent - Cake Test Only Validation Script Launcher
REM ===========================================================
REM
REM This script runs the INDEPENDENT Test Only validation
REM DO NOT modify the existing cake.js (Test & Non-Test process)
REM ===========================================================

echo.
echo ===========================================================
echo FLM Agent - Cake Test Only Validation Process
echo ===========================================================
echo.
echo Script: cake_test_only.js (INDEPENDENT)
echo Purpose: Validate Test Only conversion records
echo Status: ISOLATED - Does not affect existing cake.js process
echo.
echo ===========================================================
echo.

REM Navigate to the project directory
cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js first
    pause
    exit /b 1
)

REM Run the Test Only validation script with headed browser (visible)
echo Starting Test Only validation process...
echo.

node CakeProcess.js\cake_test_only.js --headed

echo.
echo ===========================================================
echo Process completed. Check the CakeProcess.js folder for:
echo  - test_only_reports\       (JSON reports and logs)
echo  - test_only_screenshots\   (Screenshots of validation)
echo ===========================================================
echo.

pause
