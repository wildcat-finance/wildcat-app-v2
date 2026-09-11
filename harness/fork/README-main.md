# Fork harness — `main` variant

This branch runs the **live app** (`origin/main`, release 2.20.0, `@wildcatfi/wildcat-sdk@3.1.17`)
against the local Sepolia fork. It is the sibling of the v2.5 branch (`feat/automated-tests-2.5`),
which owns the docker stack. This file covers only what is **different for `main`**; the stack
itself (compose, rpc-cache sidecar, checkpoints, graph-database snapshots, running the board) is
described by `harness/fork/README.md` on that branch.

## 1. The two branches diverge on the subgraph

| | v2.5 branch | **this branch (`main`)** |
|---|---|---|
| SDK | `@wildcatfi/wildcat-sdk@3.2.7-beta` | `@wildcatfi/wildcat-sdk@3.1.17` |
| Sepolia subgraph the SDK points at | v2.5.11 | **v2.1.8** (`.../subgraphs/sepolia/v2.1.8/gn`) |
| fork subgraph name | `wildcat-sepolia-fork` | **`wildcat-sepolia-fork-v218`** |
| primary subgraph name | `wildcat-sepolia-v2511` | **`wildcat-sepolia-v218`** |
| app port | 3000 | **3001** |
| pin file | `pins.json` | `pins.json` (this checkout's own copy) |

The two subgraph schemas are **not interchangeable**, so `main` needs its **own** primary and fork
deployment. Everything else — anvil, the fork block, the app DB, IPFS, both graph-nodes — is shared.

Measured: pointing `main` at the v2.5.11 fork subgraph and issuing SDK 3.1.17's own `getAllMarkets`
document (query + its 7 transitive fragments, from `@wildcatfi/wildcat-sdk@3.1.17/dist/gql/graphql.js`)
returns six hard errors:

```
POST http://127.0.0.1:18100/subgraphs/name/wildcat-sepolia-fork
  Type `HooksTemplate` has no field `name`
  Type `HooksTemplate` has no field `feeRecipient`
  Type `HooksTemplate` has no field `protocolFeeBips`
  Type `HooksTemplate` has no field `originationFeeAsset`
  Type `HooksTemplate` has no field `originationFeeAmount`
  Type `HooksTemplate` has no field `disabled`
```

`HooksTemplate` was restructured between v2.1.8 and v2.5.11. Every market list and market detail
view goes through this fragment, so the app renders empty rather than degrading; the `Market` type
itself is not the problem (v2.5.11's is a superset of what SDK 3.1.17 asks for).

## 2. The docker stack is SHARED — this checkout does not own it

The compose project is named `wildcat-fork` and is keyed on that name, not on the directory, so
**both checkouts address the same containers**. `scripts/fork-destroy.sh` removes *every* subgraph on
the fork chain, and `up.sh` calls it whenever `.state/fork-stamp.txt` is missing — which it always is
in a fresh checkout. Running `up.sh` here would therefore destroy the v2.5 branch's fork subgraph.

`pins.json` sets `.harness.ownsStack = false`, and `lib.sh` refuses the mutating scripts
(`up.sh`, `down.sh`, `reset.sh`, `fork-destroy.sh`, `db-restore.sh`, `primary-v2511.sh`) for a
non-owning checkout. Override with `HARNESS_ALLOW_MUTATE=1` **only** when the v2.5 stack is idle.

Bringing the stack up, resetting the fork and restoring the app DB remain the **v2.5 branch's** job.
This checkout attaches:

```
npm run dev:fork          # scripts/attach.sh + next dev on :3001
npm run dev:fork:status   # read-only health of the shared stack
```

`attach.sh` creates and destroys nothing: it verifies anvil, *this branch's* fork subgraph, the app
DB, the SDK pin and that :3001 is free, then writes `harness/fork/.env.fork`.

Two things the owner does that land on this checkout:

- `restore.sh <name>` (checkpoints) restores the shared graph database, this branch's fork
  subgraph included.
- `graph-restore.sh --yes` drops the whole graph-node database, this branch's primary and fork
  deployments included.

Either way, restart `next dev` on :3001 afterwards — its pooled connections are stale.

### Stopping your dev server

Both branches run `next dev` from the same repository, so **never** stop one by pattern:

```
pkill -f "next dev"       # WRONG — also kills the other branch's server
pkill -f "next-server"    # WRONG — same
```

Stop only your own process by PID, or by the port you own:

```
kill "$(ss -ltnp 'sport = :3001' | grep -oP 'pid=\K[0-9]+' | head -1)"
```

## 3. Rebuilding this branch's subgraphs

Needed after a `down --wipe`, unless the graph database is restored from a snapshot
(`graph-restore.sh --yes` on the v2.5 branch — a snapshot taken with this branch's deployments
present restores them too). The steps need the stack running (owned by the v2.5 branch) and
`harness/fork/.env` present with `ALCHEMY_KEY`.

### Step 1 — deploy subgraph v2.1.8 to the PRIMARY node

From a checkout of `wildcat-finance/subgraph` at tag **v2.1.8** (9 sepolia data sources, max
`startBlock` 9751444), with `node_modules` installed and `build/` populated:

```
npx graph create --node http://127.0.0.1:18020 wildcat-sepolia-v218
npx graph deploy --node http://127.0.0.1:18020 --ipfs http://127.0.0.1:15001 \
    wildcat-sepolia-v218 subgraph.yaml --version-label v2.1.8
```

`graph deploy` prints the deployment CID (`Qm…`). **Record it in `pins.json` at
`.subgraph.primaryDeployment`.** Then wait for it to reach the fork block (about an hour from Alchemy
on a cold sync; the rpc-cache sidecar replays a repeat sync from disk):

```
curl -s -X POST http://127.0.0.1:18000/subgraphs/name/wildcat-sepolia-v218 \
  -d '{"query":"{ _meta { block { number } } }"}'
# wait until number >= 11584253
```

### Step 2 — graft the fork copy

With `.subgraph.primaryDeployment` pinned, `harness/fork/scripts/fork-create.sh` (run from this
checkout) fetches the primary manifest from IPFS, rewrites `network: sepolia` → `network: fork`,
prepends a graft at `forkBlock`, re-pins it and deploys under `.subgraph.forkName`. It is **not**
guarded — it only creates a subgraph under this branch's own name and destroys nothing.

Two things this branch's copy of the script does differently:

- the final network assertion queried `indexerDeployments`, an entity **v2.1.8's schema does not
  have**; it skips the assertion when the schema does not expose the type;
- do **not** reuse the graft base in the subgraph repo's `subgraph.fork.yaml` for v2.1.8 as-is: its
  graft block is 11584263, ten blocks *after* the harness fork point (11584253), and would copy ten
  blocks of real Sepolia history the anvil fork does not have. `fork-create.sh` builds the graft at
  `pins.json .forkBlock`.

### Step 3 — app DB compatibility

The app DB (`wildcat_fork` on `127.0.0.1:15433`) is **shared** and is restored and migrated by the
v2.5 branch. `main` has 17 prisma migrations; the restored database carries 19 (the v2.5 line's
`20260728000000_v2_5_default_mla_templates`, which only seeds MLA template rows, and
`20260819030000_borrower_restriction` from the source database — three nullable columns). An
applied-but-unknown migration is a warning for `prisma migrate deploy`, not an error, and `main`
reads the database fine. Verify with:

```
env $(grep -v '^#' harness/fork/.env.fork | xargs) npx prisma migrate status
```

If the two schemas ever diverge in a way `main` cannot read, give this branch its own database
(change `APP_DB_URL` in `lib.sh` to a second database name and restore into it) rather than
re-restoring the shared one.

### Step 4 — run it

```
npm run dev:fork              # attach.sh + next dev on :3001
npm run test:e2e              # playwright, against pins.json
```

## 4. Port and pin-file resolution

Nothing on this branch is hardcoded to a port. Resolution order, identical in `lib.sh`,
`e2e/lib/env.ts` and `e2e/warm.mjs`:

- **pin file**: `$WILDCAT_PINS` → `harness/fork/pins.json`.
- **app URL**: `$APP_URL` → `.app.url` → `.app.port`.

`attach.sh` writes `PORT` into `.env.fork`, and `dev:fork` passes that file to `next dev`.

## 5. Coverage gaps

Tests that exist only on the v2.5 line are simply absent here; `e2e/COVERAGE.md` lists them with
the reason.

## 6. Running the board

    npm run board               # PW_VIDEO=on, the configured reporters, BOP-14/BOP-14b excluded

`board` ends by checking the artefact it just wrote: schema, freshness, that the selection was the
whole board and not a subset, the test count, the journal coverage of the executed rows, and that
no row failed, unexpectedly passed or never ran. It prints the immutable archive directory
(`uat-runs/<startedAt>/`) — that path, not `uat-report/`, is what a status entry cites.

    npm run board:one -- LEN-16 # one row against an already-fixtured fork (see the caveat it prints)
