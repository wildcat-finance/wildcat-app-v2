# E2E fixture manifest

The contract `provisionFixtures()` (`e2e/lib/provision.ts`) must satisfy. It provides the board's
fixtures by direct chain-side **factory provisioning** of the borrower-#3 market/policy set the
other suites consume, instead of driving the create-market wizard
(`borrowerflows/market-creation.spec.ts`) as the `fixtures` Playwright project; that suite still
runs on the board as coverage.

This file exists in both worktrees and describes both variants:

- **v2.5** — `wildcat-app-v2`, branch `feat/local-fork-harness-v2511`, SDK `3.2.7-beta`,
  fork subgraph `wildcat-sepolia-fork` (v2.5.11).
- **main** — `wildcat-app-main`, branch `feat/local-fork-harness-main`, SDK `3.1.17`,
  fork subgraph `wildcat-sepolia-fork-v218` (v2.1.8).

---

## Two fixture sources

1. **Pinned pre-fork markets** — `harness/fork/pins*.json` `markets.*`
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

## v2.5 fixture manifest (borrower #3)

`provisionFixtures()` deploys these 11 markets — a 1:1 reproduction of the wizard's MKT set. All use
the pinned `openTerm` mock asset, `depositAccess = RequiresCredential`, `withdrawal/transfer = Open`,
APR 10% / penalty 10% / grace 1h / cycle 1h / capacity 1,000,000 / min deposit 100 (unless noted).

| # | namePrefix | policy | term | kind | access | maturity | wrapper | notes | consumed by |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `E2E MC1` | `E2E Pol A` | open | standard | self-onboard | — | no | reserve 20% | BOP-04 (`name_contains "E2E Pol A"`); general open market / spare |
| 2 | `E2E MC2` | `E2E Pol A2` | open | standard | self-onboard | — | no | | spare open-term (close targets) |
| 3 | `E2E MC4` | `E2E Pol B` | **fixed** | standard | self-onboard | **UTC midnight +30d** | no | allow closure + reduction | borrower-ops `fixedTerm` → BOP-15/BOP-18; periodic LEN-35; zz-final LEN-35b |
| 4 | `E2E MC4b` | `E2E Pol B2` | **fixed** | standard | self-onboard | **UTC midnight +12d** | no | allow closure + reduction | borrower-ops `earlyCloseTerm` → BOP-24 (**destructive close**) |
| 5 | `E2E MC5` | `E2E Pol R` | open | **revolving** | self-onboard | — | no | reserve **0%**, commitment fee 2% | apr-rcf-operations RCF (BOP-16/33) |
| 6 | `E2E MC6` | `E2E Pol P` | **periodic** | standard | self-onboard | — | no | period 30m, window 10m | apr-periodic (BOP-17) |
| 7 | `E2E MC7` | `E2E Pol RP` | **periodic** | **revolving** | self-onboard | — | no | commitment fee 1.5%, period 1h, window 30m | wrappers-deployment WRP-05 (`isUnclaimedSpare`, **destructive close**) |
| 8 | `E2E MC13` | `E2E Pol C` | open | standard | **allowlist** | — | no | borrower-administered AccessList provider | borrower-ops `primary` (BOP-02/03/05); allowlist-closure LEN-16 |
| 9 | `E2E MC14` | `E2E Pol D` | open | standard | **allowlist** | — | no | second allowlist policy | credential-expiry LEN-34 (`candidates[1]`) |
| 10 | `E2E MC16` | `E2E Pol E` | open | standard | self-onboard | — | **yes** | ERC-4626 wrapper at creation | wrappers-deployment WRP-04; wallet-transitions wrapper fallback |
| 11 | `E2E MC20` | `E2E Pol A3` | open | standard | self-onboard | — | no | | extra self-onboard spare (BOP-22/23 → LEN-20) |

**Shape-selector predicates these satisfy** (from the consumer suites):

- `isOpenTermRow` = `fixedTermEndTime===0 && periodDuration===0 && marketKind!=="REVOLVING"`.
- allowlist primary = first `isOpenTermRow` with `accessListProviders(hooks).length > 0` →
  **MC13**; `candidates[1]` → **MC14**.
- `fixedTerm` = among `fixedTermEndTime>0`, sorted maturity DESC, `.find(allowTermReduction)` →
  **MC4 (30d)**; `earlyCloseTerm` = a different fixed-term with `allowClosureBeforeTerm` →
  **MC4b (12d)**. Maturities must differ (30d vs 12d) and MC4 must have ≥ ~8-10 days slack for
  BOP-18's reduction.
- RCF = `!isClosed && marketKind==="REVOLVING" && periodDuration===0` → **MC5**.
- periodic = `!isClosed && periodDuration>0 && marketKind!=="REVOLVING"` (window<period) → **MC6**.
- `isUnclaimedSpare` = `marketKind==="REVOLVING" && periodDuration>0` → **MC7**.
- wrapper-at-creation = open-term with a registered wrapper → **MC16**.

