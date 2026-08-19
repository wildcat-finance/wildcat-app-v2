# Audit log: terminated-market screens (product#442, product#443)

## Step 1, round 1 — 2026-08-19

Suite: waived (no Solidity); bundled lints ran per the non-Solidity rule
(phylax, ephoros, hypomnema all exit 0); jest 7 passed; tsc exit 0; eslint 0
errors (3 pre-existing exhaustive-deps warnings in untouched effects).

| id | severity | file | finding | status |
| --- | --- | --- | --- | --- |

Findings: 0. Manual review against the risk register: the render guard on
the section-1 block means a stale persisted `checked` cannot show the
Borrow and Repay content even before the fallback effect fires; the sidebar
uses the same helper so the two cannot drift; sections other than 1 are
never moved, so deliberate selections survive termination; the
non-interactable fallback behaves exactly as the code it replaced (pinned
by test). MarketStatusChart still renders inside section 1 during the one
render before the effect fires, which is the same content section 2 shows.

Leads not pursued: none
