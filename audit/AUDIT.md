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