**Pure pin consumers (no #3 market needed):** deposit-withdraw, agreements, multi-cycle,
periodic LEN-23/23b/23c/25, wrappers-transfers, withdrawal, fork.smoke, discovery/portfolio (whole
catalogue + `openTerm`/`periodic`/`fixedTerm` pins). **No fixtures at all:** admin, onboarding.

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

Both variants call the **same hooks-factory path the app's create-market flow calls**, mined
directly instead of driven through the wizard UI:

    template.previewDeployMarket(params)  →  factory[preview.fn](...preview.args)  →  tx.wait()

### v2.5 (`e2e/lib/provision.ts`)

Traced from `src/app/[locale]/borrower/create-market/hooks/useDeployV2Market.ts` +
`src/utils/createMarketDeploy.ts` + `page.tsx`:

- **signer**: `new ethers.providers.JsonRpcProvider(FORK_RPC).getSigner(borrower)` (anvil #3 is
  anvil-owned; anvil signs, no impersonation).
- **templates**: the app's own path — `createSubgraphClient(CHAIN_ID, FORK_GQL)` →
  `getHooksTemplateRegistrations(client, {fetchPolicy:"network-only"})` →
  `getBorrowerHooksData({chainId, signerOrProvider, hooksTemplateRegistrations, borrower})`. Pick by
  `template.kind` (`OpenTerm` / `FixedTerm` / `PeriodicTerm`) **AND** the target factory: v2.5
  registers templates PER FACTORY (standard vs revolving), so kind alone lets `previewDeployMarket`
  reject the template as `WrongHooksFactory`. Match the app's `getDeployableHooksTemplate`
  (`useNewMarketHooksData`): `kind === wanted && template.hooksFactory === getHooksFactoryAddress(chainId, marketKind) && getHooksTemplateDeploymentStatus(template, marketKind) === undefined`.
- **asset**: `Token.getTokenData(CHAIN_ID, <pins.markets.openTerm asset>, signer)` (reuses the
  pinned mock; does **not** mint a fresh mock — that staged step is asserted by MKT-19 coverage).
- **params** (mirror `page.tsx` `realParams`): bips = percent×100, durations = hours×3600, salt =
  `borrower + randomBytes(12)` (the caller-prefixed shape the v2.5 factory requires, from
  `getNewMarketSalt`), `depositAccess=RequiresCredential`, `withdrawal/transfer=Open`,
  `hooksInstanceName=<policy>`. Role providers (from `getCreateMarketRoleProviderInputs`):
  self-onboard → `existingProviders:[{OpenAccessRoleProvider, 90d}]`; allowlist → `newProviderInputs`
  with `encodeAccessListRoleProviderDeploymentInputs({administrator:borrower, initialMembers:[], salt})`
  + `roleProviderFactory=AccessListRoleProviderFactory`. Term extras: `fixedTermEndTime`,
  `allowClosureBeforeTerm`, `allowTermReduction` (fixed) / `firstWithdrawalWindowStart`,
  `periodDuration`, `withdrawalWindowDuration` (periodic) / `commitmentFeeBips` (revolving).
- **factory**: `getStandardHooksFactoryContract` / `getRevolvingHooksFactoryContract` by market
  kind; market address = `factory.computeMarketAddress(salt)` (then assert non-empty `getBytecode`).
- **wrapper** (MC16): `WrapperFactory.getWrapperForMarket` → `WrapperFactory.createWrapper` if absent.
- **borrower registration**: reuses `ensureBorrowerRegistered` (`registerBorrower` on the testnet
  `MockArchControllerOwner` `0x981f1F…`, ArchController `0xC003f2…`).

### main (`e2e/lib/provision.ts`)

Reuses `deployMarket` from `mainflows/lib.ts` (already proven by `v2-protocol.spec.ts`): SDK
`getLensV2Contract(...).getHooksDataForBorrower(borrower)` → `hooksTemplateFromLens` →
`getHooksFactoryContract` → `template.previewDeployMarket(params)` →
`factory.deployMarketAndHooks(...)`, resolving the market from the `MarketDeployed` event. Open-term,
open-access, pinned asset reused.

### Idempotency

Before each deploy, `provisionFixtures()` queries the fork subgraph for #3 market names and skips a
fixture whose space-terminated name prefix (`"E2E MC1 "`, disambiguating MC1 from MC13 and MC4 from
MC4b) is already present. Safe to re-run against the same fork; on a fresh fork (reset between
boards) it redeploys the set.

---

## Per-variant differences (summary)

| | v2.5 | main |
|---|---|---|
| Downstream #3 discovery | Yes — shape-based (`borrowerMarkets()`) | No — uses impersonated `pins.borrower` |
| Fixed-term fixture | provisioned #3 markets (MC4/MC4b) | pinned `pins.markets.fixedTerm` |
| Periodic / revolving | provisioned (MC5/MC6/MC7) | not supported / not consumed |
| Allowlist markets | provisioned (MC13/MC14) | not provisioned (unconsumed; SDK path differs) |
| Wrapper market | provisioned (MC16) | none (main has no v2.5 wrapper) |
| Template fetch | `getBorrowerHooksData` (+ subgraph client) | lens + `hooksTemplateFromLens` (`mainflows/lib`) |
| Factories | standard **and** revolving | standard only |
| Provisioned count | 11 | 2 |

---

## Fixture → consumer map

For each v2.5 fixture, the provisioning site and the downstream consumer that reads it back:

- **MC1** `FIXTURES[0]` (self-onboard open) → BOP-04 `hooksInstances(name_contains "E2E Pol A")`;
  any open-market/edge selector.
- **MC4 (30d) / MC4b (12d)** `FIXTURES[2..3]` (fixed, closure+reduction) →
  borrower-ops setup (`fixedTerm` = latest w/ reduction = MC4; `earlyCloseTerm` = MC4b) → BOP-15,
  BOP-18, BOP-24; `resolveFixedTermFixture` → periodic LEN-35, zz-final LEN-35b.
- **MC5** `FIXTURES[4]` (revolving, reserve 0) → apr-rcf `find(REVOLVING && periodDuration===0)`.
- **MC6** `FIXTURES[5]` (periodic) → apr-periodic `filter(periodDuration>0 && !REVOLVING)`.
- **MC7** `FIXTURES[6]` (revolving+periodic) → wrappers-deployment `isUnclaimedSpare` (WRP-05).
- **MC13 / MC14** `FIXTURES[7..8]` (allowlist) → borrower-ops `primary` + allowlist-closure LEN-16
  (MC13); credential-expiry LEN-34 `candidates[1]` (MC14).
- **MC16** `FIXTURES[9]` (+wrapper) → wrappers-deployment WRP-04; wallet-transitions.
- **MC2 / MC20** `FIXTURES[1],[10]` (self-onboard open spares) → borrower-ops close targets
  (`closeRepayTarget`/`closeEmptyTarget`, BOP-22/23) → allowlist-closure LEN-20 (closed market
  with a lender balance).

Ordering guarantee: `fixtures` runs first (earliest `createdAt`); within `board`, `borrower-ops`
(destructive fixed-term/spare closes) runs **before** `market-creation` (alphabetical), so it only
ever sees the provisioned markets. `lenderflows` run after and see both provisioned and wizard
markets, with the provisioned ones selected first by `createdAt asc`.

## MLA decision on provisioned fixtures

Every fixture market gets an MLA **refusal** recorded right after deploy: `deployFixture()` calls
`recordMlaRefusal()` (`e2e/lib/provision.ts`) once per market, which signs
`DECLINE_MLA_ASSIGNMENT_MESSAGE` with the fixture borrower's key and POSTs
`/api/mla/<market>/decline` — the same ceremony the wizard's "Don't Use" + "Sign MLA Refusal" step
performs, driven headlessly instead of through the UI. It is idempotent: a market whose
`GET /api/mla/<market>` already returns 200 (an existing refusal, or a signed MLA — see below) is
left alone, and a `409` from the decline POST (a decision recorded between the pre-flight GET and
the POST) is treated as already done, not a failure. Without this step a market carries no MLA
decision at all, which the borrower market page treats as an unrecoverable gate — the "Select MLA
Settings" banner replaces the whole page body instead of just gating the MLA section.

## Fixture the provisioner does NOT reproduce via factories

- **A borrower-pre-signed MLA** on the MC16-equivalent market. `borrower-ops`'s MLA-execution case
  iterates #3 markets for one whose `/api/mla/<id>` returns a `borrowerSignature`. That artifact is
  an **off-chain DB record** (`MasterLoanAgreement` + `MlaSignature`, keyed by a signature the app
  verifies against a server-rendered MLA message — `POST /api/mla` → `verifyAndDescribeSignature`),
  not a factory call. The provisioner deploys the MC16 market + wrapper shape and records the same
  **refusal** every other fixture gets (above), not a signed MLA. That case already `test.skip`s
  gracefully when no such market exists (it says "MKT-16 … deploys one"); on a board it recovers
  as coverage when `market-creation`'s MKT-16 runs later. Reproducing it in provisioning would
  require replaying the app's MLA templating + a real anvil-#3 `personal_sign`, or DB-seeding a
  full rendered agreement — out of scope for a factory provisioner.

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
