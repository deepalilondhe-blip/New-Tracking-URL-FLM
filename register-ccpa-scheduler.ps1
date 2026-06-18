# PowerShell script to register the Windows Scheduled Task for the Playwright CCPA Automation Scheduler
# Runs weekly on Monday, Wednesday, and Friday at 11:30 AM.

$TaskName = "Playwright_CCPA_Scheduler"
$BatchPath = "c:\Users\Deepali_Londhe\Desktop\New Tracking URL\run-ccpa-scheduler.bat"
$WorkDir = "c:\Users\Deepali_Londhe\Desktop\New Tracking URL"

# 1. Define the action to run the batch script
$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchPath`"" -WorkingDirectory $WorkDir

# 2. Define recurring triggers that run on Monday, Wednesday, and Friday at 11:30 AM
$Trigger1 = New-ScheduledTaskTrigger -Weekly -DaysOfWeek @('Monday', 'Wednesday', 'Friday') -At "11:30 AM"
$Triggers = @($Trigger1)

# 3. Define task settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -WakeToRun `
    -StartWhenAvailable `
    -RestartInterval (New-TimeSpan -Minutes 15) `
    -RestartCount 3

# 4. Check if the task already exists, and if so, unregister it first
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "Found existing scheduled task '$TaskName'. Unregistering..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# 5. Register the scheduled task under the current user context
Write-Host "Registering scheduled task '$TaskName' to run Weekly (Mon, Wed, Fri) at 11:30 AM..." -ForegroundColor Green

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Triggers -Settings $Settings

$NextRun = (Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo).NextRunTime
Write-Host "First execution scheduled for: $NextRun" -ForegroundColor Green
