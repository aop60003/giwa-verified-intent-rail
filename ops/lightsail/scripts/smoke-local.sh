#!/usr/bin/env bash
set -euo pipefail

check() {
  local label="$1"
  local url="$2"
  local marker="$3"
  local body

  if ! body="$(curl --fail --silent --show-error --max-time 8 "$url" 2>/dev/null)"; then
    printf '%s fail\n' "$label"
    return 1
  fi

  case "$body" in
    *"$marker"*)
      printf '%s pass\n' "$label"
      ;;
    *)
      printf '%s fail\n' "$label"
      return 1
      ;;
  esac
}

if ! check "static" "http://127.0.0.1:4176/" "GIWA Verified Intent Rail"; then
  exit 1
fi
if ! check "live" "http://127.0.0.1:4177/user" "user-flow.js"; then
  exit 1
fi
if ! check "healthz" "http://127.0.0.1:4177/healthz" '"ok":true'; then
  exit 1
fi
if ! check "readyz" "http://127.0.0.1:4177/readyz" '"ready":true'; then
  exit 1
fi
if ! check "public-config" "http://127.0.0.1:4177/api/public/config" '"chainId":91342'; then
  exit 1
fi
