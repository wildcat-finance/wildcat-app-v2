# Shared helpers for the local fork harness. Source, don't execute.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"     # harness/fork
ROOT="$(cd "$HERE/../.." && pwd)"                            # repo root
STATE="$HERE/.state"; mkdir -p "$STATE"
PINS="$HERE/pins.json"
for tool in docker jq curl; do command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 1; }; done
[ -f "$HERE/.env" ] || { echo "missing $HERE/.env (copy .env.example)" >&2; exit 1; }
# .env supplies defaults; variables already present in the environment win (e.g. FORK_DB_SNAPSHOT= for migrate-only)
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|'#'*) continue;; esac
  k=${line%%=*}; v=${line#*=}; v=${v%\"}; v=${v#\"}
  [ -n "${!k+x}" ] || export "$k=$v"
done < "$HERE/.env"
[ -n "${ALCHEMY_KEY:-}" ] || { echo "ALCHEMY_KEY is empty in $HERE/.env" >&2; exit 1; }

pin(){ jq -er "$1" "$PINS"; }                                  # fails loudly on missing keys
export FORK_BLOCK="$(pin .forkBlock)"
PRIMARY_DEPLOYMENT="$(pin .subgraph.primaryDeployment)"
PRIMARY_NAME="$(pin .subgraph.primaryName)"; [ "$PRIMARY_NAME" = unpinned ] || [ -z "$PRIMARY_NAME" ] && PRIMARY_NAME=wildcat-sepolia
FORK_NAME=wildcat-sepolia-fork; FORK_CHAIN=fork

BASE_RPC="https://eth-sepolia.g.alchemy.com/v2/$ALCHEMY_KEY"
FORK_RPC=http://127.0.0.1:18545
PRIMARY_GQL=http://127.0.0.1:18000/subgraphs/name/$PRIMARY_NAME
PRIMARY_ADMIN=http://127.0.0.1:18020; PRIMARY_STATUS=http://127.0.0.1:18030/graphql
FORK_GQL=http://127.0.0.1:18100/subgraphs/name/$FORK_NAME
FORK_ADMIN=http://127.0.0.1:18120;    FORK_STATUS=http://127.0.0.1:18130/graphql
IPFS_API=http://127.0.0.1:15001/api/v0
APP_DB_URL=postgresql://wildcat:wildcat@127.0.0.1:15433/wildcat_fork
APP_DB_ADMIN_URL=postgresql://wildcat:wildcat@127.0.0.1:15433/postgres

log(){  printf '\033[1;34m[%s]\033[0m %s\n' "$(date +%T)" "$*" >&2; }
fail(){ printf '\033[1;31mFAIL:\033[0m %s\n' "$*" >&2; exit 1; }
pass(){ printf '\033[1;32mPASS:\033[0m %s\n' "$*" >&2; }
dc(){ (cd "$HERE" && docker compose "$@"); }

# rpc <url> <method> <params-json>  -> prints .result; returns 1 (loudly) on transport or .error.
# Returns rather than exits so `x=$(rpc ... || echo none)` works; under set -e an unhandled call still aborts.
rpc(){
  local out
  out=$(curl -sf -X POST -H 'content-type: application/json' "$1" \
        --data "$(jq -cn --arg m "$2" --argjson p "${3:-[]}" '{jsonrpc:"2.0",id:1,method:$m,params:$p}')") \
    || { printf '\033[1;31mFAIL:\033[0m rpc %s -> %s: transport error\n' "$2" "$1" >&2; return 1; }
  if echo "$out" | jq -e '.error' >/dev/null 2>&1; then
    printf '\033[1;31mFAIL:\033[0m rpc %s -> %s: %s\n' "$2" "$1" "$(echo "$out" | jq -c .error)" >&2; return 1
  fi
  echo "$out" | jq -r '.result'
}
hex2dec(){ printf '%d\n' "$1"; }
anvil_head(){ hex2dec "$(rpc "$FORK_RPC" eth_blockNumber '[]')"; }
nudge(){ rpc "$FORK_RPC" anvil_mine '["0x1"]' >/dev/null; }

gql(){ curl -sf -X POST -H 'content-type: application/json' "$1" --data "$(jq -cn --arg q "$2" '{query:$q}')"; }
meta_block(){ gql "$1" '{ _meta { block { number } } }' | jq -r '.data._meta.block.number // 0'; }
# sg_health <status-url> <name> -> "healthy|failed|unhealthy|absent"
sg_health(){
  curl -sf -X POST -H 'content-type: application/json' "$1" \
    --data "$(jq -cn --arg n "$2" '{query:("{ indexingStatusForCurrentVersion(subgraphName:\""+$n+"\"){ health fatalError{message} } }")}')" \
    | jq -r '.data.indexingStatusForCurrentVersion.health // "absent"'
}
# wait_meta <subgraph-url> <min-block> [timeout-s]
wait_meta(){
  local url=$1 min=$2 timeout=${3:-600} t0=$(date +%s) b
  while :; do
    b=$(meta_block "$url" 2>/dev/null || echo 0)
    [ "$b" -ge "$min" ] && { log "$url at block $b (>= $min)"; return 0; }
    [ $(( $(date +%s) - t0 )) -gt "$timeout" ] && fail "timeout waiting for $url >= $min (at $b)"
    sleep 3
  done
}
psql_graph(){ dc exec -T postgres-graph psql -U graph-node -tA -c "$1"; }
psql_app(){   dc exec -T postgres-app   psql -U wildcat -d postgres -tA -c "$1"; }
graphman_fork(){ dc exec -T graph-node-fork graphman --config /config.toml "$@"; }
# node from nvm (repo pins node 22 in .nvmrc); no-op when nvm is absent and node is already on PATH
node_env(){
  if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; nvm use --silent "$(cat "$ROOT/.nvmrc" 2>/dev/null || echo 22)" >/dev/null 2>&1 || true; fi
  command -v npx >/dev/null || fail "npx not found (install node $(cat "$ROOT/.nvmrc" 2>/dev/null))"
}
# pgcli <pg_dump|psql> args...  -> local binary if installed, else the pinned postgres image on the host network
PG_IMAGE="$(pin .images.postgres)"
pgcli(){ if command -v "$1" >/dev/null 2>&1; then "$@"; else docker run --rm -i --network host "$PG_IMAGE" "$@"; fi; }
