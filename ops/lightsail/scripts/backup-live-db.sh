#!/usr/bin/env bash
set -euo pipefail

umask 077

backup_dir="/var/lib/giwa/backups"
backup_path=""

on_exit() {
  status=$?
  trap - EXIT
  if [ "$status" -ne 0 ]; then
    case "$backup_path" in
      "$backup_dir"/giwa-live-*.sqlite)
        rm -- "$backup_path" >/dev/null 2>&1 || :
        ;;
    esac
    printf '%s\n' 'backup failed' >&2
  fi
  exit "$status"
}
trap on_exit EXIT

[ -n "${GIWA_LIVE_DB_PATH:-}" ]
[ -f "$GIWA_LIVE_DB_PATH" ]
[ -r "$GIWA_LIVE_DB_PATH" ]
case "$GIWA_LIVE_DB_PATH" in
  /*) ;;
  *) exit 1 ;;
esac
[ -d "$backup_dir" ]
[ -w "$backup_dir" ]
command -v sqlite3 >/dev/null 2>&1

timestamp="$(date -u +%Y%m%dT%H%M%SZ 2>/dev/null)"
backup_path="$(mktemp --tmpdir="$backup_dir" "giwa-live-${timestamp}-XXXXXX.sqlite" 2>/dev/null)"
case "$backup_path" in
  "$backup_dir"/giwa-live-"$timestamp"-??????.sqlite) ;;
  *) exit 1 ;;
esac

sqlite3 "$GIWA_LIVE_DB_PATH" ".backup '$backup_path'" >/dev/null 2>&1
quick_check="$(sqlite3 -batch -noheader "$backup_path" 'PRAGMA quick_check;' 2>/dev/null)"
[ "$quick_check" = "ok" ]

trap - EXIT
printf '%s\n' "$(basename -- "$backup_path")"
