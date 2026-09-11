# E2E conventions for the local fork harness

Hard-won rules from the smoke, withdrawal-lifecycle and Lender Flows (page 5) work. Every new spec
and every authoring agent MUST follow these; each one exists because its violation cost a debug cycle.

## Time
- Chain time only moves forward. `syncChainTimeToWallClock()` in suite setup; never assume chain == wall.
- The app classifies time-gated state (batch expiry, terms, windows) with `Date.now()` → market pages
  must be opened via `gotoMarket()` (installs the Playwright clock at chain time; timers keep ticking).
- Signature APIs (`/api/sla`, MLA, acknowledgements) bound the client's `timeSigned` to the SERVER
  wall clock → signing flows must run on WALL-clock pages (plain `page.goto`, no clock install).
- Playwright's clock installs ONCE per page, and `advanceTime` leaves it behind the chain. Re-sync
  every already-clocked page with `page.clock.setSystemTime(chainTs * 1000)` after a jump, or the
  app keeps classifying expired batches as pending (claimable renders 0 forever).
- Big `advanceTime` jumps are permanent for the fork lifetime. Order suites so months-long jumps run
  last (KNOWN-ISSUES H1), or ask on the v2.5 branch — which owns the stack — for a `dev:fork:reset`
  or a checkpoint restore.

## Transactions (e2e/lib/chain.ts)
- Always use the lib's write helpers: fixed 5M gas (estimation runs pre-time-travel and understates
  post-jump work → OutOfGas) and receipt-status assertion (viem does NOT throw on reverted txs).
- `queueWithdrawal`/`queueFullWithdrawal` return the SIMULATED expiry — the mined batch can be 1 s
  later. Never compare or reuse it: after queuing, `syncSubgraph()` + `findOpenBatchExpiry(...)`.
- After any tx batch, time travel, or before subgraph asserts: `syncSubgraph()` (mines one block —
  graph-node reliably notices a head change only on the NEXT block).
- Calling batch getters (`getAvailableWithdrawalAmount`, …) with a wrong expiry REVERTS.

## Amounts
- Deposits: read `hooksConfig.minimumDeposit`; deposit minimum + 1 unit. (The v2.5 chain hooks floor
  both sides, so an exact-minimum tender passes ON-CHAIN; app/SDK-side validation may still flag it.
  minimum+1 stays clear of both — but never write a negative test asserting exact-minimum reverts.)
- Batch payments and full exits can be short by ~1 wei (scale rounding). Tolerate dust (≤10–20 wei);
  `isCompleted` is still true.
- Market tokens REBASE upward every block. "Balance increased" is satisfied by interest dust — polls
  must demand the actual expected delta (e.g. `> before + amount/2`).
- Never hardcode withdrawal amounts against balances that accrue; use the Max chip or computed values.

## UI waits
- Success modals/views can UNMOUNT immediately when the app refetches (claim alert, full-withdrawal
  modal). Assert the durable end state (on-chain burn, claimable → 0, page value), not the transient
  modal. `data-tx-status="success"` exists only on the borrower FinalModals (claim flow); it is not present in lender withdraw/wrap flows.
- `isVisible({timeout})` does NOT wait. Use `expect(...).toBeVisible/toBeEnabled` or `.waitFor`.
- MUI quirks: DataGrid header cells also carry `data-field` (target `.MuiDataGrid-cell`); Select menu
  actions get `role="option"`; sidebar labels concatenate count badges ("Withdrawal Requests1" —
  match prefixes); quote/estimate fields debounce — wait for a non-zero estimate before submitting.
- MarketActions (available/claimable) lives in the default section; WithdrawalRequests only mounts in
  the "Withdrawal Requests" section — read the former before switching.
- The KYB explainer ("How Wildcat checks this profile") AUTO-OPENS on profile pages, and an open MUI
  Dialog aria-hides everything behind it — `getByRole` then matches nothing while `getByText` still
  works. Dismiss it via its "I understand" button before any role query. Dialogs can STACK (ToU
  prompt + KYB): use a bounded `click({timeout})` and fall back to Escape when the click is
  intercepted, looping until `getByRole("dialog")` is empty.
- A MUI Tooltip exposes its title as the CHILD's `aria-label` — there is no DOM `title` attribute,
  and no hover is needed. Assert `toHaveAttribute("aria-label", …)`, never a hover + tooltip read.
