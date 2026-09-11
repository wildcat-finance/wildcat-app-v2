# E2E fixture manifest

The contract `provisionFixtures()` (`e2e/lib/provision.ts`) must satisfy. It provides the board's
fixtures by direct chain-side **factory provisioning** of the borrower-#3 market/policy set the
other suites consume, instead of driving the create-market wizard
(`borrowerflows/market-creation.spec.ts`) as the `fixtures` Playwright project; that suite still
runs on the board as coverage.

This branch's provisioner is the **main** variant's (SDK `3.1.17`, fork subgraph
`wildcat-sepolia-fork-v218`, v2.1.8). The v2.5 branch (`feat/automated-tests-2.5`) carries its own
`provision.ts` and its own copy of this file describing the eleven-market v2.5 set.

---

## Two fixture sources

1. **Pinned pre-fork markets** — `harness/fork/pins.json` `markets.*`
   (`openTerm 0x07878e16…`, `periodic 0x0329c128…`, `mla 0x0e52d4a2…`, `noMla 0x07878e16…`,
   `fixedTerm 0xf2d12f32…`, `wrapperMarket 0x1d547b4d…`, `wrapper 0x297fc91e…`,
   `transferOpen/…Disabled/…Restricted`) plus, on **main**, `pins.borrower` (the impersonated
   pre-fork borrower `0xe9aee885…` and its markets). These already exist on the fork at the pin
   block; **provisioning does not touch them**. Most lender suites read these directly.

2. **Wizard-created markets** — the "E2E MC…" markets/policies
   `borrowerflows/market-creation.spec.ts` deploys for **anvil #3** (`0x90F7…906`). These are what
   `provisionFixtures()` reproduces via the factory.

Downstream suites discover #3 markets by **shape** (`borrowerMarkets()` in
`e2e/borrowerflows/lib.ts`, ordered `createdAt asc, first: 50`; `resolveFixedTermFixture()` in
`e2e/lenderflows/lib.ts`), never by exact name — except `borrower-ops` BOP-04, which matches the
policy name pattern `name_contains "E2E Pol A"`. Because the `fixtures` project runs first,
provisioned markets carry the **earliest** `createdAt`, so every "first / oldest" selector lands on
them deterministically.

---

## main fixture manifest (borrower #3)

**Small by design.** On main the borrower/edge suites discover from the **impersonated pre-fork
borrower** (`pins.borrower.address`), not #3; the fixed-term fixture resolves to the pinned
`pins.markets.fixedTerm` (the v2.1.8 fork subgraph does not index the v2.5 fork markets, and #3
owns none there at board start); periodic/revolving/allowlist/wrapper shapes are absent or
unconsumed; and `mainflows/v2-protocol.spec.ts` self-provisions everything it needs. So `main`'s
`provisionFixtures()` only:

1. `syncChainTimeToWallClock()`, `ensureBorrowerRegistered()` (#3), `seedBorrowerProfile()` (#3) —
   needed by market-creation coverage and `mainflows/market-creation-order.spec.ts` (MKT-M01);
2. deploys **2 open-term self-onboard markets** under #3 (`E2E MC1`, `E2E MC2`) for parity with the
   wizard-as-fixtures stage. **No fixed-term** (that would divert `resolveFixedTermFixture` off its
   pinned fallback); no periodic/revolving/allowlist/wrapper (main's SDK/app has no such shapes).

| namePrefix | term | access | consumed by |
|---|---|---|---|
| `E2E MC1` | open | open access | none directly — catalogue parity (discovery counts anonymous rows) |
| `E2E MC2` | open | open access | none directly — catalogue parity |

---

## Provisioning approach + exact factory calls

The provisioner calls the **same hooks-factory path the app's create-market flow calls**, mined
directly instead of driven through the wizard UI:

    template.previewDeployMarket(params)  →  factory[preview.fn](...preview.args)  →  tx.wait()

### main (`e2e/lib/provision.ts`)

Reuses `deployMarket` from `mainflows/lib.ts` (already proven by `v2-protocol.spec.ts`): SDK
`getLensV2Contract(...).getHooksDataForBorrower(borrower)` → `hooksTemplateFromLens` →
`getHooksFactoryContract` → `template.previewDeployMarket(params)` →
`factory.deployMarketAndHooks(...)`, resolving the market from the `MarketDeployed` event. Open-term,
open-access, pinned asset reused.

### Idempotency

Before each deploy, `provisionFixtures()` queries the fork subgraph for #3 market names and skips a
fixture whose space-terminated name prefix (`"E2E MC1 "`, so a prefix never matches a longer
number) is already present. Safe to re-run against the same fork; on a fresh fork (reset between
boards) it redeploys the set.

---

## Ordering

The `fixtures` project runs first, so the two provisioned markets carry the earliest `createdAt`
under #3. On this variant `borrower-ops` does not consume them — it discovers from the impersonated
pre-fork borrower (`pins.json.borrower`) — and `market-creation` runs on the board as coverage with
its own run-stamped markets.

## What the provisioner does not reproduce

Off-chain artefacts: a borrower ToU acceptance or MLA choice is an app-DB record keyed by a
signature, not a factory call. On this variant the borrower ceremonies are seeded in the app DB by
the borrower-ops setup (`helpers.ensureOpsBorrowerTouSigned`, `helpers.seedMlaRefusal`; see
`KNOWN-ISSUES.md` H2), not by the provisioner.

---

## Validate against a FREE fork

The fixtures project **is** the standalone entry:

    # deploy the fixture set only (no board):
    npx playwright test --project=fixtures

    # full board (fixtures → everything, incl. market-creation as coverage):
    npx playwright test

    # iterate on one suite against an already-provisioned fork (skips the fixtures stage):
    npx playwright test <suite> --no-deps

`provisionFixtures()` is self-checking: every freshly deployed market must resolve to a
`0x…40`-hex address and index with a hooks instance, else the fixtures project fails loudly.
