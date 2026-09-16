# Export operations

## Market selection

Exports default to **This market**. **Borrower** exports the chosen borrower's
active V2 markets; **Selected** exports an explicit list of markets. Requests
must supply 1–50 market addresses. The former **All V2** option and
`markets: "all"` API request are no longer supported.

The entry point is available for V2 markets on supported chains. Every new UI
submission resolves the latest finalized snapshot, including changes to a previous
export's settings. The previous ZIP remains downloadable and displays its own
snapshot time and block. Date ranges continue to filter statement tables only;
the accompanying data files always contain the full market history.

Progress identifies the current market and distinguishes on-chain reads,
calculations, verification, file creation, and saving the ZIP. Its percentage
estimates work stages, not time remaining. A shared-data wait appears only when
another job owns that market's build; verified cached data is labelled as reuse.

## Local setup after the coordination update

Install the pinned dependencies, apply `20260915010000_export_coordination` to
your development database, and regenerate the Prisma client before starting:

```sh
npm ci
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Check that both `DATABASE_URL` and `DIRECT_URL` target the intended development
database before running the migration. Prisma migrations use `DIRECT_URL`. It adds export subscriptions, shared part-build coordination, and
the snapshot timestamp; existing jobs and artifacts are retained. Pipeline version
11 rebuilds old cached market parts for the corrected position accounting and new
year-end state fields. Bundle format 6 uses standard PDF fonts without external
font assets. PDF text is limited to the standard Western European character set;
use XLSX or CSV-only export for other scripts or emoji. Existing downloaded files
are unaffected, and the bundle version prevents reusing the previous PDF format.

## Request and download lifecycle

Create/cancel API requests require an `X-Export-Client` header containing a UUID.
The browser generates this anonymous subscriber capability once per tab and keeps
it in session storage. Send the same header when polling to receive that
subscriber's cancellation state. This works inside the Safe iframe without
third-party cookies. API clients must retain their own UUID; it is independent
of any wallet or financial identity.

Identical requests share computation. Cancellation detaches the requesting
subscriber; the Workflow is cancelled only when no subscribers remain. A pending
Workflow cancellation is retried by reconciliation if its API is temporarily
unavailable.

Download URLs now point to `/api/export/jobs/<id>/download`. Each visit signs a
fresh Storage URL and redirects without caching it. Transient Storage failures
return a retryable response without invalidating a completed job; a confirmed
missing object still marks the artifact unavailable.

## Runtime ownership

Vercel Workflow is the durable execution engine. `ExportJob` is the app-facing
status mirror used by the polling API; it is not a second scheduler. Per-market
parts and final ZIPs live in the private Supabase Storage bucket named by
`EXPORT_STORAGE_BUCKET`.

Part builds are coordinated by market/snapshot identity across request formats
and statement selections. Waiting Workflows suspend durably. The immutable
Storage object is published before its checksum metadata, so failed uploads do
not poison retries. Submission-time RPC calls reserve individual provider slots;
bulk workers retain larger leases.

Required server environment:

- `EXPORT_RPC_URLS`: JSON object from chain ID to an ordered array of archive RPC URLs.
- `ETHERSCAN_API_KEY`: Etherscan v2 key used for direct reverted calls and independent log-set checks.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPORT_STORAGE_BUCKET`.
- `DATABASE_URL`: PostgreSQL containing the export job, artifact, and provider-throttle migrations.
- `DIRECT_URL`: direct connection to the same database, used by Prisma migrations.
- `CRON_SECRET`: Vercel production cron authentication secret.
- Optional `EXPORT_STORAGE_NAMESPACE`: a stable, storage-safe deployment namespace.
  Without it, the app derives one from the Vercel environment and Git branch.

Do not expose RPC, Etherscan, or Supabase service-role credentials to the browser.

## Preview verification

1. Apply the Prisma migration to the preview database and configure the variables above.
2. Generate one current-market export from the UI.
3. Confirm the Workflow run has one market-part step, one assembly step, and completion.
4. Download the ZIP; check all five `data/` files, the selected statements, and reconciliation difference `0` in `manifest.json`.
5. Submit the identical request again and confirm it returns the stored completed artifact rather than starting another run.
6. Submit two identical requests concurrently and confirm both report the same job ID.

Deployment and preview creation remain human-owned release actions.

## Failure handling

Transport, provider, Etherscan, and Storage failures remain retryable Workflow
errors. Invalid markets, malformed provider data, unknown ABI events, full-log
payload differences, cache-integrity failures, and failed ledger identities are
deterministic fatal errors. The job row records its phase, heartbeat, final class,
and message for the UI.

The ten-minute reconciler compares active rows with their actual Workflow runs.
It repairs workflows that failed, were cancelled, or never started; temporary
Workflow API failures leave healthy jobs untouched. The UI cancellation action
detaches its subscriber and cancels the run once no subscribers remain. Workflow
steps only update queued/running rows, so a late step cannot revive a cancelled
job.

## Retention

The authenticated daily cleanup route deletes completed, failed, and cancelled
jobs older than 30 days, including bundle objects recorded before a late
cancellation. It also deletes cached market parts unused for 30 days. Storage
deletion succeeds before database metadata is removed. One invocation processes
bounded deterministic batches; later cron runs continue the backlog.

Generation rejects requests that would render more than 100 statements, any
single market dataset over 64 MB uncompressed, or an assembled dataset pack over
256 MB. PDF and XLSX statements render directly from the same statement model;
export assembly does not launch a browser or depend on native Chromium libraries.

## Fixture refresh

Recorded fixtures contain public source responses and run offline in Jest. Refresh
only when intentionally changing the pipeline or snapshot. Keep committed names
neutral (`reference-market-<label>-<snapshot>.json.gz`); borrower and token names
do not belong in fixture filenames:

```sh
npm run record:export-fixture -- 1 <market> <snapshot-block> src/lib/export/__fixtures__/<name>.json.gz
```

Review exact row counts, fee totals, reconciliations, and statement figures before
accepting a refreshed fixture.
