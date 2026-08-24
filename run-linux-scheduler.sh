#!/usr/bin/env bash
set -euo pipefail

# Linux equivalent of run-local-scheduler.bat
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/scheduler"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RUN_LOG="$LOG_DIR/scheduler_run_${TIMESTAMP}.log"
NODE_BIN="$(command -v node)"

mkdir -p "$LOG_DIR"
cd "$PROJECT_ROOT"

{
  echo "====================================================="
  echo "SCHEDULER STARTED AT: $(date)"
  echo "====================================================="
} | tee "$RUN_LOG"

if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
  echo "ERROR: .env is missing." | tee -a "$RUN_LOG"
  exit 1
fi

if [[ ! -f "$PROJECT_ROOT/service_account.json" ]]; then
  echo "ERROR: service_account.json is missing." | tee -a "$RUN_LOG"
  exit 1
fi

export CI="${CI:-true}"
export HEADLESS="${HEADLESS:-true}"

echo "Running Playwright batch scheduler..." | tee -a "$RUN_LOG"
set +e
"$NODE_BIN" scheduler.js --once --headless 2>&1 | tee -a "$RUN_LOG"
STATUS=${PIPESTATUS[0]}
set -e

{
  echo "====================================================="
  echo "SCHEDULER FINISHED AT: $(date)"
  echo "====================================================="
} | tee -a "$RUN_LOG"

exit "$STATUS"
