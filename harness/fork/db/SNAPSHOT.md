# App database snapshot

| field | value |
|---|---|
| source | the dev/preview app database (Supabase `DIRECT_URL`), read-only `pg_dump`. Confirm dev vs prod before sharing a dump. Not committed. |
| taken | 2026-08-28, read-only `pg_dump --schema=public` |
| migration | `20260728000000_v2_5_default_mla_templates` (19 rows in `_prisma_migrations`, see below) |
| file | `wildcat-dev.sql.gz`, kept outside the repo; its absolute path goes in `FORK_DB_SNAPSHOT` (`harness/fork/.env`) |
| sha256 | `95af2feea47bf95a6c98fff2c9b962a5817e8303f80b08dad9773c4dd05f8b54` |
| sanitization | `harness/fork/db/sanitize.sql` (borrower emails/names/descriptions/contact handles replaced; signatures kept) |

## Migration note (why 19, not 18)

The source database tracks a different app branch: it had 17 migrations in common with this repo plus
`20260819030000_borrower_restriction` (three nullable `Borrower.restrictionOverride*` columns, unknown to
this branch and harmless to it), and lacked this repo's `20260728000000_v2_5_default_mla_templates`.
`db-snapshot.sh` therefore runs this app's `prisma migrate deploy` on the temporary copy before sanitizing
and dumping, so a restore reports "No pending migrations". `pins.json` records the resulting count (19) and
the latest applied migration by `finished_at` (the v2.5 MLA template migration).

## Usage

Produce with `FORK_DB_SOURCE_URL=<dev db url> harness/fork/scripts/db-snapshot.sh` (needs `postgres-app`
running; `pg_dump`/`psql` come from the local install or the pinned `postgres:16` image); restore with
`db-restore.sh` (checksum enforced). With `FORK_DB_SNAPSHOT` unset/empty, `db-restore.sh` creates an empty
database via `prisma migrate deploy` instead. The dump lives outside git. Re-snapshot whenever the app's
migrations change, then re-pin.

Not to be confused with `checkpoints/<name>/appdb.dump` (`scripts/checkpoint.sh`): that is a dump of
`wildcat_fork` **as a board run left it** — signatures, profiles and MLA choices the suites created —
and is restored by `restore.sh` together with the matching anvil state. This file is the pristine
starting point `db-restore.sh` puts back on a reset.

`main` shares this database. Its branch knows 17 of the migrations, the v2.5 line 18, and the restored
DB carries 19 rows (the 19th, `20260819030000_borrower_restriction`, came from the source database and
belongs to neither branch). An applied-but-unknown migration is a warning, not an error; see
`wildcat-app-main/harness/fork/README-main.md` Step 3.
