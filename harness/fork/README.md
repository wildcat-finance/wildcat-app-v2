# Local Sepolia fork harness — `main` variant checkout

The fork stack (anvil fork of Sepolia at the pinned block, fork subgraphs grafted from locally
synced primaries, app Postgres from a sanitized snapshot, rpc-cache sidecar) is composed and owned
by the v2.5 branch (`feat/automated-tests-2.5`); its `harness/fork/README.md` is the description of
the running stack, its commands, checkpoints and graph-database snapshots.

This checkout attaches to that stack read-only. What is here:

- `pins.json` — this variant's tested tuple (app, SDK 3.1.17, subgraph v2.1.8 deployments,
  fork block, DB snapshot, the impersonated pre-fork borrower). `.harness.ownsStack = false`.
- `scripts/attach.sh` — verifies anvil, this variant's fork subgraph, the app DB and the SDK pin,
  then writes `.env.fork` with `PORT=3001`. `npm run dev:fork` runs it and starts `next dev`.
- `scripts/lib.sh` — the shared script library, with the guard that refuses the mutating scripts
  (`up.sh`, `down.sh`, `reset.sh`, `fork-destroy.sh`, `db-restore.sh`, `primary-v2511.sh`) for a
  non-owning variant unless `HARNESS_ALLOW_MUTATE=1`.
- `scripts/fork-create.sh` — creates this variant's own fork subgraph (`wildcat-sepolia-fork-v218`)
  from the pinned v2.1.8 primary; it is not guarded because it destroys nothing.
- `docker-compose.yml`, `graph-node/`, `db/` — copies carried for the shared script library; the
  stack that is actually running was composed from the v2.5 branch.

Read `README-main.md` before running anything from here: it explains the shared stack, why this
variant needs its own subgraph deployments, how to rebuild them, and the port and pin-file
resolution.
