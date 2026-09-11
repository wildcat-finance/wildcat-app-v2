#!/usr/bin/env bash
# Deploy the fork subgraph on the fork node, grafted from the pinned primary deployment at FORK_BLOCK.
# Manifest-only: fetch the primary's manifest from IPFS, rewrite network + add graft, re-add to IPFS.
source "$(dirname "$0")/lib.sh"
pb=$(meta_block "$PRIMARY_GQL"); [ "$pb" -ge "$FORK_BLOCK" ] || fail "primary at $pb, pin $FORK_BLOCK not reached"
[ "$(rpc "$FORK_RPC" eth_chainId '[]')" = 0xaa36a7 ] || fail "anvil-fork not answering on $FORK_RPC"
[ "$(anvil_head)" -ge "$FORK_BLOCK" ] || fail "anvil head $(anvil_head) < FORK_BLOCK"

# A pinned fork manifest (pins.json .forkManifestCid, empty by default) wins over the auto-built
# graft. It is the same artefact the else-branch below builds — the primary's manifest with
# `network: fork` and a graft block at FORK_BLOCK, all file blobs added to the harness IPFS — but
# prepared ahead of time, for a fork subgraph that must differ from the pinned primary.
pinned_cid=$(pin .forkManifestCid)
if [[ "$pinned_cid" =~ ^Qm[1-9A-HJ-NP-Za-km-z]{44}$ ]]; then
  cid="$pinned_cid"
  stamp="pinned fork manifest $cid"
  log "using pinned fork manifest $cid (skipping primary-graft build)"
else
curl -sf -X POST "$IPFS_API/cat?arg=$PRIMARY_DEPLOYMENT" > "$STATE/primary-manifest.yaml" || fail "ipfs cat $PRIMARY_DEPLOYMENT"
[ "$(grep -c '^\s*network: sepolia\s*$' "$STATE/primary-manifest.yaml")" -gt 0 ] || fail "no 'network: sepolia' lines in primary manifest"
grep -q '^features:' "$STATE/primary-manifest.yaml" && fail "primary manifest already declares features:; extend the awk below to merge instead of prepending"
stamp="fork $(date -u +%Y%m%dT%H%M%SZ) block $FORK_BLOCK"
# the primary manifest may itself carry a top-level description (v2.5.11 fresh-sync stamp) —
# drop it so the graft-stamp description below stays the single key.
sed -e '/^description: /d' -e "s/^\(\s*network:\s*\)sepolia\s*$/\1$FORK_CHAIN/" "$STATE/primary-manifest.yaml" \
 | awk -v g="description: $stamp\nfeatures:\n  - grafting\ngraft:\n  base: $PRIMARY_DEPLOYMENT\n  block: $FORK_BLOCK" \
       'BEGIN{d=0} {print} /^specVersion:/ && !d {print g; d=1}' > "$STATE/fork-manifest.yaml"
cid=$(curl -sf -X POST -F "file=@$STATE/fork-manifest.yaml" "$IPFS_API/add?pin=true" | jq -r .Hash)
[[ "$cid" =~ ^Qm[1-9A-HJ-NP-Za-km-z]{44}$ ]] || fail "ipfs add returned '$cid'"
log "fork manifest $cid ($stamp)"
fi
rpc "$FORK_ADMIN" subgraph_create "$(jq -cn --arg n "$FORK_NAME" '{name:$n}')" >/dev/null 2>&1 || true   # exists is fine
rpc "$FORK_ADMIN" subgraph_deploy "$(jq -cn --arg n "$FORK_NAME" --arg h "$cid" '{name:$n, ipfs_hash:$h, version_label:"v1"}')" >/dev/null
echo "$cid" > "$STATE/fork-deployment.txt"; echo "$stamp" > "$STATE/fork-stamp.txt"
wait_meta "$FORK_GQL" "$FORK_BLOCK" 600
[ "$(sg_health "$FORK_STATUS" "$FORK_NAME")" = healthy ] || fail "fork subgraph not healthy"
# IndexerDeployment is a v2.5-era entity; subgraph v2.1.8 (the main variant) has no such type, so the
# assertion is skipped rather than failed when the schema does not expose it.
net=$(gql "$FORK_GQL" '{ indexerDeployments(first:1){ network chainId } }' \
      | jq -r 'if .errors then "unsupported" else (.data.indexerDeployments[0] | "\(.network) \(.chainId)") end')
case "$net" in
  "sepolia 11155111") : ;;
  unsupported) log "schema has no IndexerDeployment (subgraph $(pin .subgraph.version)) — network assertion skipped" ;;
  *) fail "fork IndexerDeployment reports '$net', expected 'sepolia 11155111'" ;;
esac
pass "fork subgraph $FORK_NAME ready at $(meta_block "$FORK_GQL") (deployment $cid)"
