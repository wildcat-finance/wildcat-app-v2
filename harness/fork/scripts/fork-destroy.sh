#!/usr/bin/env bash
# Remove the fork subgraph (every version), any other deployment on the fork chain, unused deployments,
# and reset the fork chain store. Idempotent.
source "$(dirname "$0")/lib.sh"
require_stack_owner
dc exec -T graph-node-fork true >/dev/null 2>&1 || dc up -d graph-node-fork >/dev/null 2>&1
until curl -s "$FORK_ADMIN" >/dev/null; do sleep 2; done
# every subgraph name that has any version deployed on the fork chain (old spike leftovers included)
names=$(psql_graph "select distinct s.name from subgraphs.subgraph s join subgraphs.subgraph_version v on v.subgraph=s.id join public.deployment_schemas d on d.subgraph=v.deployment where d.network='$FORK_CHAIN' or s.name='$FORK_NAME'" || true)
for n in $names; do
  deps=$(psql_graph "select v.deployment from subgraphs.subgraph s join subgraphs.subgraph_version v on v.subgraph=s.id where s.name='$n'" || true)
  for d in $deps; do graphman_fork unassign "$d" >/dev/null 2>&1 || true; done
  graphman_fork remove "$n" >/dev/null 2>&1 || true
  log "removed subgraph name $n"
done
# deployments on the fork chain with no name at all
for d in $(psql_graph "select subgraph from public.deployment_schemas where network='$FORK_CHAIN'" || true); do graphman_fork unassign "$d" >/dev/null 2>&1 || true; done
graphman_fork unused record >/dev/null 2>&1 || true
removed=$(graphman_fork unused remove 2>/dev/null | grep -c 'done removing' || true)
left=$(psql_graph "select count(*) from public.deployment_schemas where network='$FORK_CHAIN'" || echo 0)
[ "$left" = 0 ] || fail "$left deployment(s) still on chain $FORK_CHAIN"
# chain store: the fork graph-node must be STOPPED first, otherwise its block ingestor re-writes the old
# chain's head between our reset and the container removal ("Provider went backwards" on the new fork).
# postgres-graph must be UP, and the reset is verified — a silently skipped reset leaves cached blocks from
# the previous fork lifetime that a re-created subgraph will happily index (phantom chain).
dc stop graph-node-fork >/dev/null 2>&1 || true
dc up -d postgres-graph >/dev/null
until dc exec -T postgres-graph pg_isready -U graph-node >/dev/null 2>&1; do sleep 2; done
ns=$(psql_graph "select namespace from public.chains where name='$FORK_CHAIN'")
if [ -n "$ns" ]; then
  for t in blocks call_cache call_meta; do
    psql_graph "select 1 from information_schema.tables where table_schema='$ns' and table_name='$t'" | grep -q 1       && psql_graph "delete from $ns.$t" >/dev/null
  done
  psql_graph "update public.ethereum_networks set head_block_number=null, head_block_hash=null, head_block_cursor=null where name='$FORK_CHAIN'" >/dev/null
  left=$(psql_graph "select count(*) from $ns.blocks")
  [ "$left" = 0 ] || fail "chain store $ns still has $left cached blocks after reset"
  log "chain store $FORK_CHAIN ($ns) reset and verified; graph-node-fork left stopped (callers start it)"
fi
rm -f "$STATE/fork-deployment.txt" "$STATE/fork-stamp.txt"
pass "fork subgraph removed (${removed:-0} deployment schema(s) dropped), chain store reset"
