#!/usr/bin/env bash
# Operator: dump the dev DB (read-only), bring it up to this app's migrations, sanitize, and produce the
# harness snapshot + checksum. pg_dump/psql come from the local install or the pinned postgres image.
source "$(dirname "$0")/lib.sh"
[ -n "${FORK_DB_SOURCE_URL:-}" ] || fail "set FORK_DB_SOURCE_URL (dev database connection string)"
[ -n "${FORK_DB_SNAPSHOT:-}" ] || fail "set FORK_DB_SNAPSHOT (output path .sql.gz) in harness/fork/.env"
for t in gzip sha256sum; do command -v $t >/dev/null || fail "missing $t"; done
node_env
tmpdb=wildcat_snapshot_tmp; tmpurl="postgresql://wildcat:wildcat@127.0.0.1:15433/$tmpdb"
dc ps --format '{{.Service}} {{.State}}' | grep -q '^postgres-app running$' || fail "postgres-app is not running (docker compose up -d postgres-app)"
log "dumping public schema from source DB (read-only)"
pgcli pg_dump --no-owner --no-privileges --schema=public --format=plain "$FORK_DB_SOURCE_URL" > "$STATE/raw.sql" || fail "pg_dump failed"
[ -s "$STATE/raw.sql" ] || fail "empty dump"
# pg_dump emits CREATE SCHEMA public when the source owner differs; the target already has it
sed -i -e '/^CREATE SCHEMA public;$/d' -e '/^COMMENT ON SCHEMA public /d' "$STATE/raw.sql"
psql_app "drop database if exists $tmpdb" >/dev/null; psql_app "create database $tmpdb" >/dev/null
log "restoring into $tmpdb"
dc exec -T postgres-app psql -U wildcat -d $tmpdb -q -v ON_ERROR_STOP=1 -f - < "$STATE/raw.sql" >/dev/null || fail "restore of raw dump failed"
src_mig=$(dc exec -T postgres-app psql -U wildcat -d $tmpdb -tA -c "select string_agg(migration_name, ',' order by migration_name) from _prisma_migrations")
log "applying this app's migrations on top (source had: $src_mig)"
out=$(cd "$ROOT" && DATABASE_URL="$tmpurl" DIRECT_URL="$tmpurl" npx prisma migrate deploy 2>&1) || fail "prisma migrate deploy on snapshot copy: $out"
log "sanitizing"
dc exec -T postgres-app psql -U wildcat -d $tmpdb -q -v ON_ERROR_STOP=1 -f - < "$HERE/db/sanitize.sql" >/dev/null || fail "sanitize.sql failed"
mig=$(dc exec -T postgres-app psql -U wildcat -d $tmpdb -tA -c "select migration_name from _prisma_migrations order by finished_at desc limit 1")
[ "$mig" = "$(pin .db.migration)" ] || fail "latest migration '$mig' != pinned '$(pin .db.migration)'"
count=$(dc exec -T postgres-app psql -U wildcat -d $tmpdb -tA -c "select count(*) from _prisma_migrations")
mkdir -p "$(dirname "$FORK_DB_SNAPSHOT")"
dc exec -T postgres-app pg_dump -U wildcat --no-owner --no-privileges --format=plain $tmpdb | gzip -9 > "$FORK_DB_SNAPSHOT" || fail "final pg_dump failed"
psql_app "drop database $tmpdb" >/dev/null; rm -f "$STATE/raw.sql"
sum=$(sha256sum "$FORK_DB_SNAPSHOT" | awk '{print $1}')
jq --arg f "$(basename "$FORK_DB_SNAPSHOT")" --arg s "$sum" --argjson c "$count" '.db.snapshot=$f | .db.sha256=$s | .db.migrationCount=$c' "$PINS" > "$PINS.tmp" && mv "$PINS.tmp" "$PINS"
pass "snapshot $FORK_DB_SNAPSHOT sha256=$sum migration=$mig count=$count (pins.json updated; record provenance in db/SNAPSHOT.md)"
