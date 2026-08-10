# Export operations

## Runtime ownership

Vercel Workflow is the durable execution engine. `ExportJob` is the app-facing
status mirror used by the polling API; it is not a second scheduler. Per-market
parts and final ZIPs live in the private Supabase Storage bucket named by
`EXPORT_STORAGE_BUCKET`.

Required server environment:

- `EXPORT_RPC_URLS`: JSON object from chain ID to an ordered array of archive RPC URLs.
- `ETHERSCAN_API_KEY`: Etherscan v2 key used for direct reverted calls and independent log-set checks.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPORT_STORAGE_BUCKET`.
- `DATABASE_URL`: PostgreSQL containing the export job, artifact, and provider-throttle migrations.
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
cancels the Workflow run and conditionally marks the row cancelled. Workflow
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
256 MB. PDF statements share one Chromium process and close each page after use.

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
