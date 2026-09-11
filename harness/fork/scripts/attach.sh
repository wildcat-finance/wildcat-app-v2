#!/usr/bin/env bash
# Attach this app to an ALREADY-RUNNING fork stack and write .env.fork. Creates and destroys nothing.
#
# The compose project (wildcat-fork) is shared with the v2.5 worktree, so the main variant must never
# run up.sh/reset.sh: fork-destroy.sh removes every subgraph on the fork chain, the v2.5 one included.
# Bringing the stack up is the owning variant's job (see harness/fork/README-main.md).
source "$(dirname "$0")/lib.sh"

log "attaching to the shared wildcat-fork stack (pins: $PINS)"
rc=0
row(){ printf '%-26s %s\n' "$1" "$2"; }
ok(){  row "$1" "ok    $2"; }
bad(){ row "$1" "FAIL  $2"; rc=1; }

# --- anvil ---------------------------------------------------------------------------------------
cid=$(rpc "$FORK_RPC" eth_chainId '[]' 2>/dev/null || echo none)
if [ "$cid" = 0xaa36a7 ]; then
  head=$(anvil_head)
  ok "anvil" "chainId 11155111 head=$head"
  [ "$head" -ge "$FORK_BLOCK" ] || bad "anvil head" "$head < pinned forkBlock $FORK_BLOCK"
else
  bad "anvil" "$cid on $FORK_RPC — stack not running; the owning variant must start it"
fi

# --- this variant's fork subgraph ----------------------------------------------------------------
health=$(sg_health "$FORK_STATUS" "$FORK_NAME" 2>/dev/null || echo absent)
fb=$(meta_block "$FORK_GQL" 2>/dev/null || echo 0)
if [ "$health" = healthy ] && [ "$fb" -ge "$FORK_BLOCK" ]; then
  ok "fork subgraph" "$FORK_NAME at $fb (health=$health)"
else
  bad "fork subgraph" "$FORK_NAME health=$health block=$fb (need healthy and >= $FORK_BLOCK)"
  row "" "  -> deploy subgraph $(pin_or .subgraph.version '?') for this variant; see harness/fork/README-main.md"
fi

# --- app db --------------------------------------------------------------------------------------
dbn=$(psql_app "select count(*) from pg_database where datname='wildcat_fork'" 2>/dev/null || echo 0)
[ "$dbn" = 1 ] && ok "app db" "wildcat_fork present (shared)" || bad "app db" "wildcat_fork missing"

# --- sdk pin -------------------------------------------------------------------------------------
sdk=$(jq -r '.dependencies["@wildcatfi/wildcat-sdk"]' "$ROOT/package.json")
[ "@wildcatfi/wildcat-sdk@$sdk" = "$(pin .sdk)" ] \
  && ok "sdk pin" "$sdk" \
  || bad "sdk pin" "package.json has $sdk, $PINS has $(pin .sdk)"

# --- port ----------------------------------------------------------------------------------------
if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$APP_PORT" 2>/dev/null | grep -q ":$APP_PORT"; then
  bad "app port" "$APP_PORT already in use"
else
  ok "app port" "$APP_PORT free"
fi

[ "$rc" = 0 ] || fail "stack is not ready (see rows above); nothing was created or changed"

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
PORT=$APP_PORT
EOT
pass "attached; env written to $HERE/.env.fork (app port $APP_PORT, subgraph $FORK_NAME)"
