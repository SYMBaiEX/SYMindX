#!/bin/sh
# Read an explicitly selected local v0.1 health endpoint.
set -eu
[ "$#" -eq 1 ] || { echo 'Usage: scripts/health-check.sh http://127.0.0.1:8000' >&2; exit 2; }
url="$1"
case "$url" in
  http://127.0.0.1:*|http://localhost:*|http://\[::1\]:*) ;;
  *) echo 'Expected a loopback HTTP origin with an explicit port.' >&2; exit 2 ;;
esac
# Reject paths, credentials, query strings and shell-like suffixes.
origin="${url#http://}"
port="${origin##*:}"
authority="${origin%:*}"
case "$authority" in 127.0.0.1|localhost|\[::1\]) ;; *) echo "Invalid loopback authority." >&2; exit 2 ;; esac
[ "${#port}" -le 5 ] || { echo "Invalid port." >&2; exit 2; }
case "$port" in ''|*[!0-9]*) echo 'Invalid port.' >&2; exit 2 ;; esac
[ "$port" -ge 1 ] && [ "$port" -le 65535 ] || { echo 'Invalid port.' >&2; exit 2; }
curl --fail --silent --show-error --max-time 3 --noproxy '*' "$url/health"
printf '\n'
