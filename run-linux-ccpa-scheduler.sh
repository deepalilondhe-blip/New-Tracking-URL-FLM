#!/usr/bin/env bash
set -euo pipefail

# Linux equivalent of run-ccpa-scheduler.bat
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/ccpa_scheduler"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RUN_LOG="$LOG_DIR/ccpa_run_${TIMESTAMP}.log"
NODE_BIN="$(command -v node)"

mkdir -p "$LOG_DIR"
cd "$PROJECT_ROOT"

{
  echo "====================================================="
  echo "CCPA SCHEDULER STARTED AT: $(date)"
  echo "====================================================="
} | tee "$RUN_LOG"

echo "Running CCPA scheduled run..." | tee -a "$RUN_LOG"
set +e
"$NODE_BIN" ccpa-scheduler.js 2>&1 | tee -a "$RUN_LOG"
STATUS=${PIPESTATUS[0]}
set -e

{
  echo "====================================================="
  echo "CCPA SCHEDULER FINISHED AT: $(date)"
  echo "====================================================="
} | tee -a "$RUN_LOG"

exit "$STATUS"
