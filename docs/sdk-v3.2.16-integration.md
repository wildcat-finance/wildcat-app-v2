# SDK 3.2.16-beta integration

Prepared on 2026-10-04 on `feat/v2.5-sdk-3.2.15-beta`, starting from
`integration/v2.5-develop` at `bde338ffcceef19680e594273f0c331f2f44e617`.
The manifest and lockfile pin the published `@wildcatfi/wildcat-sdk@3.2.16-beta`
artifact. Only the SDK dependency changes; its registry integrity is:

```text
sha512-tJCrJL98AxqbPlRcqH/xbClK17ATEe+2SYcAgiImhV4pur7SSKAaMNBukzo73Mlcl2Ie+d65rYkACn/NOqioUA==
```

The installed default-status helper and legacy reconstruction runtime files
match the prepared SDK build. The package's `docs/releases/3.2.15-beta.md` and
`docs/releases/3.2.16-beta.md` own the calculation rules, zero-fee validation
correction and SDK verification. This checkout uses the registry artifact,
not a local package link. The branch began with 3.2.15 and now includes its
published 3.2.16 correction.

## Profile default counts

`useMarketsInDefault` calls the SDK's `getMarketDefaultStatus` for every unique
market in the borrower list, including closed markets. Both full-profile and
market-profile views use it, with and without analytics enabled. The previous
app calculation based on `timeDelinquent - delinquencyGracePeriod` is removed.

The SDK uses a recorded flag when available and reconstructs legacy history
otherwise. Historical defaults stay counted after cure or closure. Penalty
decay and uninterrupted delinquency are separate clocks owned by the SDK;
the app's current penalty status and countdown retain their existing behavior.
The default-count tooltip now describes historical defaults and repayment
deadlines rather than uninterrupted penalty-fee accrual.

Zero penalty APR still counts toward the 90-day default rule. The SDK accepts
legacy zero-fee markets whose stored fee timer stays zero, including after a
keeper advances their accrual timestamp. The app delegates this distinction
to the SDK.

An unloaded or failed borrower list, an unknown SDK result, or a failed status
read leaves the total unavailable (`—`). A confirmed empty list produces zero.
A failed refresh hides a previously cached count rather than presenting it as
current. No partial count is shown while required statuses are unresolved.

Reads use the app gateway client for the profile's explicit chain. Inputs are
copied before asynchronous work, deduplicated by chain/address and sorted for
stable caching. The query key includes market membership, the recorded default
timestamp, closure and delinquency flags. Lifecycle changes trigger a fresh
read; routine accrual-clock changes do not restart every history traversal.
Legacy history refreshes every minute, with at most four concurrent reads per
count query. Cancellation reaches the SDK when a query is superseded or loses
its observer. No additional subgraph schema or deployment is required.

## Verification

Checked with Node 22.22.1 and npm 11.12.0:

- 144 Jest suites / 889 tests passed. New coverage includes closed/defaulted
  markets, explicit false and unknown SDK results, error recovery, chain/profile
  changes, cancellation, in-place model updates, deduplication, concurrency and
  refresh cadence.
- TypeScript, error-level lint, exact dependency policy, both translation checks
  (1,895 resolved call sites) and `npm ci --dry-run` passed.
- The Next production build passed with `NEXT_PUBLIC_TARGET_NETWORK=Sepolia`.
  Prisma's generated client was retained from the preceding integration pass.
- Both history query documents, including the added penalty-rate field, passed
  the app's subgraph-request validator.
- With a server-only gateway credential supplied for the local production
  server, graph and RPC requests passed through the authenticated app proxy on
  Mainnet and Sepolia. The installed SDK's history queries passed through that
  same proxy at Mainnet blocks 26122099–26122100 and Sepolia block 11845041,
  including block-pinned pagination with a page size of three.
- A headless Chromium check of public borrower profiles rendered the counts
  below, matching independent reads using the installed SDK through the app
  proxy. Both history query variants ran successfully in the browser; all
  observed gateway responses were HTTP 200, with no uncaught browser errors
  or authorization headers on browser-to-app gateway requests. This exercised
  the core profile page; the analytics UI was disabled in this build.

Profile observations on 2026-10-04:

| Network | Borrower | Markets | Defaults | Defaults in closed markets |
| --- | --- | ---: | ---: | ---: |
| Mainnet | Wintermute (`0xb00f9d7c25a044117d29f4b34521528076916a17`) | 5 | 0 | 0 |
| Mainnet | Halalcash (`0x40a42340c7829d1b31eed3860928b4862715e5de`) | 7 | 4 | 0 |
| Mainnet | Kinto (`0x2e7111ef34d39b36ec84c656b947ca746e495ff6`) | 1 | 1 | 0 |
| Mainnet | Trevee (`0x0792dcb7080466e4bbc678bdb873fe7d969832b8`) | 1 | 1 | 0 |
| Sepolia | `0x1717503ee3f56e644cf8b1058e3f83f03a71b2e1` | 43 | 11 | 6 |

These samples used legacy-history reconstruction. Recorded flags, unknown
results and refresh failures are covered by the automated tests above.

The existing database integration suite `src/app/api/profiles/profile.test.ts`
is excluded; it needs a dedicated test database and server RPC configuration.
The fresh SDK installation used a command-local `--min-release-age=0` exception;
the repository's seven-day policy remains intact, and the resulting lockfile
passes normal installation-policy checks.

`DATABASE_URL` is unset locally: profile metadata and service-agreement APIs
returned HTTP 500 during the browser checks, so their database-backed behavior
was not verified. The server also logged an `indexedDB is not defined` error
from WalletConnect's storage initialization; the profile pages still returned
HTTP 200 and the browser checks above passed. Wallet initialization was not
changed in this integration.

The temporary browser and server were stopped after verification. The gateway
credential was supplied only to the server process, with no tracked credential
changes. These checks establish local production-build behavior, not a deployed
app release. No app publication, deployment or public-chain transaction was
performed.

## Handoff

The installed 3.2.16 artifact includes the zero-fee replay-validation correction.
Replaying both captured Halalcash histories with the installed helper retains
their original default timestamps after simulated keeper timestamp advancement.
The SDK's `docs/releases/3.2.16-beta.md` owns the underlying reproduction and
protocol comparison.

Operator commit, push and integration merge remain pending. Repayment-scheduling
and surplus-recovery controls remain the subsequent feature branch, following
the two-step integration plan. The prior compatibility behavior and deployment
smoke-check limits are documented in [3.2.14 integration](./sdk-v3.2.14-integration.md).
