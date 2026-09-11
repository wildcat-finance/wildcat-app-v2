#!/usr/bin/env bash
# restore.sh <name> — restore a checkpoint taken by checkpoint.sh: the anvil chain (fresh fork at
# the pin + anvil_loadState of the dumped delta), the app database (pg_restore), and the GRAPH
# database (pg_restore of the checkpoint's own dump — both variants' fork subgraphs at the same
# moment as the chain; regraft-and-reindex is impossible against a state-loaded anvil, which
# serves no historical state).
#
# SCOPE (measured 2026-09-08): restores DATA — reports, DBs, indexed state — for inspection and
# recovery. It does NOT produce an app-drivable environment: a state-loaded anvil serves no
# pre-restore historical eth_call, and the app's lens reads anchor to subgraph blocks, so
# app-driving hangs on BlockOutOfRangeError. Suites need reset.sh + the fixtures project.
#
# DESTRUCTIVE for current E2E state (chain, fork subgraphs, app db). The primaries, chain caches
# and rpc-cache are untouched.
source "$(dirname "$0")/lib.sh"

name="${1:-}"; [ -n "$name" ] || fail "usage: restore.sh <name>"
CKPT_DIR="${CHECKPOINT_DIR:-$HERE/checkpoints}/$name"
[ -f "$CKPT_DIR/meta.json" ] || fail "no checkpoint at $CKPT_DIR"
pgrep -f "playwright test" >/dev/null && fail "a playwright run is active — restore only when quiescent"

# PREFLIGHT: every required file, checksum and compatibility check happens BEFORE the first
# service mutation — a restore that aborts halfway leaves chain and databases describing
# different histories (it happened; see STATUS 2026-09-07).
block=$(jq -er .block "$CKPT_DIR/meta.json")
ts=$(jq -er .timestamp "$CKPT_DIR/meta.json")
[ -s "$CKPT_DIR/anvil-state.hex" ] || fail "missing anvil-state.hex"
[ -s "$CKPT_DIR/appdb.dump" ] || fail "missing appdb.dump"
[ -s "$CKPT_DIR/graphdb.dump" ] || fail "checkpoint has no graphdb.dump — pre-rework checkpoints cannot restore (regraft against a state-loaded anvil is impossible; re-take with the current checkpoint.sh)"
[ "$(jq -er .anvilSha "$CKPT_DIR/meta.json")" = "$(sha256sum "$CKPT_DIR/anvil-state.hex" | awk '{print $1}')" ] || fail "anvil-state.hex checksum mismatch"
[ "$(jq -er .dbSha "$CKPT_DIR/meta.json")" = "$(sha256sum "$CKPT_DIR/appdb.dump" | awk '{print $1}')" ] || fail "appdb.dump checksum mismatch"
[ "$(jq -er .graphSha "$CKPT_DIR/meta.json")" = "$(sha256sum "$CKPT_DIR/graphdb.dump" | awk '{print $1}')" ] || fail "graphdb.dump checksum mismatch (or meta lacks graphSha — pre-rework checkpoint)"
ckpt_pin=$(jq -r '.forkBlock // empty' "$CKPT_DIR/meta.json")
if [ -n "$ckpt_pin" ] && [ "$ckpt_pin" != "$FORK_BLOCK" ]; then
  fail "checkpoint was taken on fork pin $ckpt_pin but pins.json says $FORK_BLOCK — refusing"
fi
log "preflight ok; restoring checkpoint '$name' (block $block, ts $ts)"

log "stopping graph-node ingestion before the chain is replaced"
dc stop graph-node-primary graph-node-fork >/dev/null

log "recreating anvil at the pin (warm via rpc-cache)"
dc rm -sf anvil-fork >/dev/null 2>&1 || true
dc up -d anvil-fork >/dev/null
for i in $(seq 1 120); do
  rpc "$FORK_RPC" eth_chainId '[]' >/dev/null 2>&1 && break; sleep 2
