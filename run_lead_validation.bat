@echo off
REM ===========================================================
REM FLM Agent - Lead Validation & CDB Verification Process
REM ===========================================================
REM
REM This script validates Lead IDs across Cake and CDB systems
REM and updates the FML Project dashboard with results
REM
REM ===========================================================

echo.
echo ===========================================================
echo FLM Agent - Lead Validation ^& CDB Verification Process
echo ===========================================================
echo.
echo Process: Cake Lead Validation + CDB Verification
echo Purpose: Validate Lead IDs and update FML Dashboard
echo Status: INDEPENDENT - Isolated from other Cake scripts
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

REM Run the Lead Validation script with headed browser
echo Starting Lead Validation and CDB Verification process...
echo.

node CakeProcess.js\cake_lead_validation.js --headed

echo.
echo ===========================================================
echo Process completed. Check the CakeProcess.js folder for:
echo  - lead_validation_reports\       (JSON reports and logs)
echo  - lead_validation_screenshots\   (Screenshots of validation)
echo ===========================================================
echo.
echo FML Project Dashboard updated in:
echo  - FML_Project_Dashboard\
echo ===========================================================
echo.

pause
