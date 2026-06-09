@echo off
setlocal enabledelayedexpansion

:: =====================================================
:: PLAYWRIGHT AUTOMATION - MASTER RECURRING RUNNER
:: =====================================================

set PROJECT_ROOT=c:\Users\Deepali_Londhe\Desktop\New Tracking URL
set LOG_DIR=%PROJECT_ROOT%\logs\scheduler
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set RUN_LOG=%LOG_DIR%\scheduler_run_%TIMESTAMP%.log

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ===================================================== > "%RUN_LOG%"
echo SCHEDULER STARTED AT: %date% %time% >> "%RUN_LOG%"
echo ===================================================== >> "%RUN_LOG%"

cd /d "%PROJECT_ROOT%"

:: Global Cleanup - Skipped to prevent closing user's open browsers
:: taskkill /F /IM chromedriver.exe /T >nul 2>&1
:: taskkill /F /IM chrome.exe /T >nul 2>&1
:: taskkill /F /IM msedgedriver.exe /T >nul 2>&1
:: taskkill /F /IM msedge.exe /T >nul 2>&1

:: Run the Playwright Scheduler once and exit
echo Running Playwright batch scheduler...
echo Running Playwright batch scheduler... >> "%RUN_LOG%"
powershell -Command "& 'C:\Program Files\nodejs\node.exe' scheduler.js --once 2>&1 | Tee-Object -FilePath '%RUN_LOG%' -Append"

echo ===================================================== >> "%RUN_LOG%"
echo SCHEDULER FINISHED AT: %date% %time% >> "%RUN_LOG%"
echo ===================================================== >> "%RUN_LOG%"

endlocal
