#!/usr/bin/env bash
# Snapshot the graph-node postgres database (all synced subgraphs: every primary version and the
# fork copy, plus graph-node's own chain/block store). The synced state is the expensive product
# of the upstream RPC work — restoring this dump replaces a multi-hour Alchemy resync with a
# minutes-long local restore (see graph-restore.sh).
#
# Safe to run while graph-node is live: pg_dump takes a transactionally-consistent snapshot.
# Best taken when the primaries are fully synced (a mid-sync snapshot restores fine but resumes
# indexing from wherever it was). Output: harness/fork/graph-snapshots/graph-node.dump (pg custom
# format, compressed) + .sha256 + .meta with the indexing statuses at dump time.
source "$(dirname "$0")/lib.sh"

OUT_DIR="${GRAPH_DB_SNAPSHOT_DIR:-$HERE/graph-snapshots}"
OUT="$OUT_DIR/graph-node.dump"
mkdir -p "$OUT_DIR"

dc ps --format '{{.Service}} {{.State}}' | grep -q '^postgres-graph running$' \
  || fail "postgres-graph is not running"

statuses=$(curl -s -X POST "$PRIMARY_STATUS" -H 'content-type: application/json' \
  -d '{"query":"{ indexingStatuses { subgraph synced health chains { latestBlock { number } } } }"}')
log "indexing statuses at dump time: $statuses"
echo "$statuses" | jq -e '.data.indexingStatuses | length > 0' >/dev/null \
  || log "WARNING: no indexing statuses readable — dumping anyway"

size=$(dc exec -T postgres-graph psql -U graph-node -tA -c "select pg_size_pretty(pg_database_size('graph-node'))")
log "dumping graph-node database ($size) to $OUT"
# zstd, not gzip: pg_dump compression is single-threaded, and gzip tops out around 30MB/s —
# 5+ minutes for this database. zstd level 3 compresses comparably at several hundred MB/s.
dc exec -T postgres-graph pg_dump -U graph-node --format=custom --compress=zstd:3 graph-node > "$OUT.tmp" \
  || fail "pg_dump failed"
[ -s "$OUT.tmp" ] || fail "empty dump"
mv "$OUT.tmp" "$OUT"
sum=$(sha256sum "$OUT" | awk '{print $1}')
echo "$sum" > "$OUT.sha256"
{ date -u +"%Y-%m-%dT%H:%M:%SZ"; echo "db size: $size"; echo "sha256: $sum"; echo "$statuses" | jq .; } > "$OUT.meta"
pass "graph snapshot $(du -h "$OUT" | cut -f1) at $OUT (sha256 $sum)"
