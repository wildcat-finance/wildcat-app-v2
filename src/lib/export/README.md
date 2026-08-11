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
snapshot value of scaled tokens still waiting in an unfunded batch. Position
earnings are split into cash payouts, value transferred with market tokens,
active market-token value, and pending withdrawal value; these categories
reconcile exactly to total economic earnings.

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
