@echo off
setlocal enabledelayedexpansion

:: =====================================================
:: CCPA AUTOMATION - MASTER RECURRING RUNNER
:: =====================================================

set PROJECT_ROOT=c:\Users\Deepali_Londhe\Desktop\New Tracking URL
set LOG_DIR=%PROJECT_ROOT%\logs\ccpa_scheduler
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set RUN_LOG=%LOG_DIR%\ccpa_run_%TIMESTAMP%.log

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ===================================================== > "%RUN_LOG%"
echo CCPA SCHEDULER STARTED AT: %date% %time% >> "%RUN_LOG%"
echo ===================================================== >> "%RUN_LOG%"

cd /d "%PROJECT_ROOT%"

echo Running CCPA scheduled run...
echo Running CCPA scheduled run... >> "%RUN_LOG%"
powershell -Command "& 'C:\Program Files\nodejs\node.exe' ccpa-scheduler.js 2>&1 | Tee-Object -FilePath '%RUN_LOG%' -Append"

echo ===================================================== >> "%RUN_LOG%"
echo CCPA SCHEDULER FINISHED AT: %date% %time% >> "%RUN_LOG%"
echo ===================================================== >> "%RUN_LOG%"

endlocal
