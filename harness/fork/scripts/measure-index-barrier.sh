#!/usr/bin/env bash
# Measure the mine→indexed round-trip the suites pay at every syncSubgraph() barrier:
# mines one empty block, then polls the fork subgraph _meta until it reports that head.
# Run a few times; ~30s = the chain-head watcher poll fallback, ~1-3s = healthy notify path.
source "$(dirname "$0")/lib.sh"
for i in $(seq 1 "${1:-3}"); do
  rpc "$FORK_RPC" evm_mine '[]' >/dev/null
  head=$(hex2dec "$(rpc "$FORK_RPC" eth_blockNumber '[]')")
  t0=$(date +%s.%N)
  while [ "$(meta_block "$FORK_GQL" 2>/dev/null || echo 0)" -lt "$head" ]; do sleep 0.2; done
  t1=$(date +%s.%N)
  echo "barrier $i: block $head indexed in $(echo "$t1 $t0" | awk '{printf "%.1fs", $1-$2}')"
done
