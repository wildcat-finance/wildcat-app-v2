# SDK 3.2.14-beta integration

Branch `feat/v2.5-sdk-3.2.14-beta` starts from `integration/v2.5-develop` at
`2e16121147adddefa3c7bc9ff7b2152a4bf5a20a`, the merge of PR #447. The manifest
and lockfile move from the published SDK 3.2.12-beta to 3.2.14-beta. No other
dependency changes. The registry package has SHA-512 integrity
`sha512-AarmjED2gRcJPAD8y3tW97fYsQJjzFKzMWFLx1aa+Dq3B0t6H4qktwqAuMvvIvbFUVzYv4/zzwr1dpa86bY8jQ==`.
The local SDK release checkout is `c63536f9c976c45f91c50bbad7d950b17c7b4b92`;
the integration checks use the installed npm artifact.

The SDK supplies the Sepolia V2.5.5 factories and lens, V2.5.6 hook-template
selection, and the V2.5.14 subgraph gateway route. Mainnet and Plasma routing
is unchanged by this app integration. The owning SDK migration notes are
[3.2.13-beta](https://github.com/wildcat-finance/wildcat.ts/blob/c63536f9c976c45f91c50bbad7d950b17c7b4b92/docs/releases/3.2.13-beta.md)
and [3.2.14-beta](https://github.com/wildcat-finance/wildcat.ts/blob/c63536f9c976c45f91c50bbad7d950b17c7b4b92/docs/releases/3.2.14-beta.md).

## Existing flows

- Deposits report `MarketInRepayment`; managed-market rows do not offer an
  access request when repayment has stopped deposits. Deposit and borrowing
  submissions refresh the market before checking availability.
- Withdrawal controls, notices and countdowns respect the SDK's observed
  repayment date: recurring windows and fixed-term admission no longer block
  queuing after that date. Withdrawal submissions refresh before each leg,
  including before unwrapping, and retain on-chain sanctions and balance checks.
- Capacity, minimum deposit (including zero), maturity and APR proposals use
  the new preview statuses. Open dialogs recompute previews when polled state
  changes. Submissions refresh market state before the SDK checks and sends.
  Hook freezes use the SDK's template identity, so predecessor hook instances
  keep their behavior even on the same factories.
- Core APR changes and reserve-ratio resets stop at the observed repayment
  date. Existing pending-APR execution controls and submissions obey that gate.
  These core restrictions also apply to repayment-enabled predecessor hooks.
- Optional repayment constraints preserve `undefined` for unsupported bounds
  and format supported durations in hours. The existing form continues to
  require its original constraints.
- Existing factory helpers encode the new deployment tuple for both EOA and
  Safe paths. Current forms retain the SDK's zero repayment-term defaults.
  Invalid or unsupported repayment-term previews have explicit error messages.

Lifecycle decisions use the SDK model's observed timestamp. Polling refreshes
visible controls; a fresh read precedes submission. State can still change
between a read, wallet approval and execution, and the contract is authoritative.

## Verification

Checked on 2026-10-04 with Node 22.22.1 and npm 11.12.0:

- 144 Jest suites / 888 tests passed. Coverage includes repayment starting in
  open dialogs, zero minimum deposit, predecessor hooks, failed refreshes,
  credential-free withdrawal admission at repayment, and both deployment
  functions for standard and revolving factories.
- TypeScript, error-level lint, both translation checks (1,895 resolved call
  sites), exact dependency policy, and `npm ci --dry-run` passed.
- Prisma generation and the Next production build passed with
  `NEXT_PUBLIC_TARGET_NETWORK=Sepolia`. The served `/lender` page returned 200.
- All 82 generated SDK query documents passed the app proxy request validator.
- The installed published SDK validated live metadata at
  `https://graph.wildcat.finance/sepolia/v2.5.14` and hydrated five indexed
  market records through that route.

The existing database integration suite `src/app/api/profiles/profile.test.ts`
was excluded; it needs a dedicated test database and server RPC configuration.
This checkout has no `WILDCAT_GATEWAY_TOKEN`: the local app proxy returned its
expected configuration-error 503. Authenticated app-proxy reads and signed
wallet flows still need a smoke check in the configured deployment. No app
publication, deployment, or public-chain transaction is established by these
checks.

The one-time installation used the command-local `--min-release-age=0`
exception for the explicitly requested fresh SDK. The repository's seven-day
policy is unchanged; the pinned lockfile passes the normal policy.

## Next branch

The operator requested two steps. Commit and integrate this compatibility
branch first, then branch from it for new repayment-scheduling and
surplus-recovery controls. Repayment/default history and lifecycle presentation
can be designed with those controls. This branch does not add them.
