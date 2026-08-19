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
