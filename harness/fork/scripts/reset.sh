#!/usr/bin/env bash
# Recreate the disposable parts: anvil fork, fork subgraph (+ chain store), app DB. Primary untouched.
source "$(dirname "$0")/lib.sh"
require_stack_owner
t0=$(date +%s)
dc stop anvil-fork >/dev/null 2>&1 || true          # no provider for the old ingestor while we tear down
"$HERE/scripts/fork-destroy.sh"
dc rm -sf anvil-fork graph-node-fork >/dev/null
dc up -d anvil-fork graph-node-fork >/dev/null
until [ "$(rpc "$FORK_RPC" eth_chainId '[]' 2>/dev/null || true)" = 0xaa36a7 ]; do sleep 2; done
until curl -s "$FORK_ADMIN" >/dev/null; do sleep 2; done; sleep 3
"$HERE/scripts/fork-create.sh"
"$HERE/scripts/db-restore.sh"
"$HERE/scripts/status.sh"
pass "reset complete in $(( $(date +%s) - t0 ))s: fork at $(anvil_head), subgraph at $(meta_block "$FORK_GQL"), db restored"
