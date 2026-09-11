#!/usr/bin/env bash
# faucet.sh <to> <amount-wei>            -> ETH via anvil_setBalance
# faucet.sh <to> <token> <amount-units>  -> ERC-20 via anvil_dealERC20, else foundry-`deal` slot probing
source "$(dirname "$0")/lib.sh"
export PATH="$HOME/.foundry/bin:$PATH"; command -v cast >/dev/null || fail "cast (foundry) not on PATH"
[ $# -eq 2 ] || [ $# -eq 3 ] || fail "usage: faucet.sh <to> <amount-wei> | faucet.sh <to> <token> <amount-units>"
to=$1
if [ $# -eq 2 ]; then
  amt=$(cast to-hex "$2"); rpc "$FORK_RPC" anvil_setBalance "[\"$to\",\"$amt\"]" >/dev/null; nudge
  bal=$(cast balance "$to" --rpc-url "$FORK_RPC"); [ "$bal" = "$2" ] || fail "ETH balance $bal != $2"; pass "ETH $2 -> $to"; exit 0
fi
token=$2; amount=$3; amt=$(cast to-hex "$amount")
balance(){ cast call "$token" 'balanceOf(address)(uint256)' "$to" --rpc-url "$FORK_RPC" | awk '{print $1}'; }
cur=$(balance)
if python3 -c "import sys; sys.exit(0 if int('$cur') >= int('$amount') else 1)"; then
  log "balance already $cur >= $amount; nothing to do"
elif out=$(curl -sf -X POST -H 'content-type: application/json' "$FORK_RPC" \
     --data "$(jq -cn --arg t "$token" --arg a "$to" --arg v "$amt" '{jsonrpc:"2.0",id:1,method:"anvil_dealERC20",params:[$t,$a,$v]}')") \
   && ! echo "$out" | jq -e .error >/dev/null; then
  log "anvil_dealERC20 ok"
else
  log "anvil_dealERC20 failed ($(echo "$out" | jq -r '.error.message // "transport"'))"
  # Wildcat mock tokens (script/mock/MockERC20.sol) expose an open mint(address,uint256): top up the difference.
  need=$(python3 -c "print(int('$amount') - int('$cur'))")
  rpc "$FORK_RPC" anvil_impersonateAccount "[\"$to\"]" >/dev/null
  if cast send "$token" 'mint(address,uint256)' "$to" "$need" --from "$to" --unlocked --rpc-url "$FORK_RPC" -q 2>/dev/null; then
    log "mint(address,uint256) ok (+$need)"
  else
    log "mint unavailable; probing balance slot (foundry deal semantics)"
    found=""
    for i in $(seq 0 32); do
      slot=$(cast index address "$to" "$i")
      prev=$(cast storage "$token" "$slot" --rpc-url "$FORK_RPC")
      rpc "$FORK_RPC" anvil_setStorageAt "[\"$token\",\"$slot\",\"$(cast to-uint256 "$amount")\"]" >/dev/null
      if [ "$(balance)" = "$amount" ]; then found=$i; break; fi
      rpc "$FORK_RPC" anvil_setStorageAt "[\"$token\",\"$slot\",\"$prev\"]" >/dev/null   # restore on mismatch
    done
    [ -n "$found" ] || fail "no balance slot found for $token in mapping slots 0..32"
    log "balance mapping at slot $found"
  fi
fi
nudge
bal=$(balance); python3 -c "import sys; sys.exit(0 if int('$bal') >= int('$amount') else 1)" || fail "token balance $bal < $amount"
pass "$amount of $token -> $to"
