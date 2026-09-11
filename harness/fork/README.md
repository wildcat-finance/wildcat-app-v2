# Local Sepolia fork harness

One anvil fork of Sepolia at the pinned block, one fork subgraph grafted from a locally synced
primary, one app Postgres restored from a sanitized snapshot; the app is bound to the stack at
startup. This file describes what is in `harness/fork/` and how to run it. The e2e suites that run
against it are documented in `e2e/CONVENTIONS.md`; the tested tuple is `pins.json`.

**The stack is shared with the `main` variant.** The compose project is named `wildcat-fork` and is
keyed on that name, not on the directory, so the `main`-variant checkout (branch
`feat/local-fork-harness-main`, app on :3001) addresses the SAME containers. This branch owns the
stack; that one attaches read-only — read `harness/fork/README-main.md` on that branch before
running anything from there.

## Prerequisites
Docker + Compose v2, `jq`, `curl`, Node (repo's version, see `.nvmrc`). `harness/fork/.env` with
`ALCHEMY_KEY` and `FORK_DB_SNAPSHOT` (see `db/SNAPSHOT.md`; leave `FORK_DB_SNAPSHOT` empty for an
empty, migrated DB). The first `up` syncs the primary subgraph from Alchemy (about an hour); later
runs reuse the `pg-graph` volume, or restore it from a graph-database snapshot (below).

## Commands
| command | effect |
|---|---|
| `npm run dev:fork` | start/wait for the stack, write `.env.fork`, run `next dev` bound to it |
| `npm run dev:fork:status` | health table; exit 0 iff usable |
| `npm run dev:fork:reset` | recreate anvil fork + fork subgraph + app DB (primary kept), ~45 s with a warm cache |
| `npm run dev:fork:down [-- --wipe]` | stop (`--wipe` deletes volumes) |

Scripts with no npm wrapper (run them directly, from this checkout):
`scripts/checkpoint.sh` / `scripts/restore.sh` (E2E board state), `scripts/graph-snapshot.sh` /
`scripts/graph-restore.sh` (the graph-node database), `scripts/faucet.sh <to> [token] <amount>`,
`scripts/db-exec.sh <sql>`, `scripts/primary-v2511.sh`, `scripts/measure-index-barrier.sh`.

Ports (all 127.0.0.1): anvil 18545 · fork subgraph 18100 · primary subgraph 18000 · graph postgres 15432 ·
app postgres 15433 · ipfs 15001 · rpc-cache 18999. Test wallet: "Local Anvil" (anvil's default accounts).
The `main` variant serves its own fork subgraph off the same node at
`18100/subgraphs/name/wildcat-sepolia-fork-v218` and its app on :3001.

anvil mines on demand only: after sending transactions outside the app, nudge with `anvil_mine` (the
faucet and the smoke test do this). If anvil is restarted after blocks were mined, run `dev:fork:reset`
so the fork subgraph's chain store matches the new chain.

## Pins
`pins.json` is the tested tuple (app commit, SDK, subgraph deployment, fork block, protocol, DB
snapshot + sha256 + migration count, images). Change any element → re-run the smoke → re-pin.
The live graft is built by `fork-create.sh` from `.subgraph.primaryDeployment` at `.forkBlock`
unless `.forkManifestCid` names a prepared manifest (empty by default). `.notes` is commentary; the
keys are the source of truth.

The subgraph source is the `wildcat-finance/subgraph` repository at the tag named in
`.subgraph.version`; the protocol deployments the fork carries are those of
`wildcat-finance/v2-protocol` at `.protocol.commit` (`deployments/sepolia/deployments.json`).

## The rpc-cache sidecar
`rpc-cache/proxy.mjs` (compose service `rpc-cache`, published on 127.0.0.1:18999) is an immutable
JSON-RPC disk cache between the stack and Alchemy. Both consumers go through it — graph-node's
`ALCHEMY_URL` and anvil's `--fork-url` are `http://rpc-cache:8545` — so a subgraph re-sync or a
cold fork replays from the `rpc-cache` volume instead of re-billing Alchemy.
Only requests naming an explicit finalized block (or content-addressed by hash) are cached, and only
successful, non-null responses; `latest`/`pending`, `eth_blockNumber` and writes pass straight through.
`curl -s 127.0.0.1:18999/health` → `{ok, headWatermark, hits, misses, passthrough, errors}`.
`status.sh` does not check it; if upstream reads suddenly go slow, check `/health` first.

## Checkpoints (`scripts/checkpoint.sh` / `scripts/restore.sh`)
A named checkpoint of the E2E board state: `anvil_dumpState` (chain delta + mined blocks, no restart)
plus a same-moment `pg_dump` of the graph database and of the app DB, plus height/timestamp metadata,
under `checkpoints/<name>/`. Capture waits for BOTH variants' fork subgraphs to reach the captured
head and rejects a capture during which the chain advanced. Restore validates every file, checksum
and pin BEFORE touching any service, then recreates anvil at the pin, loads the delta, and
`pg_restore`s both databases.

Scope: a restored checkpoint recovers chain, subgraph and app-DB DATA for inspection and reports.
A state-loaded anvil serves historical `eth_call` only for post-restore blocks, and the app's market
pages anchor lens reads to subgraph block heights, so app-driving suites hang on `BlockOutOfRange`
retries against a restored chain. Suites need the fresh path: `dev:fork:reset` plus the `fixtures`
Playwright project. Restart any dev server after a restore (its pooled DB connections are stale).

Take a checkpoint at a QUIESCENT moment — no playwright running, fork subgraph caught up, and before
any permanent time jump — so the captured state stays wall-clock aligned. Both scripts refuse to run
while `playwright test` is alive. anvil runs with `--preserve-historical-states`
(`docker-compose.yml`); `anvil_dumpState` still omits historical states, which is why restore
reloads the graph database instead of re-indexing.

## Graph-database snapshots (`scripts/graph-snapshot.sh` / `scripts/graph-restore.sh`)
The graph-node Postgres holds the expensive product of all the upstream RPC work: every primary
version plus the fork copies plus graph-node's own chain store. `graph-snapshot.sh` `pg_dump`s it
(custom format, zstd) to `graph-snapshots/graph-node.dump` + `.sha256` + `.meta` (the indexing
statuses at dump time). Safe to run while graph-node is live. `graph-restore.sh --yes` drops and
reloads that database — DESTRUCTIVE for every subgraph, primary and fork — and is what replaces a
multi-hour resync. After a restore the fork copy reflects the anvil state at snapshot time; if anvil
has moved, `fork-destroy.sh` + `fork-create.sh` to regraft.

## Running the board
One Playwright process at a time against the shared fork, for BOTH variants (`e2e/CONVENTIONS.md`
§ Concurrency). Start from a fork reset to the pin: the chain clock only moves forward, and the
wall-clock signing suites refuse to run once the chain leads the wall clock by more than 30 days.

Order is encoded in the Playwright projects and file layout: the `fixtures` project
(`e2e/provision.setup.ts`, see `e2e/FIXTURE-MANIFEST.md`) runs first; the `board` project runs
every other spec with `admin/` (wall-clock signatures, no time travel) sorting first and
`zz-final-phase/` (day-long one-way jumps) last. `BOP-14` and `BOP-14b` permanently advance the
chain two weeks and are excluded from the ordinary board:

    npm run dev:fork:reset      # only when this line owns the fork and the other board is idle
    npm run board               # PW_VIDEO=on, the configured reporters, BOP-14/BOP-14b excluded

`board` ends by checking the artefact it just wrote: schema, freshness, that the selection was the
whole board and not a subset, the test count, the journal coverage of the executed rows, and that
no row failed, unexpectedly passed or never ran. It prints the immutable archive directory
(`uat-runs/<startedAt>/`) — that path, not `uat-report/`, is what a status entry cites.

    npm run board:one -- LEN-16 # one row against an already-fixtured fork (see the caveat it prints)
    npm run report -- --run uat-runs/<stamp> --other <main's run.json>   # add the main column

`playwright.config.ts` lists `list` + `html` + `./e2e/lib/summaryReporter.ts`; only the third
writes `uat-report/{run.json,index.html}` and `playwright-report.md`. `--reporter=<x>` REPLACES
that list, so a run with `--reporter=line` leaves the previous run's `run.json` in place. Pass no
`--reporter` flag, or `--reporter=line,./e2e/lib/summaryReporter.ts`, and check `run.json`'s
`startedAt` before quoting it. `PW_VIDEO=on` records every test; the report puts each video behind
a toggle.

v2.5's report carries main's outcome per row directly (`npm run board` with
`UAT_OTHER_RUN=<main's run.json>`, or `npm run report -- --other …` afterwards); rows pair by UAT
id.

## Smoke test (`npm run test:e2e -- e2e/fork.smoke.spec.ts`)
Serial Playwright spec `e2e/fork.smoke.spec.ts` (boots `dev:fork` if the app is not running):
health + pins → faucet (ETH + market underlying) → real lender ToU signature (the harness DB's prior
acceptance for the anvil account is cleared with `scripts/db-exec.sh` so the flow actually signs;
anvil signs, `/api/sla` verifies) → UI deposit into `pins.smoke.market` → on-chain, subgraph and UI
assertions. `scripts/db-exec.sh <sql>` runs a statement against the disposable `wildcat_fork` DB
(fixtures only).

Notes: the Local Anvil connector reports `isAuthorized()` so wagmi auto-connects account #0 on load
(test mode only). `anvil_dealERC20` returns "no slot found" on forked tokens with anvil 1.7.1;
`faucet.sh` falls back to MockERC20 `mint(address,uint256)`, then to balance-slot probing.

## Cold forks and the anvil cache
A freshly created fork has an empty storage cache; anvil fetches upstream slots serially, so the
app's first page loads can queue minutes of reads and a transaction sent meanwhile waits behind
them. The `anvil-cache` volume (chowned for uid 1000 by `up.sh`) keeps anvil's fork cache across
resets; anvil only writes it on SIGINT, which compose uses to stop it. First ever fork (or after
`down --wipe`): run `node e2e/warm.mjs` once (about four minutes). Because anvil's `--fork-url`
points at the rpc-cache sidecar, a fork re-created after a CRASH (anvil's own cache lost) still
replays from the `rpc-cache` volume. Both caches survive `down`; `down --wipe` deletes both, after
which the primary resync and `warm.mjs` are both needed again.
