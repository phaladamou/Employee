#!/usr/bin/env bash
set -euo pipefail

# local employee — 72-hour soak test runner
# Usage: ./scripts/soak-test.sh [duration_hours] [db_path]

DURATION_HOURS=${1:-72}
DB_PATH=${2:-./data/employee.db}
CHECK_INTERVAL=300  # 5 minutes
LOG_FILE="soak-test-$(date +%Y%m%d%H%M%S).log"
employee_PID=""
INITIAL_RSS=0
INITIAL_DB_SIZE=0
ERROR_COUNT=0
CHECK_COUNT=0

log() {
  local msg="[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"
  echo "$msg" | tee -a "$LOG_FILE"
}

cleanup() {
  log "Received termination signal, shutting down..."
  if [[ -n "$employee_PID" ]] && kill -0 "$employee_PID" 2>/dev/null; then
    kill "$employee_PID" 2>/dev/null || true
    wait "$employee_PID" 2>/dev/null || true
  fi
  summarize
  exit 0
}

trap cleanup SIGTERM SIGINT SIGHUP

get_rss_kb() {
  if [[ -n "$employee_PID" ]] && kill -0 "$employee_PID" 2>/dev/null; then
    ps -o rss= -p "$employee_PID" 2>/dev/null | tr -d ' ' || echo "0"
  else
    echo "0"
  fi
}

get_file_size() {
  local path="$1"
  if [[ -f "$path" ]]; then
    stat -f%z "$path" 2>/dev/null || stat -c%s "$path" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

count_errors() {
  if [[ -f "$LOG_FILE" ]]; then
    grep -c '"level":"error"\|"level":"fatal"\|ERROR\|FATAL' "$LOG_FILE" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

summarize() {
  local final_rss
  final_rss=$(get_rss_kb)
  local final_db_size
  final_db_size=$(get_file_size "$DB_PATH")
  local final_wal_size
  final_wal_size=$(get_file_size "${DB_PATH}-wal")
  local final_errors
  final_errors=$(count_errors)

  log "=========================================="
  log "SOAK TEST SUMMARY"
  log "=========================================="
  log "Duration planned:  ${DURATION_HOURS}h"
  log "Checks completed:  ${CHECK_COUNT}"
  log "Initial RSS (KB):  ${INITIAL_RSS}"
  log "Final RSS (KB):    ${final_rss}"
  log "Initial DB size:   ${INITIAL_DB_SIZE}"
  log "Final DB size:     ${final_db_size}"
  log "Final WAL size:    ${final_wal_size}"
  log "Total errors:      ${final_errors}"
  log "=========================================="

  local exit_code=0

  # Check memory growth (fail if > 2x initial)
  if [[ "$INITIAL_RSS" -gt 0 && "$final_rss" -gt 0 ]]; then
    local mem_ratio=$((final_rss / INITIAL_RSS))
    if [[ "$mem_ratio" -ge 2 ]]; then
      log "FAIL: Memory grew ${mem_ratio}x (threshold: 2x)"
      exit_code=1
    else
      log "PASS: Memory growth ${mem_ratio}x within bounds"
    fi
  fi

  # Check DB growth (fail if > 100x initial)
  if [[ "$INITIAL_DB_SIZE" -gt 0 && "$final_db_size" -gt 0 ]]; then
    local db_ratio=$((final_db_size / INITIAL_DB_SIZE))
    if [[ "$db_ratio" -ge 100 ]]; then
      log "FAIL: DB grew ${db_ratio}x (threshold: 100x)"
      exit_code=1
    else
      log "PASS: DB growth ${db_ratio}x within bounds"
    fi
  fi

  # Check error rate (fail if > 5% of checks)
  if [[ "$CHECK_COUNT" -gt 0 ]]; then
    local error_pct=$((final_errors * 100 / CHECK_COUNT))
    if [[ "$error_pct" -gt 5 ]]; then
      log "FAIL: Error rate ${error_pct}% (threshold: 5%)"
      exit_code=1
    else
      log "PASS: Error rate ${error_pct}% within bounds"
    fi
  fi

  return $exit_code
}

# Main
log "Starting soak test: duration=${DURATION_HOURS}h, db=${DB_PATH}, interval=${CHECK_INTERVAL}s"

# Start employee in background
NODE_ENV=test node dist/index.js >> "$LOG_FILE" 2>&1 &
employee_PID=$!
log "Started employee process (PID: ${employee_PID})"

# Wait for process to initialize
sleep 5

if ! kill -0 "$employee_PID" 2>/dev/null; then
  log "ERROR: employee process failed to start"
  exit 1
fi

# Capture initial metrics
INITIAL_RSS=$(get_rss_kb)
INITIAL_DB_SIZE=$(get_file_size "$DB_PATH")
log "Initial metrics: RSS=${INITIAL_RSS}KB, DB=${INITIAL_DB_SIZE} bytes"

# Calculate end time
END_TIME=$(($(date +%s) + DURATION_HOURS * 3600))

# Monitoring loop
while [[ $(date +%s) -lt $END_TIME ]]; do
  if ! kill -0 "$employee_PID" 2>/dev/null; then
    log "ERROR: employee process died unexpectedly"
    summarize
    exit 1
  fi

  CHECK_COUNT=$((CHECK_COUNT + 1))
  local_rss=$(get_rss_kb)
  local_db_size=$(get_file_size "$DB_PATH")
  local_wal_size=$(get_file_size "${DB_PATH}-wal")
  local_errors=$(count_errors)

  log "Check #${CHECK_COUNT}: RSS=${local_rss}KB, DB=${local_db_size}B, WAL=${local_wal_size}B, errors=${local_errors}"

  sleep "$CHECK_INTERVAL"
done

log "Soak test duration complete, stopping employee..."
kill "$employee_PID" 2>/dev/null || true
wait "$employee_PID" 2>/dev/null || true

summarize


