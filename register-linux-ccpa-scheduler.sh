#!/usr/bin/env bash
set -euo pipefail

# Linux equivalent of register-ccpa-scheduler.ps1
# Registers cron: Monday, Wednesday, Friday at 11:30 AM IST

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
RUNNER="$PROJECT_ROOT/run-linux-ccpa-scheduler.sh"
MARKER="# FLM_CCPA_SCHEDULER"
CRON_LINE="30 11 * * 1,3,5 $RUNNER"

chmod +x "$RUNNER"

if ! command -v crontab >/dev/null 2>&1; then
  echo "crontab is not installed. Install cron, then run this script again."
  exit 1
fi

EXISTING="$(crontab -l 2>/dev/null || true)"
FILTERED="$(printf '%s\n' "$EXISTING" | grep -v "FLM_CCPA_SCHEDULER" | grep -v "run-linux-ccpa-scheduler.sh" || true)"
HAS_TZ="$(printf '%s\n' "$FILTERED" | grep -c "^CRON_TZ=Asia/Kolkata" || true)"

{
  printf '%s\n' "$FILTERED"
  if [[ "$HAS_TZ" -eq 0 ]]; then
    echo "CRON_TZ=Asia/Kolkata"
  fi
  echo "$MARKER"
  echo "$CRON_LINE"
} | crontab -

echo "Registered Linux cron: Playwright CCPA scheduler"
echo "Schedule: Monday, Wednesday, Friday at 11:30 AM IST"
echo "Command: $CRON_LINE"
echo
crontab -l
