# PowerShell script to register the Windows Scheduled Task for the Playwright Lead Automation Scheduler
# Runs daily, repeating every 2 hours indefinitely.

$TaskName = "Playwright_LeadAutomation_Scheduler"
$BatchPath = "c:\Users\Deepali_Londhe\Desktop\New Tracking URL\run-local-scheduler.bat"
$WorkDir = "c:\Users\Deepali_Londhe\Desktop\New Tracking URL"

# 1. Define the action to run the batch script
$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchPath`"" -WorkingDirectory $WorkDir

# 2. Define a recurring trigger that runs on Monday, Wednesday, and Friday
# Starts at 11:00 AM and repeats every 2 hours for that day
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek @('Monday', 'Wednesday', 'Friday') -At "11:00 AM"
$Trigger.Repetition = (New-ScheduledTaskTrigger -Once -At "11:00 AM" -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Hours 24)).Repetition



# 4. Define task settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -WakeToRun `
    -StartWhenAvailable `
    -RestartInterval (New-TimeSpan -Minutes 15) `
    -RestartCount 3

# 5. Check if the task already exists, and if so, unregister it first
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "Found existing scheduled task '$TaskName'. Unregistering..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# 6. Register the scheduled task under the current user context
Write-Host "Registering scheduled task '$TaskName' to run Weekly (Mon, Wed, Fri), repeating every 2 hours..." -ForegroundColor Green

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings

$NextRun = (Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo).NextRunTime
Write-Host "First execution scheduled for: $NextRun" -ForegroundColor Green
