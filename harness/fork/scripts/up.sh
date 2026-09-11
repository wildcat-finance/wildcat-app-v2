#!/usr/bin/env bash
# Start the stack, wait for health, create what is missing, write .env.fork. Idempotent.
source "$(dirname "$0")/lib.sh"
require_stack_owner
log "starting compose project wildcat-fork (fork block $FORK_BLOCK)"
# anvil runs as uid 1000; a fresh named volume is root-owned, so anvil could not write its fork cache into it.
docker volume create wildcat-fork_anvil-cache >/dev/null
docker run --rm -v wildcat-fork_anvil-cache:/c "$(pin .images.postgres)" chown 1000:1000 /c
dc up -d
until [ "$(dc ps --format '{{.Service}} {{.Health}}' | grep -cE '^postgres-(graph|app) healthy$')" = 2 ]; do sleep 2; done
until curl -sf -X POST "$IPFS_API/version" >/dev/null; do sleep 2; done
until curl -s "$PRIMARY_ADMIN" >/dev/null; do sleep 2; done; sleep 3

# primary subgraph: deploy if absent or pointing at a different deployment, then wait for the pin
# (first run against Alchemy: ~1 h; an already-synced deployment is reused within seconds)
current=$(psql_graph "select v.deployment from subgraphs.subgraph s join subgraphs.subgraph_version v on v.id=s.current_version where s.name='$PRIMARY_NAME'" 2>/dev/null || true)
if [ "$current" != "$PRIMARY_DEPLOYMENT" ]; then
  log "deploying primary $PRIMARY_NAME = $PRIMARY_DEPLOYMENT (was '${current:-absent}')"
  rpc "$PRIMARY_ADMIN" subgraph_create "$(jq -cn --arg n "$PRIMARY_NAME" '{name:$n}')" >/dev/null 2>&1 || true
  rpc "$PRIMARY_ADMIN" subgraph_deploy "$(jq -cn --arg n "$PRIMARY_NAME" --arg h "$PRIMARY_DEPLOYMENT" '{name:$n, ipfs_hash:$h, version_label:"'"$(pin .subgraph.version)"'"}')" >/dev/null
  sleep 5
fi
pb=$(meta_block "$PRIMARY_GQL" 2>/dev/null || echo 0)
[ "$pb" -ge "$FORK_BLOCK" ] || { log "primary at $pb, waiting for $FORK_BLOCK (initial sync takes ~1 h)"; wait_meta "$PRIMARY_GQL" "$FORK_BLOCK" 7200; }
[ "$(gql "$PRIMARY_GQL" '{ _meta { deployment } }' | jq -r .data._meta.deployment)" = "$PRIMARY_DEPLOYMENT" ] || fail "primary serves a deployment other than $PRIMARY_DEPLOYMENT"

until [ "$(rpc "$FORK_RPC" eth_chainId '[]' 2>/dev/null || true)" = 0xaa36a7 ]; do sleep 2; done
until curl -s "$FORK_ADMIN" >/dev/null; do sleep 2; done; sleep 3

# fork subgraph: create if absent or stale
if [ "$(sg_health "$FORK_STATUS" "$FORK_NAME")" = absent ] || [ ! -f "$STATE/fork-stamp.txt" ]; then
  "$HERE/scripts/fork-destroy.sh"
  dc up -d anvil-fork graph-node-fork >/dev/null
  until [ "$(rpc "$FORK_RPC" eth_chainId '[]' 2>/dev/null || true)" = 0xaa36a7 ]; do sleep 2; done
  until curl -s "$FORK_ADMIN" >/dev/null; do sleep 2; done; sleep 3
  "$HERE/scripts/fork-create.sh"
else
  wait_meta "$FORK_GQL" "$FORK_BLOCK" 120
fi
# app db: restore if absent
[ "$(psql_app "select count(*) from pg_database where datname='wildcat_fork'")" = 1 ] || "$HERE/scripts/db-restore.sh"

cat > "$HERE/.env.fork" <<EOT
NEXT_PUBLIC_TARGET_NETWORK=Sepolia
NEXT_PUBLIC_RPC_URL_SEPOLIA=$FORK_RPC
NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA=$FORK_GQL
WILDCAT_SERVER_RPC_URL_SEPOLIA=$FORK_RPC
WILDCAT_SERVER_SUBGRAPH_URL_SEPOLIA=$FORK_GQL
DATABASE_URL=$APP_DB_URL
DIRECT_URL=$APP_DB_URL
SECRET_KEY=local-fork-only-not-a-secret
NEXT_PUBLIC_TEST_MODE=1
NEXT_PUBLIC_ENABLE_ANALYTICS_UI=true
EOT
"$HERE/scripts/status.sh"
pass "harness ready; env written to $HERE/.env.fork"
