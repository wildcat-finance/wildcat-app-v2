#!/usr/bin/env bash
# (Re)create wildcat_fork on postgres-app. With FORK_DB_SNAPSHOT set and present: restore the pinned
# snapshot (sha256 enforced) and require no pending migrations. Otherwise: empty DB via prisma migrate deploy.
source "$(dirname "$0")/lib.sh"
require_stack_owner
node_env
mode=migrate-only
if [ -n "${FORK_DB_SNAPSHOT:-}" ]; then
  [ -f "$FORK_DB_SNAPSHOT" ] || fail "FORK_DB_SNAPSHOT '$FORK_DB_SNAPSHOT' not found (unset it to use an empty migrated DB)"
  [ "$(pin .db.snapshot)" = "$(basename "$FORK_DB_SNAPSHOT")" ] || fail "FORK_DB_SNAPSHOT basename != pinned '$(pin .db.snapshot)'"
  want=$(pin .db.sha256); have=$(sha256sum "$FORK_DB_SNAPSHOT" | awk '{print $1}')
  [ "$want" = "$have" ] || fail "snapshot sha256 $have != pinned $want"
  mode=snapshot
fi
psql_app "select pg_terminate_backend(pid) from pg_stat_activity where datname='wildcat_fork' and pid<>pg_backend_pid()" >/dev/null
psql_app "drop database if exists wildcat_fork" >/dev/null
psql_app "create database wildcat_fork" >/dev/null
if [ $mode = snapshot ]; then
  gunzip -c "$FORK_DB_SNAPSHOT" | dc exec -T postgres-app psql -U wildcat -d wildcat_fork -q -v ON_ERROR_STOP=1 >/dev/null || fail "restore failed"
else
  log "no snapshot configured: creating an empty database with prisma migrate deploy"
fi
out=$(cd "$ROOT" && DATABASE_URL="$APP_DB_URL" DIRECT_URL="$APP_DB_URL" npx prisma migrate deploy 2>&1) || fail "prisma migrate deploy: $out"
if [ $mode = snapshot ]; then
  echo "$out" | grep -q "No pending migrations" || fail "snapshot is behind the app's migrations: $out"
  want_n=$(pin .db.migrationCount)
else
  want_n=$(ls "$ROOT/prisma/migrations" | grep -c '^[0-9]')
fi
n=$(dc exec -T postgres-app psql -U wildcat -d wildcat_fork -tA -c "select count(*) from _prisma_migrations")
[ "$n" = "$want_n" ] || fail "migration count $n != expected $want_n"
pass "wildcat_fork restored from $mode ($n migrations$([ $mode = snapshot ] && echo ', sha256 ok'))"
