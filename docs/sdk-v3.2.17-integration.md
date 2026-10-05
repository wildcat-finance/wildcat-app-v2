# SDK 3.2.17-beta integration

Prepared on 2026-10-05 on `feat/v2.5-sdk-3.2.17-beta`, based on the completed
lifecycle-controls branch at `da13712b5802917410dbafe764dfd272527268fe`.
The dependency and proxy-test update was committed and pushed by the operator
as `691a7eca711905ec838022c9ef4ae96c697aa2aa` during verification.

The manifest and lockfile pin the published `@wildcatfi/wildcat-sdk@3.2.17-beta`
artifact; no other package changed. Its registry integrity is:

```text
sha512-wDznLIJ4DwBeF1F+XYmKTZ0qtliEEjvVBuVaUqe+coFcsMzDzu3gm0mgBUMQVl5zEj8jBXIxKPq86MXal614Eg==
```

All 508 installed runtime/type files match the verified SDK build at
`fdc69f8a4c70f13d601d4a17d51389e172e86ade`. The app uses the registry artifact.
The SDK's [release notes](https://github.com/wildcat-finance/wildcat.ts/blob/fdc69f8a4c70f13d601d4a17d51389e172e86ade/docs/releases/3.2.17-beta.md)
own the protocol V2.5.7 address rotation, subgraph V2.5.15 routing, provider
parity evidence and immutable wrapper-generation boundary.

## App behavior

The app's Graph proxy derives its upstream route from the SDK, so it now uses
`/sepolia/v2.5.15` without a proxy implementation change. The existing routing
test now expects that release. Browser requests still use the chain-scoped
same-origin proxy; credentials remain on the server.

Market deployment and live hydration use the new standard/revolving factories,
wrapper factory and lens supplied by the SDK. The existing wrapper capability
gate prevents new wrappers through unsupported predecessor factories; existing
indexed wrappers remain readable. Mainnet and Plasma configuration is unchanged.

The [repayment schedule, lifecycle/history and surplus controls](./market-lifecycle-controls.md)
and [shared default-status integration](./sdk-v3.2.16-integration.md) are retained.
The new protocol factories reuse the same V2.5.6 hook implementations, so their
repayment constraint defaults and freeze detection require no app change.

## Verification

Checked with Node 22.22.1 and npm 11.12.0:

- All 149 Jest suites / 945 tests passed, including the existing repayment,
  surplus recovery, deployment encoding, wrapper and gateway tests.
- TypeScript, error-level lint, exact dependency policy, normal-policy
  `npm ci --dry-run`, and whitespace checks passed.
- Prisma generation and the Next production build passed with
  `NEXT_PUBLIC_TARGET_NETWORK=Sepolia`. The build still reports warnings in
  unchanged source files.
- The installed SDK passed live checks through the local production app's
  authenticated Graph and RPC proxies. All 41 HTTP requests returned 200,
  and the client sent no gateway bearer header. The server credential was
  supplied only to the temporary server process.

[Retained live observations](./evidence/sdk-v3.2.17-proxy-2026-10-05.json) cover
08:02–08:03 UTC, with Sepolia RPC observed at block 11847563:

- The expected subgraph configuration digest and both V2.5.7 deployment
  targets passed SDK validation.
- The app's borrower-hooks read path loaded 51 template registrations and
  five existing hook instances. All six new factory/template combinations
  were enabled, registered and passed deployment eligibility checks with
  matching init-code commitments.
- The indexed market list contained 484 markets. Live refresh through the
  app's viem provider adapter passed for a historical periodic revolving
  market and a historical standard market.
- The historical wrapper for market
  `0x4c02b9e4e699b9ec5f984510946656ea3c80d5a5` remained discoverable as
  `0x4a8e8baecd16e871ce6633d5b285fef20c044d88`.
- A Mainnet RPC and indexed-market control read passed through the same app
  proxy for `0x262dd546703760adda0c06279508e04bd1f60dee`.

The seven-day npm release-age policy is unchanged. Installing this explicitly
requested fresh SDK used the command-local `--min-release-age=0` exception;
the resulting lockfile passed the normal installation policy.

The existing database integration suite `src/app/api/profiles/profile.test.ts`
was excluded because this host has no dedicated test database. Database-backed
profile/agreement behavior and signed wallet flows were not exercised. The
checks establish local production-build behavior, not an app deployment.

## Operator handoff

The integration commit retains the completed lifecycle controls. Merge through
the agreed app integration branch and deploy using the existing server-only
gateway configuration. Confirm wallet execution for a newly created scheduled
market, wrapper creation, repayment/closure and surplus recovery. No public-chain
transactions or app deployments were performed during these checks.
