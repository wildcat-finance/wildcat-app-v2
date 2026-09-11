# Known app issues found by the e2e UAT suites — `main`

Policy: the test suite documents app defects instead of fixing them — tests carry workarounds or
`test.fixme` / `test.fail` entries referencing this file by number. App fixes live on separate
branches, never in the test-suite history. Numbers are stable and never reused.

Each row carries one machine header in its last cell, wrapped in an HTML comment (opens `<!--`, closes
`-->`) so GitHub renders nothing: `ki: id=<n> severity=blocker|high|medium|low
status=open|fixed-upstream|fixed-verified|not-a-defect|owner-call|closed tests=<UAT ids, comma separated, or ->
blocks=<release>|no [decision=pending]`. The UAT report parses it into the release view
(`e2e/lib/knownIssues.ts`); a new row without one is invisible to the report.

`M*` are **main** app defects, measured on `origin/main` 564a189b (release 2.20.0) + SDK 3.1.17 +
subgraph v2.1.8 + Sepolia fork @ 11584253. `H*` are harness limits. The v2.5 branch
(`feat/automated-tests-2.5`) carries its own `e2e/KNOWN-ISSUES.md` for its own app and harness
findings.

## App defects (`1`–`5`)

| # | Finding | Status | Tests |
|---|---|---|---|
| 1 | Deep links to wallet-gated routes bounce during wallet reconnect: `useNetworkGate` redirects while `address` is briefly undefined; an unsigned borrower can land on `/lender/agreement`. | open; proposed fix on branch `fix/wallet-settling-deep-links` | suites connect first, then navigate (`gotoGatedBorrowerPath`, `connectAs`) <!-- ki: id=1 severity=medium status=open tests=- blocks=no --> |
| 2 | `/borrower/create-market` deep link: SSR hydration mismatch remounts the app mid-form. | open | wizard entered via the dashboard CTA <!-- ki: id=2 severity=medium status=open tests=- blocks=no --> |
| 3 | Policies sidebar item has no accessible role; "Assigned to Markets" column renders empty. | open | role queries avoided <!-- ki: id=3 severity=low status=open tests=- blocks=no --> |
| 5 | Success modal shown for a REVERTED borrow (stale gas estimate): `useBorrow` awaits `tx.wait()` without checking `receipt.status`. | open | `borrowThroughUi` verifies the on-chain balance delta <!-- ki: id=5 severity=high status=open tests=- blocks=no --> |

## App defects (`M*`)

