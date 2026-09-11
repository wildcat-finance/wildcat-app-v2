#!/usr/bin/env bash
# Restore the graph-node postgres database from graph-snapshot.sh's dump — replaces a multi-hour
# upstream resync of every subgraph with a local restore. DESTRUCTIVE: drops the live graph-node
# database (all subgraphs, primary and fork). Requires --yes.
#
# After a restore the fork subgraph's contents reflect the anvil state AT SNAPSHOT TIME; if anvil
# has moved past it (or was reset), run fork-destroy.sh + fork-create.sh afterwards to regraft —
# still cheap, the graft base (the primary) is what this restore makes instantly available.
source "$(dirname "$0")/lib.sh"

[ "${1:-}" = "--yes" ] || fail "this DROPS the live graph-node database (all subgraphs); run with --yes"
OUT_DIR="${GRAPH_DB_SNAPSHOT_DIR:-$HERE/graph-snapshots}"
OUT="$OUT_DIR/graph-node.dump"
[ -s "$OUT" ] || fail "no snapshot at $OUT (run graph-snapshot.sh first)"
sum_expect=$(cat "$OUT.sha256" 2>/dev/null || true)
if [ -n "$sum_expect" ]; then
  sum=$(sha256sum "$OUT" | awk '{print $1}')
  [ "$sum" = "$sum_expect" ] || fail "snapshot checksum mismatch: $sum != $sum_expect"
fi

dc ps --format '{{.Service}} {{.State}}' | grep -q '^postgres-graph running$' \
  || fail "postgres-graph is not running"

log "stopping graph-node containers"
dc stop graph-node-primary graph-node-fork >/dev/null

log "dropping and recreating the graph-node database"
dc exec -T postgres-graph psql -U graph-node -d postgres -q -v ON_ERROR_STOP=1 -c \
  "select pg_terminate_backend(pid) from pg_stat_activity where datname='graph-node' and pid <> pg_backend_pid()" >/dev/null
dc exec -T postgres-graph psql -U graph-node -d postgres -q -v ON_ERROR_STOP=1 -c "drop database if exists \"graph-node\"" >/dev/null
dc exec -T postgres-graph psql -U graph-node -d postgres -q -v ON_ERROR_STOP=1 -c "create database \"graph-node\"" >/dev/null

log "restoring $(du -h "$OUT" | cut -f1) (this takes a few minutes)"
dc exec -T postgres-graph pg_restore -U graph-node -d graph-node --no-owner --no-privileges < "$OUT" \
  || fail "pg_restore failed"

log "starting graph-node containers"
dc up -d graph-node-primary graph-node-fork >/dev/null
sleep 10
curl -s -X POST "$PRIMARY_STATUS" -H 'content-type: application/json' \
  -d '{"query":"{ indexingStatuses { subgraph synced health } }"}' | jq -c .data 2>/dev/null || true
pass "graph database restored from $OUT — verify with status.sh; regraft the fork if anvil moved"
