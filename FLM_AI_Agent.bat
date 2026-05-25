@echo off
echo =====================================================
echo Starting FLM AI Agent Server...
echo =====================================================

:: Check if server is already running on port 3000
netstat -ano | find "3000" > nul
if errorlevel 1 (
    echo Starting Dashboard Server in the background...
    cd /d "c:\Users\Deepali_Londhe\Desktop\New Tracking URL"
    start /min node utils\dashboardServer.js
    :: Wait a few seconds for the server to initialize
    timeout /t 3 > nul
) else (
    echo Server is already running.
)

echo Opening FLM Agent...
start "FLM Agent" http://localhost:3000/chat
exit
