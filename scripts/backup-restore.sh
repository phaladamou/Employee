#!/usr/bin/env bash
set -euo pipefail

# local employee — Database backup/restore tooling
# Usage: ./scripts/backup-restore.sh <backup|restore|verify> [options]

SQLITE3="${SQLITE3:-sqlite3}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [options]

Commands:
  backup  <db_path> [backup_path]   Checkpoint WAL and create atomic backup
  restore <backup_path> <db_path>   Restore database from backup
  verify  <db_path>                 Verify database integrity

Examples:
  $(basename "$0") backup ./data/employee.db
  $(basename "$0") backup ./data/employee.db ./backups/employee-2024.db
  $(basename "$0") restore ./backups/employee-2024.db ./data/employee.db
  $(basename "$0") verify ./data/employee.db
EOF
  exit 1
}

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"
}

verify_integrity() {
  local db="$1"
  if [[ ! -f "$db" ]]; then
    log "ERROR: Database file not found: $db"
    return 1
  fi

  local result
  result=$($SQLITE3 "$db" "PRAGMA integrity_check;" 2>&1)
  if [[ "$result" == "ok" ]]; then
    log "Integrity check passed: $db"
    return 0
  else
    log "ERROR: Integrity check failed for $db"
    log "Result: $result"
    return 1
  fi
}

do_backup() {
  local db_path="${1:?Missing db_path}"
  local backup_path="${2:-}"

  if [[ ! -f "$db_path" ]]; then
    log "ERROR: Source database not found: $db_path"
    exit 1
  fi

  # Generate default backup path if not provided
  if [[ -z "$backup_path" ]]; then
    local dir
    dir=$(dirname "$db_path")
    local base
    base=$(basename "$db_path" .db)
    backup_path="${dir}/${base}-backup-$(date +%Y%m%d%H%M%S).db"
  fi

  log "Starting backup: $db_path -> $backup_path"

  # Checkpoint WAL to merge all changes into main DB file
  log "Checkpointing WAL..."
  $SQLITE3 "$db_path" "PRAGMA wal_checkpoint(TRUNCATE);" 2>&1 || {
    log "WARNING: WAL checkpoint returned non-zero (DB may be locked). Proceeding with copy."
  }

  # Atomic copy
  log "Copying database..."
  cp "$db_path" "$backup_path"

  # Copy WAL and SHM if they exist (in case checkpoint didn't fully truncate)
  if [[ -f "${db_path}-wal" ]]; then
    cp "${db_path}-wal" "${backup_path}-wal"
  fi
  if [[ -f "${db_path}-shm" ]]; then
    cp "${db_path}-shm" "${backup_path}-shm"
  fi

  # Verify backup integrity
  log "Verifying backup..."
  if verify_integrity "$backup_path"; then
    log "Backup complete: $backup_path"
  else
    log "ERROR: Backup verification failed. Removing corrupted backup."
    rm -f "$backup_path" "${backup_path}-wal" "${backup_path}-shm"
    exit 1
  fi
}

do_restore() {
  local backup_path="${1:?Missing backup_path}"
  local db_path="${2:?Missing target db_path}"

  if [[ ! -f "$backup_path" ]]; then
    log "ERROR: Backup file not found: $backup_path"
    exit 1
  fi

  # Verify backup integrity before restoring
  log "Verifying backup integrity..."
  if ! verify_integrity "$backup_path"; then
    log "ERROR: Backup file failed integrity check. Aborting restore."
    exit 1
  fi

  # Create backup of current DB if it exists
  if [[ -f "$db_path" ]]; then
    local pre_restore="${db_path}.pre-restore.$(date +%s)"
    log "Backing up existing database to $pre_restore"
    cp "$db_path" "$pre_restore"
  fi

  # Restore
  log "Restoring: $backup_path -> $db_path"
  cp "$backup_path" "$db_path"

  # Copy WAL and SHM if they exist in backup
  if [[ -f "${backup_path}-wal" ]]; then
    cp "${backup_path}-wal" "${db_path}-wal"
  else
    rm -f "${db_path}-wal"
  fi
  if [[ -f "${backup_path}-shm" ]]; then
    cp "${backup_path}-shm" "${db_path}-shm"
  else
    rm -f "${db_path}-shm"
  fi

  # Verify restored database
  log "Verifying restored database..."
  if verify_integrity "$db_path"; then
    log "Restore complete: $db_path"
  else
    log "ERROR: Restored database failed integrity check."
    exit 1
  fi
}

# Main
if [[ $# -lt 1 ]]; then
  usage
fi

COMMAND="$1"
shift

case "$COMMAND" in
  backup)
    do_backup "$@"
    ;;
  restore)
    do_restore "$@"
    ;;
  verify)
    verify_integrity "${1:?Missing db_path}"
    ;;
  *)
    log "ERROR: Unknown command: $COMMAND"
    usage
    ;;
esac


