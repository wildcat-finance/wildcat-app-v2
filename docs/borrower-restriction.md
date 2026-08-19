# Borrower restriction (product#789)

When the Foundation removes a borrower from the archcontroller, the app
restricts that borrower's UI: no new market creation, no borrower profile
editing, no market description editing. Debt repayment and market termination
stay fully enabled so the borrower can wind down. This document is the spec
the implementation follows; it ships with the code and is edited before the
code when a decision changes.

## Design

The removal state is a persisted flag on the `Borrower` row
(`removedFromArchController`, `removedAt`), set once by a self-verifying sync
and never re-derived onchain on page load. An admin can set a manual override
(`restrictionOverride`: `restricted` or `cleared`) that takes precedence over
the flag. The computed state is:

1. override `restricted`: restricted (source `override`)
2. override `cleared`: unrestricted (source `override`)
3. flag set: restricted (source `removal`)
4. otherwise: unrestricted (source `none`)

The pure rules live in `src/utils/borrowerRestrictionState.ts` (no prisma, no
wagmi), mirroring the ToU state machine in `serviceAgreementState.ts`.
Persistence lives in `src/lib/borrowerRestriction.ts`.

Removal detection uses the archcontroller's `isRegisteredBorrower` view,
called server-side. It never uses the subgraph's
`BorrowerRegistrationChange.isRegistered` field: `src/lib/registrar.ts`
documents that the subgraph writes `isRegistered: true` on removals.

The sync transition (`computeRemovalTransition`):

- not registered onchain and flag clear: set the flag, record `removedAt`,
  notify Slack (internal webhook, `SLACK_WEBHOOK_URL`).
- registered onchain and flag set: clear the flag (auto-clear on verified
  re-registration), unless a manual `restricted` override exists, in which
  case the flag is kept for auditability. The auto-clear choice follows the
  ticket's stated assumption and awaits Foundation confirmation.
- anything else: write nothing (idempotent).

## Fail-closed client semantics

The client gate (`computeRestrictionGateState`) reports `blocked`,
`unblocked`, or `unknown`. A successful read is authoritative. A failed read
falls back to the last known state, so backend or RPC downtime never
re-enables a restricted borrower; with no last-known state it reports
`unknown` rather than guessing.

## Surfaces

Restricted: create market (page block plus entry buttons), borrower profile
editing (page plus entry buttons, and the `/api/profiles/updates` route),
market description editing (editor plus the `/api/market-summary` route).
Server routes enforce the same rule; UI gating alone is not enforcement.

Never restricted: repayment and market termination. A test pins their
components clean of the restriction gate.

## Admin

`PUT /api/borrowers/[address]/restriction` sets or clears the override,
guarded by `verifyApiToken` and `isAdminForChain`, recording who set it and
when. The admin panel's borrower editor exposes the toggle.