- A market page offers Deposit only to a lender that already holds the token; a zero balance renders
  the Faucet button instead. Fund with `faucet(...)` before driving any deposit-gated ceremony.
- The wallet auto-connects (Local Anvil reports `isAuthorized`); `ensureConnected` handles both paths.

## State hygiene
- Specs share ONE fork, ONE app DB, and accounts #0/#1/#2. Every suite's setup must self-clean:
  expire (selfClean) → repay+settle unpaid batches → claim leftovers, and assert the clean state.
  Order matters: a crashed run can leave a PENDING oversized batch — expire it before settling.
- Deployment ids are content-addressed; anything content-derived must be stamped unique.
- The app can use on-chain state the subgraph doesn't know (e.g. a newer wrapper instance) — resolve
  addresses from the page/chain at runtime rather than trusting pins for app-chosen contracts.
- Leave account #0 with a current ToU acceptance; other suites rely on it. But NEVER assume it:
  after a harness reset the DB snapshot holds no acceptances and every /lender page silently
  redirects to the agreement gate (tests then time out on "loading" grids). Any suite reading
  lender pages must call `ensureTouSigned` in its setup.
- UI deposit flows must run on an E2E-CREATED market, never a PINNED one. Pinned markets belong to
  real pre-fork Sepolia borrowers with no `Borrower` row in the sanitized app DB, so the no-MLA
  acknowledgement modal renders "Borrower profile is unavailable." with Acknowledge permanently
  disabled — the lender can never deposit through the UI there. (Chain-side deposits are fine.)
  On `main` this cuts the other way for BORROWER pages, where only pre-fork markets work (M6/M7).
- To pick an MLA-free fixture, ask the app: `GET /api/mla/<market>?chainId=…` answers `{"noMLA":true}`
  for a declined-MLA market and the full document otherwise — both status 200, so branch on the body.
- Profile reads on `main` are never stale: `GET /api/profiles/[address]` sets no cache headers, so
  an edit is visible on the very next read. A reload-poll after an edit is still harmless, so a
  shared test may keep one.

## Concurrency
- NEVER run two Playwright processes against the fork at once. Time travel and tx runs are globally
  serialized; read-only display suites may run while no tx/time suite is active. The v2.5 branch
  owns the shared fork and app DB; this checkout attaches to it, so this holds across both
  checkouts.
- Authoring agents: read-only probes are fine; transactions and time travel belong to the orchestrator.

## Running a suite
- `npm run board` runs the whole suite with the configured reporters (PW_VIDEO=on, so every row
  gets a video), then checks the artefact it wrote (`e2e/tools/check-board.mjs`); `npm run
  board:one -- <id>` re-runs one row against an already-fixtured fork. Both apply
  `harness/fork/.env.fork` to the Playwright process when it exists. Full convention:
  `harness/fork/README-main.md` § "Running the board".
- `--reporter=line` REPLACES the config's reporter list, it does not add to it: `summaryReporter`
  never runs, and `uat-report/{run.json,index.html}` + `playwright-report.md` silently keep the
  PREVIOUS run's numbers. Pass no `--reporter` at all, or
  `--reporter=line,./e2e/lib/summaryReporter.ts`.
- NEVER `-g` a subset of a serial suite whose setup DESTROYS state the later tests rebuild —
  onboarding's rolls back seeded ToU versions and un-registers Borrower B; v2-protocol's deploys the
  run's fixtures its whole file then depends on. Either the setup is filtered out and the subset runs
  on stale state, or it runs and leaves the board wrecked for everything that was filtered out. Run
  the whole file, then re-run it whole.

## Structure
- One spec file per runsheet area; `test.describe.serial`; `step(page, ...)` for major actions
  (screenshot film strip); `attachAgreement` for every page/chain/subgraph comparison; `test.fixme`
  with a reason comment for blocked cases.
- The UAT id at the start of a test title (`LEN-07:`) is the join key of the cross-app comparison;
  keep it stable. The rest of the title is free.
- Selectors: role+name from `src/locales/en/en.json` first; `data-testid` anchors only where text is
  ambiguous (keep anchors additive and tiny).
- Quality bar: `npx tsc --noEmit` and `npm run lint:errors` clean; every test fails meaningfully.
