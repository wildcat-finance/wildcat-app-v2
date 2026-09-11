#!/usr/bin/env bash
# db-exec.sh <sql>  — run a statement against the harness app DB (wildcat_fork). Test fixtures only.
source "$(dirname "$0")/lib.sh"
[ -n "${1:-}" ] || fail "usage: db-exec.sh <sql>"
docker exec -i wildcat-fork-postgres-app-1 psql -U wildcat -d wildcat_fork -tA -v ON_ERROR_STOP=1 -c "$1"