| # | Finding | Status | Tests |
|---|---|---|---|
| M1 | "Market Token" copy button yields the explorer URL, not the address: `MarketParameters` passes `copy={getTokenUrl(market.marketToken.address)}` where every other row passes the bare address (v2.5 passes the address). | open; main-only regression, one-line fix | LEN-11 asserts the observed value on main <!-- ki: id=M1 severity=medium status=open tests=LEN-11 blocks=no --> |
| M2 | Borrower dashboard's two "Other Markets" totals disagree: `BorrowerDashboardSidebar` adds `terminatedOther`, `MarketSectionSwitcher` does not (v2.5 adds it in both). | open | LEN-06 accepts both observed totals on main <!-- ki: id=M2 severity=medium status=open tests=LEN-06 blocks=no --> |
| M3 | SDK 3.1.17's deployment manifest names a superseded `MockArchControllerOwner` (`0xa476920a…`) while `WildcatArchController.owner()` on the fork is `0x981f1Fb4…`. Anything routed through the manifest address reverts `Unauthorized()`, including the admin panel's Register control (`useRegisterTestnetBorrower`). | open on Sepolia for SDK 3.1.17 | `helpers.archControllerOwner` reads the owner from the chain; ADM-04/05 assert the panel's own Register button leaves `registered === false`, then register through the chain's real owner so the panel's reconciliation half still has something to reconcile <!-- ki: id=M3 severity=high status=open tests=ADM-04,ADM-05 blocks=no --> |
| M4 | `isFrontendVisibleMarket` hides periodic markets from every list while the detail route still renders them. | not a defect (deliberate, "tolerate periodic market data without exposing periodic ux"); drives a counting difference | `fetchAllMarkets` mirrors the filter <!-- ki: id=M4 severity=low status=not-a-defect tests=- blocks=no --> |
| M5 | create-market deploy dies with `invalid BigNumber value (value=undefined)`: `page.tsx#handleDeployMarket` forwards `fixedTermEndTime as any` unvalidated (the only raw numeric deploy parameter) and `FixedTermHooksTemplate.previewDeployMarket` (SDK 3.1.17) encodes it as a bare `uint32` with no default; ethers throws before any RPC. Open-term deploys reach the same error via M8. | confirmed, open; fix at the call site and/or default it in the SDK template | MKT-04 passes on main as a plain test: a fixed-term deploy with the maturity set goes through fine. The crash is reached via M8's template latch (new policy + Open Term Loan → FixedTermHooks with no maturity); the main-only "M5 deploy-parameter probe" pins that mechanism via `previewDeployMarket` + `callStatic`, and MKT-M01 asserts the latch itself; V2P-01 mines the same deploy with the maturity present <!-- ki: id=M5 severity=high status=open tests=MKT-04,MKT-M01,V2P-01 blocks=no --> |
| M6 | Borrower market page never left its skeleton for fork-created markets. | resolved: the cause is M7 | — <!-- ki: id=M6 severity=low status=closed tests=- blocks=no --> |
| M7 | `/api/market/get` (`src/app/api/market/get/route.ts`) imports `getServerSubgraphClient` (which honours `WILDCAT_SERVER_SUBGRAPH_URL_<NET>`) and never calls it; it builds its own `ApolloClient` from the SDK's hardcoded `SubgraphUrls[chainId]` and caches answers for 24 h. Any deployment whose subgraph is not the public one (every fork, preview and local stack) cannot render a market it created, because `useGetMarket` gates the borrower market page on this route. | open upstream; on this branch the route is routed through the env-aware client (harness env plumbing) | borrower-ops runs as a pre-fork borrower so its markets also exist on the public subgraph <!-- ki: id=M7 severity=medium status=open tests=- blocks=no --> |
| M8 | create-market latches the WRONG hooks template: `useNewMarketHooksData` chooses the template in an effect that reads `marketType` but lists only `[hooksData, policyValue]` as dependencies; `marketType` defaults to `""`, so "Create New Policy" latches `FixedTermHooks` and a later "Open Term Loan" never re-runs it. A `hooksData` refetch between the policy pick and deploy can heal it by accident, so it is a race. | open; fix by adding `marketType` to the dependency array or defaulting it | `helpers.fillPolicyStep` sets Market Type BEFORE the policy on main; MKT-M01 drives the natural order and asserts the latch when observable <!-- ki: id=M8 severity=high status=open tests=MKT-M01 blocks=no --> |
| M9 | The create-market completion modal closes on Escape AND on a backdrop click (plain MUI `Dialog` with default dismissal); v2.5 blocks both. | open, presentational | MKT-20 asserts the backdrop dismissal and that nothing re-signable sits behind the dialog <!-- ki: id=M9 severity=low status=open tests=MKT-20 blocks=no --> |
| M10 | Locked fixed-term withdrawals carry no explanation: main enforces the lock (`MarketActions` mounts `WithdrawModal` only when `withdrawalAvailability` is `Ready`) but has no `marketDetails.lender.transactions.withdraw.unavailable.fixed-term` copy. | UX gap | `LEN-35` (`e2e/lenderflows/fixed-term.spec.ts`) asserts that no reason copy renders before maturity <!-- ki: id=M10 severity=medium status=open tests=LEN-35 blocks=no --> |
| M11 | `GET /api/mla/[market]/acknowledgement` answers "missing" with 404 `{"error":"Acknowledgement not found"}` where v2.5 answers 200 `null` (deliberately nullable so the legal gate's presence check is not a console error). | API-contract divergence, cosmetic for users | `ensureNoMlaAcknowledged` requires a 2xx and a body that is neither null nor an error envelope <!-- ki: id=M11 severity=low status=open tests=- blocks=no --> |
| M12 | Lender-side post-hoc wrapper deployment is gated on `isAuthorizedLender && hasFactory && an ethers Signer && same chain` (`lender/market/[address]/components/WrapDebtToken/index.tsx:111`); under the harness (borrower account connected through the Local Anvil connector) the `Deploy Wrapper` control never renders on a market without a wrapper, while the borrower side hardcodes `canCreateWrapper={false}`. Not yet verified with a real wallet as an authorised lender. | open / unverified | MKT-23 asserts the observed absence on both sides <!-- ki: id=M12 severity=medium status=open tests=MKT-23 blocks=no --> |

## Harness limits (`H*`)

These constrain the shared fork the v2.5 branch also attaches to, not only this checkout.

### H1. The fork clock is one-way, and `LEN-35b` burns it, not only `BOP-14b` <!-- ki: id=H1 severity=high status=open tests=- blocks=no -->
`evm_increaseTime` is one-way. `LEN-35b` jumps the chain to the fixed-term
fixture's maturity (weeks to months from the pin), and `BOP-14b` jumps two weeks; both
leave the shared fork ahead **for the rest of that fork's life**. Every wall-clock ceremony breaks
once the chain leads by weeks: the ToU / MLA / no-MLA signature APIs bound `timeSigned` against the
SERVER clock, so the market-creation and onboarding fixtures guard with `chainNow - wallNow < 30 days`
and refuse to run. Hence the board order in `harness/fork/README.md` on the v2.5 branch §
"Running the board": signing suites first, `mainflows/v2-protocol.spec.ts` (small, bounded jumps,
signs nothing) in the middle, the maturity transition in `zz-final-phase/` last, `BOP-14`/`BOP-14b` excluded (`--grep-invert "BOP-14"` matches both by prefix).
`E2E_ALLOW_CHAIN_DRIFT=1` (`e2e/lib/env.ts`) downgrades the guards to a warning so the rest of a
suite can be triaged on an already-drifted fork; a run made with it set is not a clean verdict for
anything that signs.

### H2. An impersonated account can transact but can never sign <!-- ki: id=H2 severity=high status=open tests=- blocks=no -->
Every borrower that owns a market on main's fork is a real Sepolia account nobody has a key for
(see M7 for why a fork-created market is not an option). `anvil_impersonateAccount` unlocks such an
address for `eth_sendTransaction` only; `personal_sign` / `eth_sign` / `eth_signTypedData_v4` answer
`{"code":-32602,"message":"No Signer available"}` (measured against the fork node). So on main,
borrower ACTIONS (borrow, repay, APR, capacity, close, allowlist edits) run through the UI
unchanged, while the borrower CEREMONIES (ToU acceptance, MLA choice) are seeded in the app DB
(`helpers.ensureOpsBorrowerTouSigned`, `helpers.seedMlaRefusal`) with rows shaped like the ones the
API writes; nothing in the app re-verifies a stored signature. The ceremonies keep real coverage on
the v2.5 branch's own borrower flow, and here through page 2's onboarding suite (anvil-keyed
accounts). A signing borrower on main would need a market owned by an anvil account (blocked by M7
upstream) or an EIP-1271 contract signature.
