# Audit log: restrict removed borrowers (product#789)

## Step 1, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran per the non-Solidity rule.

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. phylax, ephoros, hypomnema all exit 0. Manual review against the
risk register: pure state machine has no I/O; migration is additive with
defaults, reversible; persistence helpers lowercase addresses consistently and
guard the removal transition on row existence. Carried note for step 2:
setRestrictionOverride throws Prisma P2025 on an unknown borrower, so the PUT
route must 404 before calling it.

Leads not pursued: none

## Step 2, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran (all exit 0); jest 29 passed;
eslint 0 errors on changed files; tsc --noEmit exit 0 (after generating the
gitignored next-env.d.ts a fresh clone lacks; the step-1 receipt's tsc claim
predated that file, and re-running against the step-1 content confirms it
held for code the step actually shipped).

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. Manual review: POST sync trusts only its own archcontroller
read and fails closed on RPC errors; PUT enforces token, admin, DTO, and
existence checks before any write (clears the step 1 carried note); the
Slack URL is never logged; enforcement is server-side in both write routes.

Leads not pursued: two concurrent first syncs can each fire the Slack
notification (duplicate message, no state harm); the sync route has no rate
limit, consistent with every other route in the repo. Both accepted for the
prototype.

## Step 3, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran (all exit 0); jest 41 passed
across 4 suites; eslint 0 errors; tsc --noEmit exit 0.

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. Manual review: fail-closed gate covered by tests (restricted
sticks through backend downtime via the persisted cache); market deployment
is also enforced onchain by the factory's registration check, so the UI gate
is UX rather than the security boundary; profile and description writes are
enforced server-side from step 2. Carve-out pinned mechanically.

Leads not pursued: a removed borrower whose first-ever restriction read
fails (no cache) sees the default banner until a read succeeds; accepted,
the chain and API remain the enforcement.

## Step 4, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran (all exit 0); jest 43 passed
across 5 suites; eslint 0 errors; tsc --noEmit exit 0.

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. Manual review: the admin mutation refuses client-side without
an admin token for the selected chain and the server re-checks with
isAdminForChain regardless; the override buttons disable while pending; the
bearer token is sent only to the app's own origin-relative API path.

Leads not pursued: none

# Audit log: fixed-term termination reason (product#538)

## Step 1, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran per the non-Solidity rule
(phylax, ephoros, hypomnema all exit 0); jest 11 passed; tsc exit 0; eslint
0 errors.

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. Manual review against the risk register: the helper keys on the
SDK status alone and never re-derives closability from raw config (the
allowTermReduction-off-Sepolia divergence risk); fixed-term details are only
attached for a FixedTerm hooks kind; every CloseMarketStatus value is pinned
to a flow by a test, so a future SDK enum addition fails the suite loudly at
type level (the routing type is exhaustive over the imported enum).

Leads not pursued: none

## Step 2, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran (all exit 0); jest src/utils
44 passed; tsc exit 0; eslint 0 errors (one pre-existing-pattern
exhaustive-deps warning, matching the file's original hook).

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. Manual review: the blocked view offers no transaction path (a
Close action only), so a blocked status can never reach closeMarket(),
whose own SDK assertion remains the backstop; indebted markets still route
to the repay flow (pinned by tests); the flow now recomputes on preview
status changes rather than only on modal open; copy comes from i18n keys
aligned with the parameters table's early-closure vocabulary.

Leads not pursued: the repay flow's own hardcoded English strings and its
unexplained UnpaidWithdrawalBatches state predate this ticket and stay as
they are; noted for a possible copy-cleanup ticket.

# Audit log: deposit max button (product#608)

## Step 1, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran per the non-Solidity rule
(phylax, ephoros, hypomnema all exit 0); jest 5 passed; tsc exit 0; eslint
0 errors.

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. Manual review against the risk register: the display string
comes only from the SDK's truncating format (no rounding, no commas); the
exact value is honoured solely while the input equals the filled string, so
a stale exact amount cannot survive a manual edit even if a caller forgets
to clear it; zero max returns null so the control has nothing to fill.

Leads not pursued: none

## Step 2, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran (all exit 0); jest src/utils
39 passed; tsc exit 0; eslint 0 errors (1 pre-existing-pattern
exhaustive-deps warning on the parse memo, same shape the file already
had).

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. Manual review: the fill can never exceed the depositable value
(the string is the SDK's truncating format and the exact amount is the SDK
value itself); the approve path uses the same effective amount as the
deposit, so approval covers the exact value; every reset path is covered by
the input-equality guard even where the exact state is not explicitly
cleared; the control hides on a zero maximum, matching the modal's existing
disable conditions.

Leads not pursued: the modal's on-screen strings remain hard-coded English
despite matching i18n keys existing; pre-existing, noted for a copy-cleanup
ticket alongside the same finding from the #538 loop.
