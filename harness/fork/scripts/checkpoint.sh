#!/usr/bin/env bash
# checkpoint.sh <name> — capture a named, coherent checkpoint of the E2E board state:
#   - anvil chain delta via anvil_dumpState RPC (touched-state + mined blocks; no restart)
#   - the app database (pg_dump)
#   - block height + timestamp metadata for restore-time verification
#   - the graph-node database (pg_dump, zstd) — fork-subgraph state AT THE SAME MOMENT as the
#     chain dump, because a regraft-and-reindex restore is impossible: graph-node's mappings make
#     historical eth_calls and anvil 1.7.1's dumpState never serializes historical states (even
#     with --preserve-historical-states), so a state-loaded anvil only serves its head.
#
# Take checkpoints at a QUIESCENT moment: no playwright running, fork subgraph caught up to the
# anvil head, and BEFORE any permanent time jump (borrower-ops' BOP-14) so restored state stays
# wall-clock aligned. Typical use: after market-creation + ceremony/deposit setups → `prepped`.
source "$(dirname "$0")/lib.sh"

name="${1:-}"; [ -n "$name" ] || fail "usage: checkpoint.sh <name>"
[[ "$name" =~ ^[A-Za-z0-9._-]+$ ]] || fail "name must be [A-Za-z0-9._-]+"
CKPT_DIR="${CHECKPOINT_DIR:-$HERE/checkpoints}/$name"
mkdir -p "$CKPT_DIR"

pgrep -f "playwright test" >/dev/null && fail "a playwright run is active — checkpoint only when quiescent"

head_hex=$(rpc "$FORK_RPC" eth_blockNumber '[]'); head=$(hex2dec "$head_hex")
ts_hex=$(curl -sf -X POST -H 'content-type: application/json' "$FORK_RPC" \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_getBlockByNumber","params":["latest",false]}' | jq -r .result.timestamp)
ts=$(hex2dec "$ts_hex")
# COHERENCE: the graph dump must describe the SAME chain moment as the anvil dump — restore
# cannot re-index (no regraft path), so a lagging subgraph at capture time is permanent.
# Wait for BOTH variants' fork subgraphs to reach the head; fail if they cannot.
MAIN_FORK_GQL="http://127.0.0.1:18100/subgraphs/name/wildcat-sepolia-fork-v218"
for gql_url in "$FORK_GQL" "$MAIN_FORK_GQL"; do
  for i in $(seq 1 60); do
    at=$(meta_block "$gql_url" 2>/dev/null || echo 0)
    [ "$at" -ge "$head" ] && break
    sleep 2
  done
  at=$(meta_block "$gql_url" 2>/dev/null || echo 0)
  if [ "$at" -lt "$head" ]; then
    if [ "$gql_url" = "$MAIN_FORK_GQL" ] && [ "$at" = 0 ]; then
      log "main-variant fork subgraph absent — checkpoint covers the v2.5 variant only"
    else
      fail "$gql_url stuck at $at < anvil head $head — a checkpoint taken now could never restore coherently"
    fi
  fi
done

log "dumping anvil state at block $head (ts $ts)"
curl -sf -X POST -H 'content-type: application/json' "$FORK_RPC" \
  --data '{"jsonrpc":"2.0","id":1,"method":"anvil_dumpState","params":[]}' \
  | jq -er .result > "$CKPT_DIR/anvil-state.hex" || fail "anvil_dumpState failed"
[ -s "$CKPT_DIR/anvil-state.hex" ] || fail "empty anvil state dump"

log "dumping app database"
dc exec -T postgres-app pg_dump -U wildcat --no-owner --no-privileges --format=custom wildcat_fork \
  > "$CKPT_DIR/appdb.dump" || fail "app db pg_dump failed"
[ -s "$CKPT_DIR/appdb.dump" ] || fail "empty app db dump"

log "dumping graph database (fork-subgraph state; zstd)"
dc exec -T postgres-graph pg_dump -U graph-node --format=custom --compress=zstd:3 graph-node \
  > "$CKPT_DIR/graphdb.dump" || fail "graph db pg_dump failed"
[ -s "$CKPT_DIR/graphdb.dump" ] || fail "empty graph db dump"

head_after=$(hex2dec "$(rpc "$FORK_RPC" eth_blockNumber '[]')")
[ "$head_after" = "$head" ] || fail "chain advanced during capture ($head -> $head_after) — a transaction landed mid-dump; re-run when quiescent"

jq -n --arg name "$name" --argjson block "$head" --argjson timestamp "$ts" \
      --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg anvilSha "$(sha256sum "$CKPT_DIR/anvil-state.hex" | awk '{print $1}')" \
      --arg dbSha "$(sha256sum "$CKPT_DIR/appdb.dump" | awk '{print $1}')" \
      --arg graphSha "$(sha256sum "$CKPT_DIR/graphdb.dump" | awk '{print $1}')" \
      --argjson forkBlock "$FORK_BLOCK" \
      '{name:$name, block:$block, timestamp:$timestamp, takenAt:$at, forkBlock:$forkBlock, anvilSha:$anvilSha, dbSha:$dbSha, graphSha:$graphSha}' \
  > "$CKPT_DIR/meta.json"
pass "checkpoint '$name' at block $head: $(du -sh "$CKPT_DIR" | cut -f1) in $CKPT_DIR"
