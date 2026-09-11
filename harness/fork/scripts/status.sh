#!/usr/bin/env bash
# Prints the harness state. Exit 0 iff everything needed by `next dev` is healthy.
source "$(dirname "$0")/lib.sh"
rc=0
row(){ printf '%-22s %s\n' "$1" "$2"; }
ok(){ row "$1" "ok    $2"; }
bad(){ row "$1" "FAIL  $2"; rc=1; }

for svc in postgres-graph postgres-app ipfs graph-node-primary anvil-fork graph-node-fork; do
  st=$(dc ps --format '{{.Service}} {{.State}}' 2>/dev/null | awk -v s=$svc '$1==s{print $2}')
  [ "$st" = running ] && ok "$svc" running || bad "$svc" "${st:-missing}"
done
cid=$(rpc "$FORK_RPC" eth_chainId '[]' 2>/dev/null || echo none)
[ "$cid" = 0xaa36a7 ] && ok "anvil chainId" "11155111 head=$(anvil_head)" || bad "anvil chainId" "$cid"
# wedge watchdog: a pending tx that does not mine within a few seconds means anvil is stuck (on-demand mining is instant)
pend=$(curl -s -m 5 -X POST -H 'content-type: application/json' "$FORK_RPC" --data '{"jsonrpc":"2.0","id":1,"method":"txpool_status","params":[]}' | jq -r '.result.pending // "?"')
if [ "$pend" = "0x0" ]; then ok "anvil txpool" "empty"; elif [ "$pend" = "?" ]; then bad "anvil txpool" "no answer within 5 s (anvil wedged?)"; else sleep 5; pend2=$(curl -s -m 5 -X POST -H 'content-type: application/json' "$FORK_RPC" --data '{"jsonrpc":"2.0","id":1,"method":"txpool_status","params":[]}' | jq -r '.result.pending // "?"'); [ "$pend2" = "0x0" ] && ok "anvil txpool" "drained" || bad "anvil txpool" "$pend2 pending tx not mining (anvil wedged) — run dev:fork:reset"; fi
pb=$(meta_block "$PRIMARY_GQL" 2>/dev/null || echo 0)
[ "$pb" -ge "$FORK_BLOCK" ] && ok "primary _meta" "$pb (pin $FORK_BLOCK) health=$(sg_health $PRIMARY_STATUS $PRIMARY_NAME)" || bad "primary _meta" "$pb < pin $FORK_BLOCK"
fb=$(meta_block "$FORK_GQL" 2>/dev/null || echo 0)
[ "$fb" -ge "$FORK_BLOCK" ] && ok "fork _meta" "$fb health=$(sg_health $FORK_STATUS $FORK_NAME)" || bad "fork _meta" "$fb (absent or behind pin)"
dbn=$(psql_app "select count(*) from pg_database where datname='wildcat_fork'" 2>/dev/null || echo 0)
[ "$dbn" = 1 ] && ok "app db" "wildcat_fork present, $(dc exec -T postgres-app psql -U wildcat -d wildcat_fork -tA -c 'select count(*) from _prisma_migrations' 2>/dev/null || echo '?') migrations" || bad "app db" "wildcat_fork missing"
sdk=$(jq -r '.dependencies["@wildcatfi/wildcat-sdk"]' "$ROOT/package.json")
[ "@wildcatfi/wildcat-sdk@$sdk" = "$(pin .sdk)" ] && ok "sdk pin" "$sdk" || bad "sdk pin" "package.json has $sdk, pins.json has $(pin .sdk)"
for k in .app.commit .db.snapshot .smoke.market; do [ "$(pin $k)" = unpinned ] && row "warn" "$k is unpinned"; done
exit $rc
