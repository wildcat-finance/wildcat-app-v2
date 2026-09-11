#!/usr/bin/env bash
# One-shot: bring up subgraph v2.5.11 on the PRIMARY node (fresh sync from real Sepolia) under its
# own name, without touching the existing v2.5.9 primary. Once synced to head, pins.json's
# subgraph block is repointed at the new deployment and the fork graft rebuilds from it.
# Why: SDK 3.2.7's Sepolia factory rotation needs the v2.5.3 factory data sources (v2.5.10+), and
# v2.5.11's schema cannot be grafted onto 2.5.9 (new non-nullable WithdrawalExecution fields).
source "$(dirname "$0")/lib.sh"
require_stack_owner

V2511_NAME="wildcat-sepolia-v2511"
FORK_MANIFEST_CID="$(pin .forkManifestCid)"
[ -n "$FORK_MANIFEST_CID" ] || FORK_MANIFEST_CID="QmZ82JzFcs1xAvHAX63DqCgBsS9UprLVwXihmVSwUX5uxo"

# The prepared fork manifest is IPFS-ready (all file blobs pinned); derive the primary manifest by
# restoring network: sepolia and dropping the graft/features/description block we prepended.
curl -sf -X POST "$IPFS_API/cat?arg=$FORK_MANIFEST_CID" > "$STATE/v2511-fork-manifest.yaml" \
  || fail "ipfs cat $FORK_MANIFEST_CID"
python3 - "$STATE/v2511-fork-manifest.yaml" "$STATE/v2511-primary-manifest.yaml" <<'PYEOF'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
text = open(src).read()
# drop the injected block: description/features/grafting/graft(base+block) lines
lines = []
skip_graft = 0
for line in text.splitlines(keepends=True):
    if re.match(r"^description: ", line):
        import time
        lines.append("description: primary-v2.5.11 fresh-sync %s\n" % time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()))
        continue
    if re.match(r"^features:\s*$", line) or re.match(r"^\s*-\s*grafting\s*$", line):
        continue
    if re.match(r"^graft:\s*$", line):
        skip_graft = 2
        continue
    if skip_graft and re.match(r"^\s+(base|block):", line):
        skip_graft -= 1
        continue
    lines.append(line)
out = "".join(lines).replace("network: fork", "network: sepolia")
open(dst, "w").write(out)
PYEOF
grep -q "network: sepolia" "$STATE/v2511-primary-manifest.yaml" || fail "network rewrite failed"
grep -q "graft" "$STATE/v2511-primary-manifest.yaml" && fail "graft block not fully stripped"

cid=$(curl -sf -X POST -F "file=@$STATE/v2511-primary-manifest.yaml" "$IPFS_API/add?pin=true" | jq -r .Hash)
[[ "$cid" =~ ^Qm[1-9A-HJ-NP-Za-km-z]{44}$ ]] || fail "ipfs add returned '$cid'"
log "primary v2.5.11 manifest $cid"

rpc "$PRIMARY_ADMIN" subgraph_create "$(jq -cn --arg n "$V2511_NAME" '{name:$n}')" >/dev/null 2>&1 || true
rpc "$PRIMARY_ADMIN" subgraph_deploy "$(jq -cn --arg n "$V2511_NAME" --arg h "$cid" '{name:$n, ipfs_hash:$h, version_label:"v2.5.11"}')" >/dev/null \
  || fail "deploy to primary failed"
echo "$cid" > "$STATE/v2511-primary-deployment.txt"
pass "v2.5.11 syncing on the primary as $V2511_NAME (deployment $cid) — track with: curl -s http://127.0.0.1:18000/subgraphs/name/$V2511_NAME -X POST -d '{\"query\":\"{ _meta { block { number } } }\"}'"
