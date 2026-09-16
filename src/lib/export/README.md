# Market export pipeline

The production path is `sources → ledger → canonical market part → request
projection → typed statement models/data files → deterministic ZIP`. Raw market
history is cached once per `(environment, pipeline version, chain, snapshot block
hash, market)`; entered position addresses never alter that key. Cache entries
are create-only, checksummed, and identity-checked before reuse.

## Data files

- `transactions.csv`: one row per successful, failed direct, routed, or asset-only transaction. Flow columns reconcile exactly to the market asset balance.
- `events.csv`: every supported market event, decoded without dropping parameters. Unknown topics fail the export.
- `interest_accrual.csv`: one row per accrual with base/penalty ray splits, protocol fees, scale-factor bounds, and supply at accrual.
- `daily_series.csv`: one row per UTC day from deployment through snapshot. Each row carries the actual last block at or before day end, that block's timestamp/state, signed and saturating debt measures, and exact annualised rates.
- `manifest.json`: request filters, provenance, market parameters, aggregates, delinquency episodes, excluded foreign-token transfers, and reconciliation identities.

Amounts are decimal strings paired with exact raw base-unit integer strings. Ray
values remain integer strings. CSV is RFC 4180 with LF endings and deterministic
sorts. `manifest.generated_at_utc` is the only export-time value.

## Accounting conventions

The chain blends principal and interest. Position statements use a labelled
proportional allocation for withdrawals and transfers; they do not claim FIFO,
LIFO, or tax cost basis. The generalized principal identity is:

```text
deposits + principal acquired by transfer
  = principal still invested + principal returned + principal transferred out

principal still invested = active principal + pending withdrawal principal

total position value = active market-token value + pending withdrawal value
```

Pending withdrawal value includes both funded-but-unclaimed assets and the
snapshot value of scaled tokens still waiting in an unfunded batch. Each account
owns its proportional share of the cumulative batch, including payments made
before its request joined. Claims use the contract's cumulative floor rounding;
self-transfers leave principal and earnings unchanged. Position
earnings are split into cash payouts, value transferred with market tokens,
active market-token value, and pending withdrawal value; these categories
reconcile exactly to total economic earnings.

Daily and monthly APRs integrate rate changes and penalty timer transitions over
actual snapshot intervals. CSV rate-seconds preserve the exact numerators;
monthly rates aggregate them before rounding. End-of-day rates and annualised
scale-factor growth are separate fields. Zero-duration intervals have empty
period APRs, not synthetic zero rates. This supersedes the original section 13b
posting-period APR convention and its 14.77% reference expectation.

Recorded interest and fees retain the transaction's posting date, which can be
later than the accrual interval's end. `interest_accrual.csv` carries both the
recording timestamp and the accrual interval. Daily accrued lender earnings use
closing lender obligations minus opening obligations, plus payouts and minus
deposits. Lender obligations include market-token value and funded unclaimed
withdrawals, so funding a batch cannot make earnings disappear. These economic
earnings include contract base-unit rounding. Accrued protocol fees use the
change in outstanding fees plus collections. Daily amounts telescope exactly
across statement months, years and custom date selections, including quiet
periods with no emitted accrual updates.

Calendar-year position earnings are changes in cumulative economic earnings
(value plus payouts and outgoing transfers minus acquisitions), measured at the
last block on or before each UTC 31 December end and at the requested snapshot.
They use archived year-end scale factors, including growth not yet emitted as
an accrual event. Recorded market interest and fees retain their posting dates.

`daily_series.csv` includes `scale_factor_ray`, `scaled_total_supply_raw`, and
`normalized_unclaimed_withdrawals_raw` to reproduce these valuations. Its
`pending_batch_preview_json` is populated at year ends and the final snapshot
when the contract previews a payment without emitting a log. The exporter
checks that payment against `getWithdrawalBatch()` and separately reconciles
scaled supply and funded-but-unclaimed assets. The manifest retains the emitted
supply, preview adjustment, and recorded/on-chain unclaimed balances. Previewed
payments never become fabricated transaction or event rows.

Sanctions companion events describe ordinary queue/execute flows and are not
second movements. A direct sanctioned asset transfer to escrow is `escrowed_out`;
a sanctioned withdrawal is already represented by `WithdrawalExecuted`.
`WithdrawalBatchExpired.scaledAmountBurned` is cumulative summary data; supply is
burned only by `WithdrawalBatchPayment` events.

## Acceptance coverage

Unit tests cover ABI topics, exact ray/decimal arithmetic, CSV hardening, request
bounds, strict RPC/Etherscan envelopes, full log-payload equality, range splitting,
sanctions semantics, batch-expiry supply semantics, partial principal allocation,
canonical bounded gzip bytes, admission/coalescing caps, workflow reconciliation,
and cleanup safety.
Recorded public-chain fixtures replay the same production pipeline offline and
assert reference row counts, fee tables, APR regressions, reconciliations,
excluded transfers, reverted calls, and deterministic bundle entries. Statement
self-containment tests derive displayed values by reading only ZIP data files.

The user-owned preview check validates Vercel Workflow, PostgreSQL, and Supabase
Storage together. See `docs/export-operations.md`.

## Export schema 2.0

Every ZIP includes `DATA_DICTIONARY.md` with CSV fields, formulas, units, rounding,
interval boundaries, manifest conventions and transaction coverage. The schema
is versioned separately from the pipeline and bundle-cache format. Pipeline 11
and bundle format 5 prevent reuse of data or ZIPs with the old definitions.

Breaking changes for CSV/JSON consumers:

- `outstanding_principal` becomes `market_token_value`; its raw partner follows
  the same rename. The value includes interest and unfunded queued tokens.
- `borrowed_outstanding` and its raw partner are removed. The remaining loan
  measure is `outstanding_loan_balance`.
- Period-average APR columns use explicit `_pct_period` names and actual
  interval weighting. `lender_growth_apr_pct_period` replaces
  `realized_lender_apr_pct_period`, retaining the scale-growth definition.
- Manifest event totals use `_recorded` names. New accrued earnings/fee totals
  use the daily boundary-state calculations.
- `interest_accrual.csv` adds `timestamp_utc` and the previously omitted
  `protocol_fee_bips` column.

Statements show market-token value, funded unclaimed withdrawals, total lender
obligations, outstanding protocol fees and total market obligations separately.
The headline includes all lender obligations. Monthly activity and monthly
interest/fees use separate tables to keep PDFs readable.

Previously downloaded bundles retain their schema. No aliases for the retired
fields are emitted. Consumers must check `manifest.schema_version` and update
column mappings. No database migration is required for this reporting change.