done
[ "$(rpc "$FORK_RPC" eth_chainId '[]')" = 0xaa36a7 ] || fail "anvil not answering after recreate"

log "loading checkpoint state into anvil"
jq -Rs '{jsonrpc:"2.0",id:1,method:"anvil_loadState",params:[rtrimstr("\n")]}' "$CKPT_DIR/anvil-state.hex" > "$STATE/loadstate-body.json"
out=$(curl -sf -X POST -H 'content-type: application/json' "$FORK_RPC" --data @"$STATE/loadstate-body.json")
rm -f "$STATE/loadstate-body.json"
echo "$out" | jq -e '.result == true' >/dev/null || fail "anvil_loadState failed: $out"
restored=$(anvil_head)
if [ "$restored" -lt "$block" ]; then
  # loadState restored accounts/storage but not the block env: refuse rather than run with
  # mismatched heights (the subgraph would index blocks that never existed).
  fail "anvil head $restored < checkpoint block $block after loadState — block env not restored; investigate (--state file fallback)"
fi
log "anvil restored at block $restored"

# Graph state is restored from the checkpoint's own dump, never regrafted: a regraft would
# re-index the restored blocks, and graph-node's mappings make historical eth_calls that a
# state-loaded anvil cannot serve (anvil 1.7.1 dumpState omits historical states even with
# --preserve-historical-states — measured, not assumed). The dump was taken at the same moment
# as the chain dump, so fork-subgraph state matches the restored chain exactly.
log "restoring graph database (both variants' fork subgraphs + primaries as of the checkpoint)"
dc stop graph-node-primary graph-node-fork >/dev/null
dc exec -T postgres-graph psql -U graph-node -d postgres -q -v ON_ERROR_STOP=1 -c \
  "select pg_terminate_backend(pid) from pg_stat_activity where datname='graph-node' and pid<>pg_backend_pid()" >/dev/null
dc exec -T postgres-graph psql -U graph-node -d postgres -q -v ON_ERROR_STOP=1 -c "drop database if exists \"graph-node\"" >/dev/null
dc exec -T postgres-graph psql -U graph-node -d postgres -q -v ON_ERROR_STOP=1 -c "create database \"graph-node\"" >/dev/null
dc exec -T postgres-graph pg_restore -U graph-node -d graph-node --no-owner --no-privileges < "$CKPT_DIR/graphdb.dump" \
  || fail "graph db pg_restore failed"
dc up -d graph-node-primary graph-node-fork >/dev/null

log "restoring app database"
psql_app "select pg_terminate_backend(pid) from pg_stat_activity where datname='wildcat_fork' and pid<>pg_backend_pid()" >/dev/null
psql_app "drop database if exists wildcat_fork" >/dev/null
psql_app "create database wildcat_fork" >/dev/null
dc exec -T postgres-app pg_restore -U wildcat -d wildcat_fork --no-owner --no-privileges < "$CKPT_DIR/appdb.dump" \
  || fail "app db pg_restore failed"

wait_meta "$FORK_GQL" "$block" 600
for port in 3000 3001; do
  if ss -ltn "sport = :$port" 2>/dev/null | grep -q LISTEN; then
    log "WARNING: an app server is LISTENING on :$port — it holds connection pools to the DROPPED database and will serve pages that hang on DB-backed calls. Restart it."
  fi
done
log "SCOPE (measured 2026-09-08): a state-loaded anvil serves historical eth_call only for blocks AFTER the restore point — pre-restore block anchors (the app's lens reads, subgraph-anchored queries) fail BlockOutOfRange forever. A restored checkpoint is for DATA/REPORT recovery and inspection; it is NOT a substrate for suite runs or app-driving. Rebuild via reset.sh + the fixtures→board projects for that."
pass "checkpoint '$name' restored: anvil @$restored, fork subgraph @$(meta_block "$FORK_GQL"), app db reloaded."
