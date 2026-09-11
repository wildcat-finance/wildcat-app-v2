/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import type { Locator, Page } from "@playwright/test"
import { formatUnits, parseUnits } from "viem"

import {
  BORROWER,
  accessGrantedRecords,
  accessListProviders,
  accessRevokedRecords,
  addAccessListMembers,
  addLenderThroughUi,
  adjustAprThroughUi,
  ensureAprApplied,
  ensureRatioReset,
  setAprOnChain,
  clearAprPeg,
  ensureCapacityApplied,
  ensureMarketClosed,
  borrowOnChain,
  borrowThroughUi,
  borrowerMarkets,
  closeDialog,
  collectFeesOnChain,
  erc20Transfer,
  feesCollectedRecords,
  fixedTermEndTimeOnChain,
  fixedTermHookedMarket,
  gotoBorrowerMarket,
  gotoPolicyLenders,
  latestAprRecords,
  latestBorrowRecords,
  latestCapacityRecords,
  latestRepayRecords,
  latestReserveRatioRecords,
  latestWithdrawalBatchExpiry,
  lenderHooksAccess,
  lenderRow,
  marketApr,
  marketBorrowable,
  marketClosedRecords,
  marketIsClosed,
  marketMaxTotalSupply,
  marketReserveRatio,
  marketRow,
  marketScaleFactor,
  openBorrowerSection,
  openRepayDialog,
  policyLendersTabIsSelfOnboard,
  providerIsMember,
  readAnchor,
  repayOnChain,
  setMaxTotalSupplyOnChain,
  simulateFrom,
  storedLenderStatus,
  strikeLenderRow,
  submitRepayDialog,
  tempExcessReserveRatio,
  waitBorrowerTxSuccess,
  type BorrowerMarketRow,
  providerMembershipIndexed,
} from "./lib"
import {
  ensureOpsBorrowerTouSigned,
  marketsWithMlaChoice,
  opsBorrowerConnect as BORROWER_CONNECT,
  pad2,
  seedBorrowerProfileFields,
  seedMlaRefusal,
  typeDateDigits,
} from "./helpers"
import {
  absDiff,
  account0,
  account1,
  account2,
  ensureTouSigned,
  formatAmountForInput,
  marketTotalAssets,
  marketTotalDebts,
  marketTotalSupply,
  pinnedMarkets,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  unpaidBatchExpiries,
} from "../lenderflows/lib"
import { parseFormattedAmount } from "../lib/assert"
import * as chain from "../lib/chain"
import {
  APP_URL,
  advanceTime,
  faucet,
  pins,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
  gql,
} from "../lib/env"
import { connectAs, ensureConnected, gotoMarket } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import { expect, test } from "../lib/test"

/**
 * UAT 4 Borrower Ops (BOP-01…32) on markets OWNED by the fixture borrower.
 *
 * The borrower is a real, PRE-FORK Sepolia account driven by anvil impersonation (see
 * `helpers.MAIN_OPS_BORROWER`). The borrower market page is gated on `/api/market/get`, which
 * asks the PRODUCTION subgraph whether the market exists, so a market the fork created can never
 * render there (KNOWN-ISSUES M6/M7) and the fixtures must be markets that already existed at the
 * pin block. Impersonation covers transactions; it cannot sign messages, so the ToU/MLA
 * ceremonies are DB-seeded (`ensureOpsBorrowerTouSigned`, `seedMlaRefusal`) and their UI cases
 * skip.
 *
 * Dependencies & ordering (test.describe.serial):
 *  - The fixtures are discovered from the subgraph, not deployed here. If the pinned borrower
 *    owns no open market every test skips with a pointer to `pins.json` and the fork state.
 *  - BOP-02 allowlists account #1 on the primary policy — this also UNBLOCKS LEN-16 (page 5).
 *    On this branch the ops borrower is an impersonated pre-fork account whose policies carry the
 *    OpenAccessRoleProvider, so BOP-02/03/05 skip at run time until a borrower-administered
 *    allowlist fixture exists (see FIXTURE-MANIFEST.md and COVERAGE.md).
 *  - BOP-23 closes a SECONDARY market of the same borrower with account #1 still holding a
 *    balance — this is the LEN-20 fixture (page 5). The PRIMARY market is never closed here
 *    because BOP-14 needs it open at the very end. On main the fixture borrower's markets are
 *    shared with the LENDER suites, so anything named in `pins.markets` is PROTECTED from the
 *    close targets (closing e.g. the openTerm/noMla/transferOpen pin would destroy page 5).
 *  - ORDERING CONSTRAINT: the final test ("BOP-14b") advances chain time by 2 weeks
 *    (permanent for the fork lifetime). It MUST stay the last test in this file, and any suite
 *    relying on chain ≈ wall time (signature APIs!) must run before this file's final test or
 *    after a `dev:fork:reset`.
 */
test.describe.serial("borrower flows: borrower ops (BOP-01…32)", () => {
  const SCRATCH = "0x1111111111111111111111111111111111111111" as Address

  /**
   * Markets this suite must never CLOSE or otherwise make unusable: the ones other pages pin as
   * their own fixtures. The ops borrower also owns the pinned lender-fixture markets
   * (`markets.openTerm` / `noMla` / `transferOpen`), so the suite derives this protected set from
   * `pins.markets` — none of those markets is ever a close target.
   */
  const PROTECTED = new Set(
    Object.values(pins.markets).map((m) => m.toLowerCase()),
  )

  // ---- fixed-term maturity: UTC calendar helpers (BOP-15/18/24) --------------------------
  // A maturity is a CALENDAR DAY labelled 00:00 UTC, not an instant (src/utils/formatters.ts:22).
  // Everything here is computed in UTC so the expectations stay right in a non-UTC browser.
  const DAY_SECONDS = 86_400
  const MONTHS_SHORT = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(
    " ",
  )
  const utcDayFloor = (unix: number) =>
    Math.floor(unix / DAY_SECONDS) * DAY_SECONDS
  /** DDMMYYYY for a MUI DateField, in UTC. */
  const maturityDigits = (unix: number) => {
    const d = new Date(unix * 1000)
    return `${pad2(d.getUTCDate())}${pad2(
      d.getUTCMonth() + 1,
    )}${d.getUTCFullYear()}`
  }
  /** formatUtcMaturityDate — "05 Aug 2026" (market-list chip). */
  const maturityDateLabel = (unix: number) => {
    const d = new Date(unix * 1000)
    return `${pad2(d.getUTCDate())} ${
      MONTHS_SHORT[d.getUTCMonth()]
    } ${d.getUTCFullYear()}`
  }
  /** formatUtcMaturity — "05 Aug 2026 00:00 UTC" (MaturityModal's Current Maturity). */
  const maturityWithTimeLabel = (unix: number) => {
    const d = new Date(unix * 1000)
    return `${maturityDateLabel(unix)} ${pad2(d.getUTCHours())}:${pad2(
      d.getUTCMinutes(),
    )} UTC`
  }

  const openMaturityDialog = async (p: Page) => {
    await p
      .getByRole("button", { name: /^adjust maturity$/i })
      .first()
      .click()
    const dialog = p.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    return dialog
  }
  /** The DesktopDatePicker text field, labelled by the date-format hint. */
  const maturityInput = (dialog: Locator) =>
    dialog.getByRole("textbox", { name: /e\.g\. 25\/12\/2024$/ })
  const readDialogText = async (dialog: Locator) =>
    (await dialog.innerText()).replace(/\s+/g, " ").trim()

  /**
   * Market parameters live in the sidebar's "Status and Details" section, not the default
   * "Borrow and Repay" one (borrower/market/[address]/page.tsx). The sidebar can still be
   * re-rendering when the click lands, so retry until the section actually mounts.
   */
  const openStatusDetails = async (p: Page) => {
    await expect(async () => {
      await p
        .getByRole("button", { name: /status and details/i })
        .first()
        .click({ timeout: 15_000 })
      await expect(
        p
          .getByTestId("parameters-item")
          .filter({ has: p.getByText("Loan Maturity", { exact: true }) }),
      ).toHaveCount(1, { timeout: 8_000 })
    }).toPass({ timeout: 180_000 })
  }

  /** The value text of a `ParametersItem` row (src/components/ParametersItem) by its title. */
  const readParameterValue = async (p: Page, title: string) => {
    const row = p
      .getByTestId("parameters-item")
      .filter({ has: p.getByText(title, { exact: true }) })
    await expect(row).toHaveCount(1, { timeout: 60_000 })
    const text = (await row.innerText()).replace(/\s+/g, " ").trim()
    return text.slice(title.length).trim()
  }

  let all: BorrowerMarketRow[] = []
  let primary: BorrowerMarketRow | undefined
  let fixedTerm: BorrowerMarketRow | undefined
  /** BOP-24's dedicated early-close fixture — a DIFFERENT fixed-term market to `fixedTerm`. */
  let earlyCloseTerm: BorrowerMarketRow | undefined
  let closeRepayTarget: BorrowerMarketRow | undefined
  let closeEmptyTarget: BorrowerMarketRow | undefined

  let market: Address // primary market id
  let token: Address
  let decimals = 18
  let hooksAddr: Address
  let providerAddr: Address | undefined // borrower-administered access list, if any
  let cycle = 0
  let minimumDeposit = 0n
  let deposit = 0n

  // set by BOP-02: whether the primary policy is a borrower-managed allowlist
  let allowlistManaged = false
  // set by BOP-23 for BOP-25
  let closedMarketName: string | undefined
  // set by BOP-14 so the expiry test can restore the pre-cut APR
  let aprBeforeBigCut = 0n

  /** Where a missing fixture has to be fixed. */
  const NO_MARKET_HINT = "check pins.json `borrower` and the fork state"

  const requireMarket = () =>
    test.skip(
      !primary,
      `no open market owned by the fixture borrower ${BORROWER} on the fork subgraph — ${NO_MARKET_HINT}`,
    )

  const isOpenTermRow = (m: BorrowerMarketRow) =>
    (m.hooksConfig?.fixedTermEndTime ?? 0) === 0 &&
    (m.hooksConfig?.periodDuration ?? 0) === 0

  /**
   * A market this suite may CLOSE. Never one another page pins, and — because the main fixtures
   * are real markets rather than freshly deployed ones — a fixed-term market counts as long as
   * its term has already matured (closure before term needs `allowClosureBeforeTerm`).
   */
  const isDisposable = (m: BorrowerMarketRow, chainNow: number) =>
    !PROTECTED.has(m.id.toLowerCase()) &&
    (m.hooksConfig?.periodDuration ?? 0) === 0 &&
    ((m.hooksConfig?.fixedTermEndTime ?? 0) === 0 ||
      (m.hooksConfig?.fixedTermEndTime ?? 0) <= chainNow ||
      !!m.hooksConfig?.allowClosureBeforeTerm)

  test("setup: discover the fixture borrower's markets, chain hygiene", async () => {
    await syncChainTimeToWallClock()
    all = await borrowerMarkets()
    const open = all.filter((m) => !m.isClosed)
    const chainNow = await chain.blockTimestamp()
    attachAgreement("fixture borrower markets", {
      borrower: BORROWER,
      total: all.length,
      open: open.map((m) => ({
        id: m.id,
        name: m.name,
        kind: m.hooks?.kind,
        fixedTermEndTime: m.hooksConfig?.fixedTermEndTime,
        periodDuration: m.hooksConfig?.periodDuration,
        scaledTotalSupply: m.scaledTotalSupply,
        protectedByAnotherPage: PROTECTED.has(m.id.toLowerCase()),
      })),
    })
    test.skip(
      open.length === 0,
      `no open market owned by ${BORROWER} — ${NO_MARKET_HINT}`,
    )

    // Primary: prefer an open-term market whose policy carries a borrower-administered
    // access-list provider — BOP-02/03/05 (and the LEN-16 unblock) need allowlist management,
    // which a Self-Onboarding policy market cannot exercise (review finding 3). Markets another
    // page pins come LAST: this suite borrows, repays and re-prices its primary.
    const openStd = open
      .filter(isOpenTermRow)
      .sort(
        (a, b) =>
          Number(PROTECTED.has(a.id.toLowerCase())) -
          Number(PROTECTED.has(b.id.toLowerCase())),
      )
    let allowlisted: BorrowerMarketRow | undefined
    for (const candidate of openStd) {
      // eslint-disable-next-line no-await-in-loop
      const provs = await accessListProviders(candidate.hooks!.id)
      if (provs.length > 0) {
        allowlisted = candidate
        break
      }
    }
    primary = allowlisted ?? openStd[0] ?? open[0]

    // Fixed-term fixtures. The pre-fork fixture borrower's two fixed-term markets matured before
    // the pin, and which one each case gets must be DECIDED, not left to subgraph ordering —
    // BOP-24 closes its target for good, so a run that silently swapped the two would destroy
    // BOP-15/BOP-18/LEN-35's fixture instead.
    //   `fixedTerm`      the LATEST-maturing market that permits term reduction: BOP-15 needs the
    //                    term still open, BOP-18 needs calendar days inside it to move to, and
    //                    LEN-35 needs it unmatured when the lender board reaches it.
    //   `earlyCloseTerm` any OTHER fixed-term market that permits closure before term: BOP-24.
    // On main both fixture markets matured in January 2025 (before the pin block) and only one of
    // them permits early closure, so `earlyCloseTerm` stays undefined and BOP-18/24 skip for
    // fixture reasons — which is the accurate report, not a feature gap.
    const fixedTerms = open
      .filter((m) => m !== primary && (m.hooksConfig?.fixedTermEndTime ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.hooksConfig?.fixedTermEndTime ?? 0) -
          (a.hooksConfig?.fixedTermEndTime ?? 0),
      )
    fixedTerm =
      fixedTerms.find((m) => m.hooksConfig?.allowTermReduction) ?? fixedTerms[0]
    earlyCloseTerm = fixedTerms.find(
      (m) => m !== fixedTerm && m.hooksConfig?.allowClosureBeforeTerm,
    )
    // `isDisposable` deliberately keeps MATURED fixed-term markets available as close targets on
    // main (its fixture borrower owns no spare open-term market); only the two fixtures above are
    // withheld from BOP-22/23.
    const spares = open.filter(
      (m) =>
        m !== primary &&
        m !== fixedTerm &&
        m !== earlyCloseTerm &&
        isDisposable(m, chainNow),
    )
    // LEN-20 needs a closed market with a lender balance, so the repay+close target wins the
    // first spare; an additional zero-supply spare covers the empty-close case.
    ;[closeRepayTarget] = spares
    closeEmptyTarget = spares.find(
      (m) => m !== closeRepayTarget && m.scaledTotalSupply === "0",
    )

    attachAgreement("fixed-term fixture split", {
      chainNow,
      reductionAndLock: fixedTerm && {
        id: fixedTerm.id,
        name: fixedTerm.name,
        fixedTermEndTime: fixedTerm.hooksConfig?.fixedTermEndTime,
        allowTermReduction: fixedTerm.hooksConfig?.allowTermReduction,
        matured: (fixedTerm.hooksConfig?.fixedTermEndTime ?? 0) <= chainNow,
        cases: "BOP-15 / BOP-18 / LEN-35",
      },
      earlyClose: earlyCloseTerm && {
        id: earlyCloseTerm.id,
        name: earlyCloseTerm.name,
        fixedTermEndTime: earlyCloseTerm.hooksConfig?.fixedTermEndTime,
        allowClosureBeforeTerm:
          earlyCloseTerm.hooksConfig?.allowClosureBeforeTerm,
        cases: "BOP-24 (destructive)",
      },
    })

    // The borrower market page hides every section behind the "Select MLA Settings" lead banner
    // until an MLA choice exists, and the impersonated borrower cannot SIGN one. Seed the refusal
    // for any fixture market that carries neither an MLA nor a refusal (no-op on markets that
    // already have one).
    seedBorrowerProfileFields(BORROWER)
    const ids = [
      primary,
      fixedTerm,
      earlyCloseTerm,
      closeRepayTarget,
      closeEmptyTarget,
    ]
      .filter(Boolean)
      .map((m) => m!.id)
    const decided = marketsWithMlaChoice(ids)
    for (const id of ids) {
      if (!decided.has(id.toLowerCase())) seedMlaRefusal(id, BORROWER)
    }

    market = primary.id as Address
    token = primary.asset.address as Address
    decimals = primary.asset.decimals
    hooksAddr = primary.hooks!.id as Address
    cycle = Number(primary.withdrawalBatchDuration)
    minimumDeposit = BigInt(primary.hooksConfig?.minimumDeposit ?? "0")
    // Exact-minimum deposits fail the hook through scale-factor rounding; add a unit.
    deposit = minimumDeposit + parseUnits("1", decimals)
    if (deposit < parseUnits("100", decimals))
      deposit = parseUnits("100", decimals)

    const providers = await accessListProviders(hooksAddr)
    providerAddr = providers[0]?.providerAddress as Address | undefined

    // Gas for every actor; state hygiene for re-runs (a crashed run can leave unpaid batches).
    for (const account of [BORROWER, account0, account1, account2]) {
      faucet(account, parseUnits("1", 18))
    }
    for (const account of [account1, account2]) {
      await selfCleanWithdrawals(account, market)
    }
    if ((await unpaidBatchExpiries(market)).length > 0) {
      faucet(BORROWER, deposit * 4n, token)
      await settleUnpaidBatches(BORROWER, market, token, decimals)
    }
    await syncSubgraph()
    expect(await unpaidBatchExpiries(market), "no unpaid batches left").toEqual(
      [],
    )
  })

  test("setup: borrower ToU (wall clock) + market page reachable / MLA guard", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    // Signature APIs bound timeSigned to the server wall clock — this test stays on wall time.
    // The impersonated borrower cannot personal_sign, so the acceptance is DB-seeded and only
    // its API oracle is asserted.
    await ensureOpsBorrowerTouSigned()

    await page.goto(`/borrower/market/${market}`)
    await ensureConnected(page, BORROWER)
    // Deep-linked gated route: renavigate if the no-wallet guard bounced us (defect candidate 1).
    if (!page.url().includes(market))
      await page.goto(`/borrower/market/${market}`)
    // A V2 market with no MLA record shows only the "Select MLA Settings" lead banner and hides
    // every borrower section. The page-3 suite normally sets MLA at creation; recover if not.
    const mlaBanner = page.getByText(/select mla settings/i)
    const borrowRepay = page.getByRole("button", { name: /borrow and repay/i })
    // The borrower market page holds its skeleton until BOTH the market and the borrower's
    // market account have hydrated, and the account comes from a lens sweep over every market the
    // borrower owns. On a cold fork that is well past a minute, so this wait is generous by
    // design — it is the first render of the page in a run, not a per-interaction wait.
    await expect(mlaBanner.or(borrowRepay).first()).toBeVisible({
      timeout: 180_000,
    })
    if (await mlaBanner.isVisible().catch(() => false)) {
      // main: the setup above already seeded a refusal for every fixture market, so reaching the
      // banner here means the seed did not take — and the UI recovery cannot work either, because
      // "Refuse MLA" asks the wallet to sign and anvil holds no key for an impersonated account.
      throw new Error(
        "MLA banner still up for a market whose refusal was seeded (see seedMlaRefusal); the UI recovery cannot work because an impersonated account cannot sign",
      )
    }
    await expect(borrowRepay).toBeVisible({ timeout: 30_000 })
  })

  test("BOP-01: policies page lists policies with type, access label and linked markets", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    await page.goto("/borrower")
    await ensureConnected(page, BORROWER)

    await step(page, "dashboard → Policies section", async () => {
      // The sidebar "Policies" item is a role-less Typography span — click by text.
      await page.getByText("Policies", { exact: true }).first().click()
      // Policy row: name + hooks kind + access requirements + linked market names.
      await expect(
        page.getByText(primary!.hooks!.name || "Unnamed Policy").first(),
      ).toBeVisible({ timeout: 60_000 })
      await expect(
        page.getByText(/self-onboard|manual approval/i).first(),
      ).toBeVisible({ timeout: 30_000 })
      // UI observation: the list's "Assigned to Markets" column renders EMPTY on this build —
      // linked market names appear only on the policy detail page (asserted below). Recorded as a
      // gap rather than asserted here.
    })

    await step(page, "click into the policy (Details/Markets)", async () => {
      await page.goto(`/borrower/policy?policy=${hooksAddr}`)
      await expect(page.getByText(/policy info/i).first()).toBeVisible({
        timeout: 60_000,
      })
      // Details tab is default: term type + access label render from subgraph data.
      await expect(
        page.getByText(/open term|fixed term|periodic/i).first(),
      ).toBeVisible({ timeout: 30_000 })
      await page.getByRole("tab", { name: /^markets$/i }).click()
      await expect(page.getByText(primary!.name).first()).toBeVisible({
        timeout: 30_000,
      })
    })
    attachAgreement("BOP-01 policy", {
      hooks: hooksAddr,
      name: primary!.hooks!.name,
      kind: primary!.hooks!.kind,
      linkedMarket: primary!.name,
    })
  })

  test("BOP-02: add lenders on the policy allowlist (unblocks LEN-16)", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    await gotoPolicyLenders(page, hooksAddr)

    if (await policyLendersTabIsSelfOnboard(page)) {
      allowlistManaged = false
      test.skip(
        true,
        "the ops borrower's primary policy is lender self-onboarding — no allowlist to edit; BOP-02/03/05 need a borrower-administered access-list policy owned by the ops borrower (W6.4 fixture swap)",
      )
    }
    allowlistManaged = true

    const already = async (lender: Address) =>
      (await storedLenderStatus(hooksAddr, lender)).lastApprovalTimestamp > 0

    const toAdd = [] as { address: Address; name?: string }[]
    if (!(await already(account1)))
      toAdd.push({ address: account1, name: "E2E Lender One" })
    if (!(await already(account2)))
      toAdd.push({ address: account2, name: "E2E Lender Two" })
    if (!(await already(SCRATCH))) toAdd.push({ address: SCRATCH })
    test.skip(
      toAdd.length === 0,
      "all three lenders already allowlisted (re-run) — nothing to add",
    )

    let stagedCount = 0
    await step(page, "stage new lenders (flagged as new)", async () => {
      for (const l of toAdd) {
        const res = await addLenderThroughUi(page, l.address, l.name)
        if (res === "staged") stagedCount += 1
        await expect(lenderRow(page, l.address)).toBeVisible({
          timeout: 15_000,
        })
      }
    })

    // Head's modal rejects duplicates for members it already lists (0fbe365c): with nothing newly
    // staged there is nothing to submit — the membership oracles below still verify everything.
    if (stagedCount > 0)
      await step(
        page,
        "submit → confirmation lists the additions",
        async () => {
          await page.getByRole("button", { name: /^submit$/i }).click()
          const dialog = page.getByRole("dialog")
          await expect(dialog).toBeVisible({ timeout: 30_000 })
          for (const l of toAdd) {
            // Confirmation rows show trimmed addresses; match on the leading hex.
            await expect(
              dialog.getByText(new RegExp(l.address.slice(0, 6), "i")).first(),
            ).toBeVisible({ timeout: 15_000 })
          }
          await dialog.getByRole("button", { name: /^confirm$/i }).click()
          await expect(page.getByText(/lenders were edited/i)).toBeVisible({
            timeout: 120_000,
          })
          await closeDialog(page)
        },
      )

    const submittedAt = Date.now()
    await syncSubgraph()

    // chain oracle: ACCESS_LIST membership. The provider is a PULL provider — the hooks' stored
    // credential stays empty until the lender first interacts (verified on-chain during
    // run-and-fix), so membership + a passing deposit simulation are the honest oracles here.
    expect(
      providerAddr,
      "allowlist policy has an ACCESS_LIST provider",
    ).toBeTruthy()
    for (const l of [account1, account2, SCRATCH]) {
      expect(await providerIsMember(providerAddr!, l), `member ${l}`).toBe(true)
    }
    // Behavioral proof for account #1 (the LEN-16 unblock): a deposit now passes simulation.
    faucet(account1, deposit, token)
    await chain.approve(account1, token, market, deposit)
    const depositSim = await simulateFrom({
      account: account1,
      address: market,
      functionName: "depositUpTo",
      args: [deposit],
    })
    expect(depositSim.reverted, "allowlisted deposit simulates clean").toBe(
      false,
    )
    // Membership oracle, read from the provider contract. (LenderHooksAccess /
    // AccountAccessGranted index hook credentials, which a PULL provider only mints on first use;
    // the provider's own `isMember()` is what an allowlist edit actually writes.)
    expect(
      await providerMembershipIndexed(providerAddr!, account1),
      "provider membership on-chain for account #1",
    ).toBe(true)

    // UI GAP (verified live, app defect candidate): BOTH the market's Lenders section and the
    // policy's own Lenders tab render from LenderHooksAccess (hook credentials) — a PULL provider
    // mints those only on first lender interaction, so freshly added on-chain allowlist members
    // are invisible everywhere in the UI after a reload (the borrower cannot see their own
    // allowlist). The staged-row asserts during the flow above are all the UI offers; chain +
    // subgraph membership oracles above are the real verification.
    attachAgreement("BOP-02 lender list", {
      added: toAdd.map((l) => l.address),
      indexingLagMs: Date.now() - submittedAt,
      note: "account #1 allowlisted — LEN-16 (page 5) unblocked on this market",
    })
  })

  test("BOP-03: strike-through / Undo mechanics on a staged lender row (full removal blocked by the allowlist visibility gap)", async ({
    page,
  }) => {
    requireMarket()
    test.skip(
      !allowlistManaged,
      "primary policy is self-onboarding (see BOP-02)",
    )
    await connectAs(page, BORROWER_CONNECT)
    await gotoPolicyLenders(page, hooksAddr)

    // Existing on-chain members are invisible after reload (defect candidate 4), so the remove
    // flow can only be exercised against a freshly STAGED row. Nothing here is submitted.
    const STAGED = "0x2222222222222222222222222222222222222222"
    await addLenderThroughUi(page, STAGED, "E2E Staged Remove")
    const row = lenderRow(page, STAGED)
    await expect(row).toBeVisible({ timeout: 15_000 })

    // Source semantics (EditLendersTable): a STAGED (NEW) row's cross opens a DeleteModal;
    // strike-through + Undo exist only for OLD rows — i.e. credentialed lenders, which the
    // visibility gap (defect candidate 4) makes unreachable here. Exercise cancel + confirm.
    await step(page, "cross → DeleteModal → cancel keeps the row", async () => {
      await strikeLenderRow(page, STAGED)
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 15_000 })
      await dialog
        .getByRole("button", { name: /cancel|back|close/i })
        .first()
        .click()
      await expect(dialog).toBeHidden({ timeout: 15_000 })
      await expect(row, "cancel keeps the staged row").toBeVisible()
    })

    await step(page, "cross → DeleteModal → confirm un-stages", async () => {
      await strikeLenderRow(page, STAGED)
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 15_000 })
      await dialog
        .getByRole("button", { name: /delete|remove|confirm/i })
        .first()
        .click()
      await expect(row, "confirmed delete un-stages the row").toBeHidden({
        timeout: 15_000,
      })
    })

    // Discard any staging; the tab must come back empty (nothing was submitted).
    await gotoPolicyLenders(page, hooksAddr)
    await expect(lenderRow(page, STAGED)).toBeHidden({ timeout: 15_000 })
  })

  test("BOP-04: self-onboarding policy hides add-lender controls upfront", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    // Use one of OUR self-onboard policies (approved OPEN_ACCESS provider, administered by the
    // ops borrower).
    // Foreign pre-rotation policies carry UNKNOWN provider kinds on head and the app then shows
    // edit controls it cannot back on-chain — not a valid subject for this guard test.
    let target = allowlistManaged ? undefined : hooksAddr
    if (!target) {
      const mine = await gql<{
        hooksInstances: { id: string }[]
      }>(
        // v2.1.8 names the policy owner `borrower`.
        `{ hooksInstances(where: { borrower: "${BORROWER.toLowerCase()}", name_contains: "E2E Pol A" }, first: 1) { id } }`,
      )
      target = mine.hooksInstances[0]?.id as Address | undefined
    }
    test.skip(
      !target,
      "no self-onboarding policy administered by the ops borrower on the fork — run market-creation first",
    )

    await gotoPolicyLenders(page, target!)
    // Head (0fbe365c/40108a17): the self-onboard Lenders tab lists CREDENTIALED lenders with an
    // Access Source column and shows the onboard-themselves notice alongside; with no credentialed
    // lenders yet it renders "No Active Lenders" instead. Either way there is no allowlist to
    // edit — the add/submit controls stay hidden (the actual point of this case).
    await expect(
      page
        .getByText(/lenders onboard themselves/i)
        .or(page.getByText(/no active lenders/i))
        .first(),
    ).toBeVisible({ timeout: 60_000 })
    // The tab can briefly render the edit controls while the provider kind resolves — allow the
    // resolution window before requiring them gone.
    await expect(page.getByRole("button", { name: /add lender/i })).toBeHidden({
      timeout: 30_000,
    })
    await expect(page.getByRole("button", { name: /^submit$/i })).toBeHidden({
      timeout: 15_000,
    })
  })

  test("setup: lender deposits into the primary market (chain)", async () => {
    requireMarket()
    // Deposits need credentials on allowlist policies (granted in BOP-02); on self-onboard
    // policies they work without. Both lenders deposit so BOP-05 can prove known-lender rights.
    for (const lender of [account1, account2]) {
      const balance = await chain.marketBalance(market, lender)
      if (balance < deposit / 2n) {
        faucet(lender, deposit * 2n, token)
        await chain.approve(lender, token, market, deposit * 2n)
        await chain.depositUpTo(lender, market, deposit)
      }
    }
    await syncSubgraph()
    expect(await marketTotalSupply(market)).toBeGreaterThan(deposit)
  })

  test("BOP-05: removed-after-deposit lender keeps withdrawal rights (known lender)", async ({
    page,
  }) => {
    requireMarket()
    test.skip(
      !allowlistManaged,
      "primary policy is self-onboarding (see BOP-02)",
    )
    await connectAs(page, BORROWER_CONNECT)

    // Precondition (and the point of the case): #2 must have DEPOSITED so the pull provider has
    // minted a real credential — only credentialed lenders render in the tab (defect candidate 4),
    // and "removed after deposit" is exactly the scenario. Mine a small real deposit.
    faucet(account2, deposit, token)
    await chain.approve(account2, token, market, deposit)
    await chain.depositUpTo(account2, market, deposit)
    await syncSubgraph()

    await step(page, "remove account #2 from the allowlist", async () => {
      await gotoPolicyLenders(page, hooksAddr)
      await strikeLenderRow(page, account2)
      await page.getByRole("button", { name: /^submit$/i }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByRole("button", { name: /^confirm$/i }).click()
      await expect(page.getByText(/lenders were edited/i)).toBeVisible({
        timeout: 120_000,
      })
      await closeDialog(page)
    })
    await syncSubgraph()

    // chain oracle (simulations only — nothing mined): deposits blocked, withdrawals allowed.
    const dep = await simulateFrom({
      account: account2,
      address: market,
      functionName: "depositUpTo",
      args: [deposit],
    })
    expect(dep.reverted, "new deposit blocked after removal").toBe(true)
    const wd = await simulateFrom({
      account: account2,
      address: market,
      functionName: "queueWithdrawal",
      args: [(await chain.marketBalance(market, account2)) / 2n],
    })
    expect(wd.reverted, "known lender retains withdrawal rights").toBe(false)
    attachAgreement("BOP-05", {
      lender: account2,
      depositBlocked: dep.message ?? "",
      withdrawalAllowed: !wd.reverted,
    })
  })

  test("BOP-06: borrow part, then the full available amount (chain-level; UI flow blocked by defect 5)", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    const anchor = await readAnchor(page, "borrower-available-to-borrow")
    const chainBorrowable = await marketBorrowable(market)
    // Reserve-ratio sanity: borrowable never exceeds assets minus the reserve-ratio floor.
    const assets = await marketTotalAssets(market)
    const supply = await marketTotalSupply(market)
    const rr = await marketReserveRatio(market)
    const reserveFloor = (supply * rr) / 10_000n
    expect(chainBorrowable <= assets - reserveFloor + supply / 1000n).toBe(true)
    // The anchor is a live react-query value; tolerate rebase drift (≤0.1% + dust).
    expect(
      absDiff(anchor.raw, chainBorrowable) <= chainBorrowable / 1000n + 10n,
    ).toBe(true)

    const balBefore = await chain.erc20Balance(token, BORROWER)
    const part = chainBorrowable / 4n
    await borrowOnChain(market, part)
    const partReceived = (await chain.erc20Balance(token, BORROWER)) - balBefore
    expect(absDiff(partReceived, part) <= part / 1000n + 10n).toBe(true)

    // borrowableAssets SHRINKS as interest accrues — shave a hair to avoid racing the accrual.
    const remaining = ((await marketBorrowable(market)) * 999n) / 1000n
    await borrowOnChain(market, remaining)
    const after = await marketBorrowable(market)
    expect(after < chainBorrowable / 100n, "available drained to dust").toBe(
      true,
    )

    await syncSubgraph()
    const borrows = await latestBorrowRecords(market, 3)
    expect(borrows.length).toBeGreaterThanOrEqual(2)

    // UI oracle: the page reflects the drained availability and grown Borrowed figure.
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    const anchorAfter = await readAnchor(page, "borrower-available-to-borrow")
    expect(
      anchorAfter.raw <= chainBorrowable / 50n,
      "page shows availability drained",
    ).toBe(true)
    attachAgreement("BOP-06", {
      part: part.toString(),
      remaining: remaining.toString(),
      after: after.toString(),
    })
  })

  test("BOP-07: borrow is executable whenever the UI shows available capacity", async ({
    page,
  }) => {
    requireMarket()
    // Free up capacity on-chain first (repay a slice of the drained market).
    const debts = await marketTotalDebts(market)
    const assets = await marketTotalAssets(market)
    const slice = (debts - assets) / 5n
    expect(slice).toBeGreaterThan(0n)
    faucet(BORROWER, slice * 2n, token)
    await chain.approve(BORROWER, token, market, slice * 2n)
    await repayOnChain(BORROWER, market, slice)
    await syncSubgraph()

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    const anchor = await readAnchor(page, "borrower-available-to-borrow")
    expect(anchor.raw).toBeGreaterThan(0n)
    // Whenever available > 0 the Borrow button must be enabled and the borrow must execute.
    const small = parseUnits("1", decimals)
    await borrowThroughUi(
      page,
      formatAmountForInput(
        small < anchor.raw ? small : anchor.raw / 2n,
        decimals,
      ),
    )
    // The deregistered-borrower half (B8C case) needs a borrower removed from the
    // archcontroller — no such account exists on this fork; recorded as not runnable.
    attachAgreement("BOP-07", {
      availableShown: anchor.text,
      note: "B8C deregistered-borrower case not reproducible on the fork (no deregistered borrower account)",
    })
  })

  test("BOP-29: collateral obligations shown in the underlying asset on both sections", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    const underlying = primary!.asset.symbol
    const marketSymbol = primary!.symbol

    const readMinReserves = async () => {
      // VERIFY: the "Collateral Obligations" bar of the status chart expands on click and
      // reveals the CollateralObligationsData rows (Minimum Reserves first).
      const legend = page.getByText(/collateral obligations/i).first()
      const label = page.getByText(/^minimum reserves$/i).first()
      // isVisible() does NOT wait (CONVENTIONS): wait for either the collapsed legend or the
      // already-expanded rows, then expand if needed.
      await expect(legend.or(label).first()).toBeVisible({ timeout: 30_000 })
      if (!(await label.isVisible())) await legend.click()
      await expect(label).toBeVisible({ timeout: 15_000 })
      // The amount renders as the sibling ABOVE the label inside obligations__value.
      const value = page
        .locator(".obligations__value", { hasText: /minimum reserves/i })
        .first()
      return (await value.innerText()).trim()
    }

    const borrowRepayText = await step(
      page,
      "Borrow & Repay section",
      readMinReserves,
    )
    await openBorrowerSection(page, /status and details/i)
    const statusText = await step(
      page,
      "Status & Details section",
      readMinReserves,
    )

    for (const text of [borrowRepayText, statusText]) {
      expect(text, "denominated in the underlying").toContain(underlying)
      expect(
        text.includes(marketSymbol) && marketSymbol !== underlying,
        `must not use the market token symbol (${marketSymbol})`,
      ).toBe(false)
      // Amount and currency separated by a space: "1,234.56 SYM".
      expect(text).toMatch(new RegExp(`[\\d,.]+\\s${underlying}`))
    }
    expect(
      Math.abs(
        parseFormattedAmount(borrowRepayText) -
          parseFormattedAmount(statusText),
      ),
    ).toBeLessThanOrEqual(
      Math.max(0.01, parseFormattedAmount(borrowRepayText) * 0.001),
    )
    attachAgreement("BOP-29", { borrowRepayText, statusText, underlying })
  })

  test("BOP-08: repay a specific amount — reserves increase", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    const toRepay = await readAnchor(page, "borrower-to-repay")
    expect(toRepay.raw).toBeGreaterThan(0n)
    const amount = toRepay.raw / 3n
    faucet(BORROWER, amount * 2n, token)
    const assetsBefore = await marketTotalAssets(market)

    const dialog = await openRepayDialog(page)
    await dialog
      .getByRole("textbox")
      .first()
      .fill(formatAmountForInput(amount, decimals))
    await submitRepayDialog(page, dialog)

    const assetsAfter = await marketTotalAssets(market)
    const delta = assetsAfter - assetsBefore
    expect(absDiff(delta, amount) <= amount / 1000n + 10n).toBe(true)

    await syncSubgraph()
    const repays = await latestRepayRecords(market, 1)
    expect(repays.length).toBeGreaterThan(0)
    expect(
      absDiff(BigInt(repays[0].assetAmount), amount) <= amount / 1000n + 10n,
    ).toBe(true)
    const row = await marketRow(market)
    expect(row!.isDelinquent, "no delinquency after repay").toBe(false)
    // UI reflects the reduced debt.
    const after = await readAnchor(page, "borrower-to-repay")
    expect(after.raw < toRepay.raw).toBe(true)
    attachAgreement("BOP-08", {
      requested: amount,
      reservesDelta: delta,
      subgraphRepaid: repays[0].assetAmount,
    })
  })

  test("BOP-09: repay N days — dialog covers obligations + N days interest; APR maths bounds the interest component", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    const supply = await marketTotalSupply(market)
    const apr = await marketApr(market)
    const feeBips = BigInt(primary!.protocolFeeBips ?? 0)
    // repayRequiredForDuration ≈ supply * (apr + apr*fee%) * 1d / (365d * 10000)
    const base = (supply * apr * 86_400n) / (365n * 86_400n * 10_000n)
    const withFee = base + (base * feeBips) / 10_000n

    const dialog = await openRepayDialog(page)
    await dialog.getByRole("tab", { name: /days/i }).click()
    await dialog.getByRole("textbox").first().fill("1")
    // The adornment shows the computed "~ X SYM" amount; estimate fields debounce — wait for a
    // NON-ZERO estimate before submitting (CONVENTIONS).
    const estimate = dialog.getByText(/~\s?[\d,.]/).first()
    await expect(estimate).toBeVisible({ timeout: 30_000 })
    await expect
      .poll(async () => parseFormattedAmount(await estimate.innerText()), {
        timeout: 30_000,
      })
      .toBeGreaterThan(0)
    const estimateText = (await estimate.innerText()).trim()

    // ACTUAL app contract (verified live): days-mode "Amount To Repay" covers the outstanding
    // obligations PLUS the requested days of interest — not interest alone. Fund and judge
    // against the dialog's own figure; the APR maths stays as a lower bound on the interest
    // component (the "~ X" adornment).
    const dialogText = (await dialog.innerText()).replace(/\s+/g, " ")
    const m = dialogText.match(/Amount To Repay\s*([\d,.]+)/i)
    expect(m, "dialog shows Amount To Repay").toBeTruthy()
    const required = parseUnits(m![1].replace(/,/g, ""), decimals)
    // NOTE: the "~ X" adornment is the "Interest Remaining" line, not the 1-day figure — record
    // it, don't bound it (the committed Amount To Repay below is the real oracle).

    // DAYS-MODE SUBMISSION IS BLOCKED on this pin (defect candidate 6): the modal's Approve
    // approves a different amount than the displayed/gating requirement, and the requirement
    // creeps with per-second accrual, so Repay never enables (observed across 5 run-and-fix
    // attempts; a 2x pre-staged on-chain allowance was later found overwritten with ~0.069 DAI
    // by the modal's own approve). Submit the quoted amount through the PROVEN sum-mode flow
    // instead; the days-mode quote itself is still the oracle under test.
    await closeDialog(page)
    faucet(BORROWER, required * 2n, token)
    const dialog2 = await openRepayDialog(page)
    await dialog2
      .getByRole("textbox")
      .first()
      .fill(formatAmountForInput(required, decimals))
    await submitRepayDialog(page, dialog2)

    await syncSubgraph()
    const repays = await latestRepayRecords(market, 1)
    const repaid = BigInt(repays[0].assetAmount)
    // 5% either side of the dialog's committed amount (accrual drift between quote and mine).
    expect(
      repaid >= (required * 95n) / 100n && repaid <= (required * 105n) / 100n,
      "repaid amount matches the dialog's Amount To Repay",
    ).toBe(true)
    // Sanity: the dialog's requirement itself must cover at least ~a day of APR interest.
    expect(
      required >= (base * 90n) / 100n,
      "Amount To Repay covers at least the day's interest per APR maths",
    ).toBe(true)
    attachAgreement("BOP-09", {
      estimateShown: estimateText,
      expectedBase: base,
      expectedWithProtocolFee: withFee,
      repaid,
    })
  })

  test("BOP-28: queued withdrawal requests visible to the borrower (ongoing)", async ({
    page,
  }) => {
    requireMarket()
    // Drain reserves so the queued batch cannot be fully paid at expiry (unpaid-queue case).
    const borrowable = await marketBorrowable(market)
    if (borrowable > parseUnits("1", decimals) / 100n)
      await borrowOnChain(market, (borrowable * 999n) / 1000n)
    const lenderBalance = await chain.marketBalance(market, account1)
    expect(lenderBalance).toBeGreaterThan(0n)
    // Ask for more than the remaining reserves so the batch lands in the unpaid FIFO; fall
    // back to half the balance if the lender cannot outsize the reserves (high reserve ratio).
    const reserves = await marketTotalAssets(market)
    let withdrawAmount = lenderBalance / 2n
    if (withdrawAmount <= reserves && lenderBalance > reserves)
      withdrawAmount = lenderBalance
    await chain.queueWithdrawal(account1, market, withdrawAmount)
    await syncSubgraph()

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    await openBorrowerSection(page, /withdrawal requests/i)
    await expect(page.getByText(/open withdrawals/i).first()).toBeVisible({
      timeout: 60_000,
    })
    // VERIFY: the Ongoing table renders one request row per lender (Lender / Date / Tx / Amount
    // columns). The lender cell shows the trimmed address; the amount cell is data-field=amount.
    const row = page
      .locator(".MuiDataGrid-row", {
        hasText: new RegExp(account1.slice(0, 6), "i"),
      })
      .first()
    await expect(row).toBeVisible({ timeout: 60_000 })
    const amountCell = row.locator('.MuiDataGrid-cell[data-field="amount"]')
    const amountShown = (await amountCell.innerText()).trim()
    expect(
      Math.abs(
        parseFormattedAmount(amountShown) -
          Number(formatUnits(withdrawAmount, decimals)),
      ),
    ).toBeLessThanOrEqual(
      Math.max(0.01, Number(formatUnits(withdrawAmount, decimals)) * 0.001),
    )
    attachAgreement("BOP-28 ongoing", {
      queued: withdrawAmount,
      amountShown,
      lender: account1,
    })
  })

  test("BOP-28b: expired batch surfaces as outstanding and can be serviced", async ({
    page,
  }) => {
    requireMarket()
    await advanceTime(cycle + 5)
    await chain.updateState(BORROWER, market)
    await syncSubgraph()
    const unpaid = await unpaidBatchExpiries(market)
    const expiry = unpaid[0] ?? (await latestWithdrawalBatchExpiry(market))

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    await openBorrowerSection(page, /withdrawal requests/i)
    await expect(page.getByText(/open withdrawals/i).first()).toBeVisible({
      timeout: 60_000,
    })

    if (unpaid.length > 0) {
      // Underfunded expiry: the batch joined the unpaid FIFO and the market is delinquent —
      // service it (repay via the market page, then process the stored queue).
      await step(page, "service the unpaid batch (repay Max)", async () => {
        const owed =
          (await marketTotalDebts(market)) - (await marketTotalAssets(market))
        faucet(BORROWER, owed * 2n, token)
        // The withdrawal view offers Repay while delinquent; fall back to Borrow & Repay if
        // the shortcut button is not rendered.
        const repayButton = page.getByRole("button", { name: /^repay$/i })
        if (
          !(await repayButton
            .first()
            .isVisible()
            .catch(() => false))
        )
          await openBorrowerSection(page, /borrow and repay/i)
        const dialog = await openRepayDialog(page)
        await dialog.getByRole("button", { name: /^max$/i }).click()
        await submitRepayDialog(page, dialog)
      })
      // Repay restores liquidity; the stored FIFO still needs explicit processing.
      await settleUnpaidBatches(BORROWER, market, token, decimals)
      await syncSubgraph()
      expect(await unpaidBatchExpiries(market)).toEqual([])
    }

    // Either path ends with the batch claimable by the lender on the first try.
    const available = await chain.getAvailableWithdrawalAmount(
      market,
      account1,
      expiry,
    )
    expect(available).toBeGreaterThan(0n)
    await chain.executeWithdrawal(account1, market, account1, expiry)
    await syncSubgraph()
    attachAgreement("BOP-28b serviced", {
      expiry,
      wasUnpaid: unpaid.length > 0,
      claimed: available,
    })
  })

  test("BOP-11: third-party repay via direct ERC-20 transfer counts toward reserves", async () => {
    requireMarket()
    const amount = parseUnits("5", decimals)
    faucet(account0, amount * 2n, token)
    const assetsBefore = await marketTotalAssets(market)
    await erc20Transfer(account0, token, market, amount)
    await chain.updateState(account0, market)
    const assetsAfter = await marketTotalAssets(market)
    // updateState also accrues a sliver of protocol fees out of totalAssets; tolerate dust.
    expect(
      absDiff(assetsAfter - assetsBefore, amount) <= amount / 100n + 10n,
    ).toBe(true)
    await syncSubgraph()
    const row = await marketRow(market)
    attachAgreement("BOP-11", {
      from: account0,
      amount,
      totalAssetsBefore: assetsBefore,
      totalAssetsAfter: assetsAfter,
      isDelinquent: row!.isDelinquent,
      note: "direct transfers raise reserves but do not emit DebtRepaid (by design)",
    })
  })

  test("BOP-10: over-repayment — UI clamps to outstanding debt; protocol permits the overshoot", async ({
    page,
  }) => {
    requireMarket()
    // Clear the outstanding debt first (chain), leaving only per-block interest dust.
    const debts = await marketTotalDebts(market)
    const assets = await marketTotalAssets(market)
    if (debts > assets) {
      const owed = debts - assets + parseUnits("1", decimals)
      faucet(BORROWER, owed * 2n, token)
      await chain.approve(BORROWER, token, market, owed * 2n)
      await repayOnChain(BORROWER, market, owed)
    }
    await syncSubgraph()

    // Fund BEFORE the page mounts — the modal's balance/allowance queries cache at mount and a
    // later faucet leaves it stuck on InsufficientBalance (same family as the BOP-09 staleness).
    const extra = parseUnits("2", decimals)
    faucet(BORROWER, extra * 2n, token)
    await chain.approve(BORROWER, token, market, extra * 2n)

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    const anchor = await readAnchor(page, "borrower-to-repay")
    // Only interest dust remains.
    expect(anchor.raw < parseUnits("1", decimals)).toBe(true)

    // DIVERGENCE from the runsheet wording (verified live): the modal CLAMPS the amount to the
    // outstanding debt ("Up to X DAI" cap) — with zero debt a typed over-repayment becomes 0 and
    // the Repay button stays disabled. The UI prevents over-repayment; the PROTOCOL permits it.
    const dialog = await openRepayDialog(page)
    await dialog
      .getByRole("textbox")
      .first()
      .fill(formatAmountForInput(extra, decimals))
    // With zero outstanding debt the dialog shows "Amount To Repay 0" (the "Up to" cap line does
    // not render at all) and the typed amount is clamped — assert the visible truth.
    await expect
      .poll(async () => (await dialog.innerText()).replace(/\s+/g, " "), {
        timeout: 15_000,
      })
      .toMatch(/amount to repay 0(\.\d+)?\s/i)
    const typedResult = (
      await dialog.getByRole("textbox").first().inputValue()
    ).replace(/,/g, "")
    // OBSERVATIONAL (not asserted): whether the input clamps a typed over-repayment varies with
    // the dust state (observed clamped-to-0 with zero debt, accepted with dust outstanding) —
    // recorded for the defect log; the protocol-level assert below is the oracle.
    attachAgreement("BOP-10 typed-over-repay UI behavior", {
      typed: "2",
      inputAfterTyping: typedResult,
      clamped: Number(typedResult) < 2,
    })
    await closeDialog(page)

    // Protocol-level: over-repayment into a zero-debt market is permitted and lands in reserves.
    const before = await marketTotalAssets(market)
    await repayOnChain(BORROWER, market, extra)
    const after = await marketTotalAssets(market)
    expect(after - before >= (extra * 999n) / 1000n).toBe(true)
    attachAgreement("BOP-10", {
      outstandingShown: anchor.text,
      overRepaid: extra,
      reservesDelta: after - before,
    })
  })

  test("BOP-12: APR increase applies immediately and is logged", async ({
    page,
  }) => {
    requireMarket()
    await clearAprPeg(hooksAddr, market)
    const apr0 = await marketApr(market)
    const rr0 = await marketReserveRatio(market)
    const newApr = apr0 + 100n // +1.00%, unconstrained
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    await adjustAprThroughUi(page, (Number(newApr) / 100).toFixed(2))
    await ensureAprApplied(market, newApr)

    expect(await marketApr(market), "effective immediately").toBe(newApr)
    expect(await marketReserveRatio(market), "ratio untouched").toBe(rr0)
    await syncSubgraph()
    const records = await latestAprRecords(market, 1)
    expect(records[0]).toEqual({
      oldAnnualInterestBips: Number(apr0),
      newAnnualInterestBips: Number(newApr),
    })
    attachAgreement("BOP-12", { apr0, newApr, record: records[0] })
  })

  test("BOP-13: APR cut of ≤25% applies with no reserve penalty", async ({
    page,
  }) => {
    requireMarket()
    await clearAprPeg(hooksAddr, market)
    const apr0 = await marketApr(market)
    const rr0 = await marketReserveRatio(market)
    const newApr = (apr0 * 8n) / 10n // 20% relative cut — under the 25% threshold
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    await page
      .getByRole("button", { name: /^adjust base apr$/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    await dialog
      .getByRole("textbox")
      .first()
      .fill((Number(newApr) / 100).toFixed(2))
    // No temporary-ratio warning for a ≤25% cut.
    await expect(
      dialog.getByText(/temporary reserve ratio in force until/i),
    ).toBeHidden()
    await dialog.getByRole("button", { name: /^confirm$/i }).click()
    await dialog.getByRole("checkbox").check()
    await dialog.getByRole("button", { name: /^adjust$/i }).click()
    await waitBorrowerTxSuccess(page)
    await closeDialog(page)
    await ensureAprApplied(market, newApr)

    expect(await marketApr(market)).toBe(newApr)
    expect(await marketReserveRatio(market), "reserve ratio untouched").toBe(
      rr0,
    )
    // PROTOCOL TRUTH (MarketConstraintHooks.onSetAnnualInterestAndReserveRatioBips): ANY
    // reduction below the original APR records the temporary mapping with a 2-week expiry to PEG
    // the originals for the window — for a ≤25% cut the RATIO stays unchanged (that is the
    // "no reserve penalty"), but the mapping is NOT empty. The earlier [0,0,0] expectation was an
    // authoring error.
    const [tOrigApr, tOrigRr, tExpiry] = await tempExcessReserveRatio(
      hooksAddr,
      market,
    )
    expect(BigInt(tOrigApr), "pegged original APR").toBe(apr0)
    expect(BigInt(tOrigRr), "pegged original ratio").toBe(rr0)
    const nowTs = await chain.blockTimestamp()
    expect(
      Math.abs(tExpiry - (nowTs + 14 * 86_400)),
      "2-week peg window",
    ).toBeLessThanOrEqual(600)

    // Cancel the peg (raise back to the original — the hook's canCancel path) so BOP-14 starts
    // from a clean mapping and computes its >25% maths against fresh originals. Deliberate
    // chain-side restore (not a defect fallback).
    await setAprOnChain(market, apr0)
    const cleared = await tempExcessReserveRatio(hooksAddr, market)
    expect(cleared).toEqual([0, 0, 0])
    await syncSubgraph()
    const row = await marketRow(market)
    expect(row!.temporaryReserveRatioActive).toBe(false)
    attachAgreement("BOP-13", {
      apr0,
      newApr,
      rr0,
      pegExpiry: tExpiry,
      note: "≤25% cut: ratio untouched, originals pegged for 2w; canceled by restoring APR",
    })
  })

  test("BOP-26: market history loads fully on first render after recent actions", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    // Straight to Market History WITHOUT reloading (regression on the partial-load bug).
    await openBorrowerSection(page, /market history/i)
    const rows = page.locator(".MuiDataGrid-row")
    await expect(rows.first()).toBeVisible({ timeout: 60_000 })
    const count = await rows.count()
    expect(count).toBeGreaterThan(2)
    // The APR changes from BOP-12/13 must already be visible on first render. Scope the oracle
    // to the history rows themselves — page-wide text matches static labels and would stay green
    // through the exact partial-load regression this test names (review finding 5).
    const aprRows = rows.filter({ hasText: /apr|interest/i })
    expect(
      await aprRows.count(),
      "history rows recording the BOP-12/13 APR changes",
    ).toBeGreaterThanOrEqual(2)
    // Filters render — this build's history controls are a Search-by-ID input and a page-size
    // selector (no type filter, no column sorting, no export — runsheet's "sort and export"
    // expectation recorded as a UI gap, not an automatable assertion).
    await expect(page.getByPlaceholder(/search by id/i)).toBeVisible({
      timeout: 30_000,
    })
    attachAgreement("BOP-26", {
      rowsOnFirstRender: count,
      gap: "no sorting/export controls on PaginatedMarketRecordsTable in this build",
    })
  })

  test("BOP-20: capacity raise applies; deposits above the old cap now accepted", async ({
    page,
  }) => {
    requireMarket()
    const oldCap = await marketMaxTotalSupply(market)
    const newCap = oldCap * 2n
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    await page
      .getByRole("button", { name: /^adjust capacity$/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText(/current capacity/i)).toBeVisible({
      timeout: 30_000,
    })
    await dialog
      .getByRole("textbox")
      .first()
      .fill(formatAmountForInput(newCap, decimals))
    await dialog.getByRole("button", { name: /^confirm$/i }).click()
    await waitBorrowerTxSuccess(page)
    await closeDialog(page)
    await ensureCapacityApplied(market, newCap)

    expect(await marketMaxTotalSupply(market)).toBe(newCap)
    await syncSubgraph()
    const records = await latestCapacityRecords(market, 1)
    expect(BigInt(records[0].newMaxTotalSupply)).toBe(newCap)
    // A deposit pushing supply beyond the OLD cap simulates fine now (account #1 still has
    // deposit access).
    const supply = await marketTotalSupply(market)
    const overOldCap = oldCap - supply + parseUnits("1", decimals)
    // Guard: the probe amount must clear the minimum-deposit hook or the simulation would
    // revert for the wrong reason.
    if (overOldCap >= deposit && overOldCap < newCap - supply) {
      faucet(account1, overOldCap * 2n, token)
      await chain.approve(account1, token, market, overOldCap * 2n)
      const sim = await simulateFrom({
        account: account1,
        address: market,
        functionName: "depositUpTo",
        args: [overOldCap],
      })
      expect(sim.reverted, "deposit above old cap accepted").toBe(false)
    }
    attachAgreement("BOP-20", { oldCap, newCap, record: records[0] })
  })

  test("BOP-21: capacity below current supply allowed; new deposits blocked", async ({
    page,
  }) => {
    requireMarket()
    const capBefore = await marketMaxTotalSupply(market)
    const supply = await marketTotalSupply(market)
    expect(supply).toBeGreaterThan(0n)
    const newCap = supply / 2n

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    await page
      .getByRole("button", { name: /^adjust capacity$/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    await dialog
      .getByRole("textbox")
      .first()
      .fill(formatAmountForInput(newCap, decimals))
    await dialog.getByRole("button", { name: /^confirm$/i }).click()
    await waitBorrowerTxSuccess(page)
    await closeDialog(page)
    await ensureCapacityApplied(market, newCap)

    const capNow = await marketMaxTotalSupply(market)
    expect(capNow < supply, "cap below supply accepted (no forced exits)").toBe(
      true,
    )
    // New deposits revert while supply exceeds the cap (depositUpTo mints nothing).
    faucet(account1, deposit, token)
    await chain.approve(account1, token, market, deposit)
    const sim = await simulateFrom({
      account: account1,
      address: market,
      functionName: "depositUpTo",
      args: [deposit],
    })
    expect(sim.reverted, "no new deposits until supply drops below cap").toBe(
      true,
    )
    // Restore the previous capacity on-chain so later tests keep headroom.
    await setMaxTotalSupplyOnChain(market, capBefore)
    await syncSubgraph()
    attachAgreement("BOP-21", { supply, newCap, restoredCap: capBefore })
  })

  test("BOP-19: minimum deposit change enforced on new deposits", async ({
    page,
  }) => {
    requireMarket()
    test.skip(
      !primary!.hooksConfig?.useOnDeposit,
      "market's hooks do not gate deposits (useOnDeposit=false) — minimum deposit not adjustable",
    )
    const oldMin = BigInt(primary!.hooksConfig?.minimumDeposit ?? "0")
    const newMin = (oldMin > 0n ? oldMin : parseUnits("10", decimals)) * 2n

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    await page
      .getByRole("button", { name: /^adjust minimum deposit$/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText(/current minimum deposit/i)).toBeVisible({
      timeout: 30_000,
    })
    await dialog
      .getByRole("textbox")
      .first()
      .fill(formatAmountForInput(newMin, decimals))
    await dialog.getByRole("button", { name: /^confirm$/i }).click()
    await waitBorrowerTxSuccess(page)
    await closeDialog(page)

    await syncSubgraph()
    const row = await marketRow(market)
    expect(BigInt(row!.hooksConfig?.minimumDeposit ?? "0")).toBe(newMin)
    // A below-minimum deposit reverts.
    const below = newMin - parseUnits("1", decimals)
    faucet(account1, newMin * 2n, token)
    await chain.approve(account1, token, market, newMin * 2n)
    const sim = await simulateFrom({
      account: account1,
      address: market,
      functionName: "depositUpTo",
      args: [below],
    })
    expect(sim.reverted, "deposit below the new minimum rejected").toBe(true)

    // Restore: reruns would otherwise double the minimum every pass (review finding 12).
    if (oldMin > 0n) {
      await page
        .getByRole("button", { name: /^adjust minimum deposit$/i })
        .first()
        .click()
      const restoreDialog = page.getByRole("dialog")
      await restoreDialog
        .getByRole("textbox")
        .first()
        .fill(formatAmountForInput(oldMin, decimals))
      await restoreDialog.getByRole("button", { name: /^confirm$/i }).click()
      await waitBorrowerTxSuccess(page)
      await closeDialog(page)
      await syncSubgraph()
      expect(
        BigInt((await marketRow(market))!.hooksConfig?.minimumDeposit ?? "0"),
        "minimum deposit restored for reruns",
      ).toBe(oldMin)
    }
    attachAgreement("BOP-19", { oldMin, newMin, restored: oldMin > 0n })
  })

  test("BOP-30: portfolio views and read-only access to other borrowers' markets", async ({
    page,
  }) => {
    requireMarket()
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    await step(page, "Telegram get-updates link", async () => {
      const link = page.getByRole("link", {
        name: /get updates from telegram/i,
      })
      await expect(link).toBeVisible({ timeout: 30_000 })
      expect(await link.getAttribute("href")).toMatch(/t\.me|telegram/i)
    })

    await step(page, "own markets list", async () => {
      await page.goto("/borrower")
      await expect(page.getByText(primary!.name).first()).toBeVisible({
        timeout: 60_000,
      })
    })

    await step(page, "other borrower's market is read-only", async () => {
      await page.goto(
        `/borrower/market/${pinnedMarkets.openTerm.toLowerCase()}`,
      )
      // Non-owner: no Borrow and Repay section, no Terminate button.
      await expect(
        page.getByRole("button", { name: /status and details/i }),
      ).toBeVisible({ timeout: 60_000 })
      await expect(
        page.getByRole("button", { name: /borrow and repay/i }),
      ).toBeHidden()
      await expect(
        page.getByRole("button", { name: /terminate market/i }),
      ).toBeHidden()
    })
  })

  test("BOP-32: protocol fee accrues on top of lender APR and is collectable", async () => {
    requireMarket()
    test.skip(
      (primary!.protocolFeeBips ?? 0) === 0,
      "market has no protocol fee configured — nothing to accrue/collect",
    )
    await advanceTime(3600)
    await chain.updateState(BORROWER, market)
    await syncSubgraph()
    const before = await marketRow(market)
    const pending = BigInt(before!.pendingProtocolFees)
    expect(pending, "fees accrued over the hour").toBeGreaterThan(0n)

    const assetsBefore = await marketTotalAssets(market)
    await collectFeesOnChain(account0, market) // anyone may trigger; fees go to feeRecipient
    const assetsAfter = await marketTotalAssets(market)
    await syncSubgraph()
    const records = await feesCollectedRecords(market)
    expect(records.length).toBeGreaterThan(0)
    const collected = BigInt(records[0].feesCollected)
    expect(collected).toBeGreaterThan(0n)
    expect(absDiff(assetsBefore - assetsAfter, collected) <= 10n).toBe(true)
    attachAgreement("BOP-32", {
      protocolFeeBips: primary!.protocolFeeBips,
      pendingBefore: pending,
      collected,
    })
  })

  test("BOP-15: fixed-term market — APR increase works, reduction is blocked with clear copy", async ({
    page,
  }) => {
    requireMarket()
    test.skip(
      !fixedTerm,
      "no open fixed-term market owned by borrower #3 — extend the page-3 creation suite to cover BOP-15/18/24",
    )
    const ft = fixedTerm!.id as Address
    const apr0 = await marketApr(ft)
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, ft)
    await ensureConnected(page, BORROWER)

    await step(page, "increase accepted", async () => {
      await adjustAprThroughUi(page, (Number(apr0 + 50n) / 100).toFixed(2))
      await ensureAprApplied(ft, apr0 + 50n)
      expect(await marketApr(ft)).toBe(apr0 + 50n)
    })

    // The block is TERM-SCOPED, not permanent: AprModal derives `aprFixedReduction` from
    // `market.isInFixedTerm`, i.e. `fixedTermEndTime > now`. v2.5's fixture is a market the page-3
    // suite just deployed, so it is still inside its term; main's fixture borrower is a real
    // pre-fork account whose fixed-term markets both matured in January 2025, before the pin block.
    // Both states are worth asserting, and asserting the in-term one against a matured market would
    // report an app defect where the app is right — so branch on the market, not on the variant.
    const chainNow = await chain.blockTimestamp()
    const maturity = fixedTerm!.hooksConfig?.fixedTermEndTime ?? 0
    const stillInTerm = maturity > chainNow
    attachAgreement("BOP-15 fixed-term state", {
      market: ft,
      fixedTermEndTime: maturity,
      chainNow,
      stillInTerm,
    })

    await step(
      page,
      stillInTerm
        ? "reduction blocked with fixed-term copy"
        : "term already matured — the fixed-term block is lifted",
      async () => {
        await page
          .getByRole("button", { name: /^adjust base apr$/i })
          .first()
          .click()
        const dialog = page.getByRole("dialog")
        await dialog
          .getByRole("textbox")
          .first()
          .fill((Number(apr0 - 50n) / 100).toFixed(2))
        const forbidden = dialog.getByRole("button", {
          name: /forbidden \[fixed-term\]/i,
        })
        if (stillInTerm) {
          // AprModal renders the main button as "Forbidden [Fixed-Term]" and disables both buttons.
          await expect(forbidden).toBeDisabled({ timeout: 30_000 })
          await expect(
            dialog.getByRole("button", { name: /^confirm$/i }),
          ).toBeDisabled()
        } else {
          // Past maturity the restriction must be GONE: the ordinary Confirm/Adjust pair comes
          // back and the forbidden copy is never rendered.
          await expect(
            dialog.getByRole("button", { name: /^confirm$/i }),
          ).toBeEnabled({ timeout: 30_000 })
          await expect(forbidden).toHaveCount(0)
        }
        await closeDialog(page)
      },
    )
    // Nothing was submitted either way, so the increase from the first step still stands.
    expect(await marketApr(ft)).toBe(apr0 + 50n)
  })

  test("BOP-18: fixed-term maturity reduction accepted, extension rejected", async ({
    page,
    browser,
  }) => {
    requireMarket()
    test.skip(
      !fixedTerm,
      "no open fixed-term market owned by the fixture borrower — the ops borrower (the impersonated pre-fork account) owns no unmatured fixed-term market; swapping this fixture to a board-deployed market (MKT-04 deploys one under anvil #3, a different account) is a later workstream; V2P-01 carries the chain-side proof of the same semantics",
    )
    const ft = fixedTerm!.id as Address
    const ftHooks = fixedTerm!.hooks!.id as Address
    const ftName = fixedTerm!.name
    test.skip(
      !fixedTerm!.hooksConfig?.allowTermReduction,
      `fixed-term fixture ${ft} was deployed with allowTermReduction=false — the app mounts MaturityModal only for isFixedTerm && isAllowTermReduction (MarketTransactions/index.tsx:264), so there is no reduction UI to drive`,
    )

    const before = await fixedTermEndTimeOnChain(ftHooks, ft)
    const now = await chain.blockTimestamp()
    test.skip(
      before <= now,
      `fixed-term fixture matured at ${before}, chain is already at ${now} — the picker's [today, current maturity] range is empty, so no reduction is reachable. A FIXTURE reason, not a feature gap: main mounts the same MaturityModal, but the ops borrower owns no other unmatured fixed-term market; swapping this fixture to a board-deployed market is a later workstream`,
    )

    // The picker offers whole UTC CALENDAR DAYS between today and the current maturity
    // (MaturityModal minDate/maxDate). Aim ten days earlier, but never inside the seven-day
    // window where the market-list chip swaps the maturity DATE for a relative "n days left"
    // countdown (MarketTypeChip/index.tsx:51-56) — the timezone comparison below needs three
    // rendered dates to compare.
    const listStillShowsADate = utcDayFloor(now + 8 * DAY_SECONDS)
    const reduced = Math.max(
      before - 10 * DAY_SECONDS,
      utcDayFloor(now) + DAY_SECONDS,
      listStillShowsADate,
    )
    test.skip(
      reduced >= before,
      `fixed-term fixture matures at ${before}, only ${Math.round(
        (before - now) / DAY_SECONDS,
      )} days out — no earlier calendar day inside the term still renders as a date in the market list`,
    )

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, ft)
    await ensureConnected(page, BORROWER)

    await step(page, "reduce the maturity through the dialog", async () => {
      const dialog = await openMaturityDialog(page)
      // ModalDataItem "Current Maturity" renders formatUtcMaturity() — the stored instant in UTC.
      expect(await readDialogText(dialog)).toContain(maturityWithTimeLabel(before))
      await typeDateDigits(maturityInput(dialog), maturityDigits(reduced))
      const confirm = dialog.getByRole("button", { name: /^confirm$/i })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      await waitBorrowerTxSuccess(page)
      await closeDialog(page)
    })

    // The hooks instance is the authority; the indexed copy only catches up on the next block.
    expect(
      await fixedTermEndTimeOnChain(ftHooks, ft),
      "on-chain maturity moved to the chosen calendar day",
    ).toBe(reduced)
    await syncSubgraph()
    await expect
      .poll(
        async () => Number((await marketRow(ft))!.hooksConfig?.fixedTermEndTime),
        { timeout: 60_000, message: "subgraph indexes the reduced maturity" },
      )
      .toBe(reduced)

    await step(page, "extension back to the old date is refused", async () => {
      // Reload first: the picker's own maxDate is the CURRENT maturity read from the market
      // account, so an extension attempt only means anything once the page has the reduced value.
      // A refetch-in-flight page would offer the old bound and the rejection would prove nothing.
      await gotoBorrowerMarket(page, ft)
      await ensureConnected(page, BORROWER)
      const dialog = await openMaturityDialog(page)
      await expect(
        dialog.getByText(maturityWithTimeLabel(reduced)).first(),
        "dialog shows the reduced maturity before the extension is attempted",
      ).toBeVisible({ timeout: 60_000 })
      await typeDateDigits(maturityInput(dialog), maturityDigits(before))
      // MaturityModal maps SetFixedTermEndTimeStatus.FixedTermEndTimeIncrease to this helper text
      // and keeps Confirm disabled; the chain's own guard behind it is
      // FixedTermHooks.setFixedTermEndTime → IncreaseFixedTerm() (FixedTermHooks.sol:280).
      await expect(
        dialog.getByText(/you cannot increase the maturity date/i),
      ).toBeVisible({ timeout: 30_000 })
      await expect(
        dialog.getByRole("button", { name: /^confirm$/i }),
      ).toBeDisabled()
      await closeDialog(page)
    })
    expect(
      await fixedTermEndTimeOnChain(ftHooks, ft),
      "the refused extension left the maturity untouched",
    ).toBe(reduced)

    // ---- timezone triple ----------------------------------------------------------------
    // The runsheet asks for ONE maturity rendered consistently across dialog, detail page and
    // market list. A maturity is stored as 00:00 UTC, which in a negative-offset zone is the
    // PREVIOUS afternoon, so a surface that formats it locally reports the wrong calendar day —
    // exactly the regression src/utils/formatters.ts:22-32 was written to close. Read all three
    // in a browser context that is NOT on UTC.
    const TZ = "America/Los_Angeles"
    const tzContext = await browser.newContext({
      timezoneId: TZ,
      baseURL: APP_URL,
    })
    const surfaces: Record<string, string> = {}
    let tzOffsetMinutes = 0
    try {
      const tzPage = await tzContext.newPage()
      await connectAs(tzPage, BORROWER_CONNECT)
      await gotoBorrowerMarket(tzPage, ft)
      await ensureConnected(tzPage, BORROWER)
      tzOffsetMinutes = await tzPage.evaluate(() =>
        new Date().getTimezoneOffset(),
      )
      expect(tzOffsetMinutes, `${TZ} is not UTC in this context`).not.toBe(0)

      const dialog = await openMaturityDialog(tzPage)
      surfaces.dialog = await readDialogText(dialog)
      await closeDialog(tzPage)

      await openStatusDetails(tzPage)
      surfaces.detail = await readParameterValue(tzPage, "Loan Maturity")

      await tzPage.goto("/borrower")
      await ensureConnected(tzPage, BORROWER)
      await tzPage.getByPlaceholder("Search", { exact: true }).first().fill(ftName)
      const row = tzPage.getByRole("row").filter({ hasText: ftName }).first()
      await expect(row).toBeVisible({ timeout: 60_000 })
      // Header cells carry data-field too (CONVENTIONS) — scope to the body cell.
      surfaces.list = (
        await row.locator('.MuiDataGrid-cell[data-field="term"]').innerText()
      )
        .replace(/\s+/g, " ")
        .trim()
    } finally {
      await tzContext.close()
    }

    // One instant, three formats — all derived from `reduced`, none from the viewer's offset.
    expect(surfaces.dialog, "dialog shows the UTC maturity").toContain(
      maturityWithTimeLabel(reduced),
    )
    // Detail page: formatUtcMaturity() ("05 Aug 2026 00:00 UTC").
    const expectedDetail = maturityWithTimeLabel(reduced)
    expect(surfaces.detail, "detail page shows the same UTC day").toBe(
      expectedDetail,
    )
    expect(surfaces.list, "market-list chip shows the same UTC day").toContain(
      maturityDateLabel(reduced),
    )

    attachAgreement("BOP-18 maturity reduction", {
      market: ft,
      hooks: ftHooks,
      fixedTermEndTimeBefore: before,
      fixedTermEndTimeAfter: reduced,
      reducedByDays: (before - reduced) / DAY_SECONDS,
      extensionAttempted: before,
      extensionOutcome: "rejected in the dialog; on-chain maturity unchanged",
      timezone: { timezoneId: TZ, offsetMinutes: tzOffsetMinutes },
      surfaces,
      expected: {
        dialog: maturityWithTimeLabel(reduced),
        detail: expectedDetail,
        list: maturityDateLabel(reduced),
      },
    })
  })

  test("BOP-24: fixed-term early close before maturity", async ({ page }) => {
    requireMarket()
    // Early close is DESTRUCTIVE and consumes its market, so it gets its own fixture: closing
    // BOP-15/BOP-18's market would leave them nothing to assert on the next board, and closing a
    // spare open-term market would not be a fixed-term close at all. MKT-04 deploys the sibling.
    test.skip(
      !earlyCloseTerm,
      "no second fixed-term market with allowClosureBeforeTerm=true owned by the fixture borrower — on v2.5 MKT-04 deploys the sibling this case consumes; on main MKT-04 deploys one fixed-term market per run under anvil #3, not the ops/fixture borrower this suite uses, so this is a FIXTURE reason, not a feature gap (main mounts the same terminate-market flow)",
    )
    const target = earlyCloseTerm!.id as Address
    const hooks2 = earlyCloseTerm!.hooks!.id as Address
    const token2 = earlyCloseTerm!.asset.address as Address
    const dec2 = earlyCloseTerm!.asset.decimals
    const cycle2 = Number(earlyCloseTerm!.withdrawalBatchDuration)

    const hooked = await fixedTermHookedMarket(hooks2, target)
    expect(
      hooked.allowClosureBeforeTerm,
      "fixture permits closure before term",
    ).toBe(true)
    const maturity = Number(hooked.fixedTermEndTime)
    const startedAt = await chain.blockTimestamp()
    test.skip(
      startedAt >= maturity,
      `fixed-term fixture already matured at ${maturity} (chain ${startedAt}) — this case is specifically the BEFORE-maturity close`,
    )

    const dep2 =
      BigInt(earlyCloseTerm!.hooksConfig?.minimumDeposit ?? "0") +
      parseUnits("100", dec2)

    await step(
      page,
      "seed: lender deposit + borrower draw (chain)",
      async () => {
        if (earlyCloseTerm!.hooksConfig?.depositRequiresAccess) {
          const status = await storedLenderStatus(hooks2, account1)
          if (status.lastApprovalTimestamp === 0) {
            // Two ways a lender gets deposit access, and the fixture may use either. A
            // borrower-administered allowlist needs an explicit grant; a Self-Onboarding policy
            // carries an open-access PULL provider that grants at deposit time, so there is
            // nothing to arrange and no reason to skip. (MKT-04's fixtures are the second kind —
            // an unconditional `providers.length === 0` skip here would silently retire this
            // case, which is exactly how it stayed unimplemented.) If neither path grants access
            // the deposit below reverts and the test fails, which is the honest outcome.
            const providers = await accessListProviders(hooks2)
            if (providers.length > 0)
              await addAccessListMembers(
                providers[0].providerAddress as Address,
                [account1],
              )
          }
        }
        if ((await chain.marketBalance(target, account1)) < dep2 / 2n) {
          faucet(account1, dep2 * 2n, token2)
          await chain.approve(account1, token2, target, dep2 * 2n)
          await chain.depositUpTo(account1, target, dep2)
        }
        const borrowable = await marketBorrowable(target)
        if (borrowable > 0n) await borrowOnChain(target, borrowable / 2n)
        // The single close tx pulls the whole outstanding debt from the borrower's wallet.
        faucet(BORROWER, dep2 * 3n, token2)
        await syncSubgraph()
      },
    )

    // Baseline: the market is genuinely accruing before the close, so "accrual stopped" below is
    // a change of behaviour rather than a market that never moved. Bounded 10-minute jump.
    const sfOpen = await marketScaleFactor(target)
    await advanceTime(600)
    await chain.updateState(BORROWER, target)
    const sfAtClose = await marketScaleFactor(target)
    expect(
      sfAtClose > sfOpen,
      "interest accrues while the fixed-term market is open",
    ).toBe(true)

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, target)
    await ensureConnected(page, BORROWER)
    const closedAt = await step(
      page,
      "terminate before maturity through the UI",
      async () => {
        await page
          .getByRole("button", { name: /terminate market/i })
          .first()
          .click()
        const dialog = page.getByRole("dialog")
        await expect(dialog.getByText(/debts/i).first()).toBeVisible({
          timeout: 30_000,
        })
        const approve = dialog.getByRole("button", { name: /^approve$/i })
        if (await approve.isEnabled({ timeout: 5_000 }).catch(() => false)) {
          await approve.click()
          await expect(
            dialog.getByRole("button", { name: /^approved$/i }),
          ).toBeVisible({ timeout: 90_000 })
        }
        const closeBtn = dialog.getByRole("button", {
          name: /repay and terminate/i,
        })
        await expect(closeBtn).toBeEnabled({ timeout: 60_000 })
        await closeBtn.click()
        await waitBorrowerTxSuccess(page)
        await closeDialog(page)
        await ensureMarketClosed(target, token2, dec2)
        return chain.blockTimestamp()
      },
    )

    expect(await marketIsClosed(target)).toBe(true)
    // Closing INSIDE the term pulls the term end forward to the closing block
    // (FixedTermHooks.onCloseMarket, v2.5-protocol/src/access/FixedTermHooks.sol:495-500) —
    // the early close IS a maturity change, and it is what unlocks lender withdrawals below.
    const maturityAfter = await fixedTermEndTimeOnChain(hooks2, target)
    expect(
      maturityAfter,
      "closure before term pulled the maturity to the closing block",
    ).toBeLessThan(maturity)
    expect(maturityAfter).toBeLessThanOrEqual(closedAt)

    await step(page, "accrual stops at closure", async () => {
      const sf1 = await marketScaleFactor(target)
      await advanceTime(600)
      await chain.updateState(BORROWER, target)
      expect(await marketScaleFactor(target), "scale factor frozen").toBe(sf1)
    })

    // ---- the lender can still get out --------------------------------------------------
    // Closed-market exit semantics (zero-duration batch, no cycle wait) are established by
    // LEN-20 in lenderflows/allowlist-closure.spec.ts; this case proves they hold for a market
    // closed BEFORE its fixed term, driving the request through the lender UI and settling the
    // batch on chain.
    const lenderContext = await page.context().browser()!.newContext({
      baseURL: APP_URL,
    })
    let uiExit: Record<string, unknown> = {}
    try {
      const lenderPage = await lenderContext.newPage()
      await connectAs(lenderPage, 1)
      // Wall-clock page: the SLA API bounds timeSigned to the SERVER clock (CONVENTIONS "Time"),
      // so ToU must be signed BEFORE gotoMarket installs the chain-aligned clock.
      await ensureTouSigned(lenderPage, account1, target)
      await gotoMarket(lenderPage, target)
      await ensureConnected(lenderPage, account1)
      const balanceBefore = await chain.marketBalance(target, account1)
      expect(balanceBefore, "lender still holds a position").toBeGreaterThan(0n)

      await step(
        lenderPage,
        "lender requests the full balance on the closed market",
        async () => {
          await lenderPage
            .getByRole("button", { name: /^withdraw$/i })
            .first()
            .click()
          const dialog = lenderPage.getByRole("dialog")
          await expect(dialog).toBeVisible({ timeout: 30_000 })
          await dialog
            .getByRole("button", { name: /^(max|all) ·/i })
            .first()
            .click()
          const confirm = dialog.getByRole("button", {
            name: /^withdraw .*step/i,
          })
          await expect(confirm).toBeEnabled({ timeout: 30_000 })
          await confirm.click()
          // The refetch can unmount the modal around the success view; the durable signal is the
          // on-chain burn (CONVENTIONS "UI waits").
          await expect
            .poll(async () => chain.marketBalance(target, account1), {
              timeout: 120_000,
            })
            .toBe(0n)
        },
      )
      uiExit = { requested: balanceBefore.toString() }
    } finally {
      await lenderContext.close()
    }

    // A closed market's batch carries ZERO duration: its expiry is the queue block itself, so the
    // ordinary cycle never applies. Two seconds of chain time make the expiry strictly past (a
    // view against a block minted in the same second reverts WithdrawalBatchNotExpired).
    const queuedAt = await chain.blockTimestamp()
    await advanceTime(2)
    await chain.updateState(account1, target)
    await syncSubgraph()
    const expiry = await latestWithdrawalBatchExpiry(target)
    expect(
      cycle2,
      "the market does have an ordinary withdrawal cycle",
    ).toBeGreaterThan(0)
    expect(expiry, "the batch belongs to this request").toBeGreaterThanOrEqual(
      closedAt,
    )
    // An ordinary batch would expire a whole cycle after the queue block; this one expires AT it.
    expect(
      expiry - queuedAt,
      "no ordinary cycle delay on a closed market",
    ).toBeLessThan(cycle2)
    const claimable = await chain.getAvailableWithdrawalAmount(
      target,
      account1,
      expiry,
    )
    expect(claimable, "the request is payable immediately").toBeGreaterThan(0n)
    const assetBefore = await chain.erc20Balance(token2, account1)
    await chain.executeWithdrawal(account1, target, account1, expiry)
    expect(
      (await chain.erc20Balance(token2, account1)) - assetBefore,
      "the lender receives the underlying",
    ).toBe(claimable)
    expect(await chain.marketBalance(target, account1)).toBe(0n)

    await syncSubgraph()
    const row = await marketRow(target)
    expect(row!.isClosed).toBe(true)
    expect((await marketClosedRecords(target)).length).toBeGreaterThan(0)
    attachAgreement("BOP-24 early close before maturity", {
      market: target,
      name: earlyCloseTerm!.name,
      hooks: hooks2,
      allowClosureBeforeTerm: true,
      fixedTermEndTimeBefore: maturity,
      fixedTermEndTimeAfter: maturityAfter,
      closedAtChainTime: closedAt,
      secondsRemainingOnTermAtClosure: maturity - closedAt,
      scaleFactorAtClosure: sfAtClose.toString(),
      accrualAfterClosure: "frozen across a 600s jump",
      lenderExit: { ...uiExit, batchExpiry: expiry, claimed: claimable.toString() },
      citesForUiClaimHalf: "LEN-20 (lenderflows/allowlist-closure.spec.ts)",
    })
  })

  test("BOP-22: terminate an empty market", async ({ page }) => {
    requireMarket()
    test.skip(
      !closeEmptyTarget,
      "no spare zero-deposit open-term market owned by the ops borrower — page 3 must create at least three open-term markets to cover BOP-22 alongside BOP-23",
    )
    const target = closeEmptyTarget!.id as Address
    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, target)
    await ensureConnected(page, BORROWER)
    await page
      .getByRole("button", { name: /terminate market/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    // VERIFY: a never-active market takes the simple TerminateFlow ("Are you sure…"). If dust
    // debt (accrued protocol fees) routed it into RepayAndTerminateFlow instead, drive that
    // flow's Approve → "Repay and Terminate" buttons.
    await expect(dialog.getByText(/are you sure/i)).toBeVisible({
      timeout: 30_000,
    })
    await dialog.getByRole("button", { name: /terminate market/i }).click()
    await waitBorrowerTxSuccess(page)
    await closeDialog(page)
    await ensureMarketClosed(
      target,
      closeEmptyTarget!.asset.address as Address,
      closeEmptyTarget!.asset.decimals,
    )

    expect(await marketIsClosed(target)).toBe(true)
    await syncSubgraph()
    const row = await marketRow(target)
    expect(row!.isClosed).toBe(true)
    expect((await marketClosedRecords(target)).length).toBeGreaterThan(0)
    attachAgreement("BOP-22", { market: target, name: closeEmptyTarget!.name })
  })

  test("BOP-23: repay + terminate in one flow (creates the LEN-20 fixture)", async ({
    page,
  }) => {
    requireMarket()
    test.skip(
      !closeRepayTarget,
      "no spare open-term market owned by #3 to close — the PRIMARY market must stay open for BOP-14, so page 3 must create a second open-term market (this also blocks LEN-20)",
    )
    const target = closeRepayTarget!.id as Address
    const token2 = closeRepayTarget!.asset.address as Address
    const dec2 = closeRepayTarget!.asset.decimals
    const hooks2 = closeRepayTarget!.hooks!.id as Address
    const dep2 =
      BigInt(closeRepayTarget!.hooksConfig?.minimumDeposit ?? "0") +
      parseUnits("100", dec2)

    await step(
      page,
      "seed: lender deposit + borrower draw (chain)",
      async () => {
        if (closeRepayTarget!.hooksConfig?.depositRequiresAccess) {
          const status = await storedLenderStatus(hooks2, account1)
          if (status.lastApprovalTimestamp === 0) {
            const providers = await accessListProviders(hooks2)
            test.skip(
              providers.length === 0,
              "close target requires deposit access but has no borrower-administered access list to grant it through",
            )
            await addAccessListMembers(
              providers[0].providerAddress as Address,
              [account1],
            )
          }
        }
        if ((await chain.marketBalance(target, account1)) < dep2 / 2n) {
          faucet(account1, dep2 * 2n, token2)
          await chain.approve(account1, token2, target, dep2 * 2n)
          await chain.depositUpTo(account1, target, dep2)
        }
        const borrowable = await marketBorrowable(target)
        if (borrowable > 0n) await borrowOnChain(target, borrowable / 2n)
        // The single close tx pulls the whole outstanding debt from the borrower's wallet.
        faucet(BORROWER, dep2 * 3n, token2)
        await syncSubgraph()
      },
    )

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, target)
    await ensureConnected(page, BORROWER)
    await page
      .getByRole("button", { name: /terminate market/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText(/debts/i).first()).toBeVisible({
      timeout: 30_000,
    })
    const approve = dialog.getByRole("button", { name: /^approve$/i })
    if (await approve.isEnabled({ timeout: 5_000 }).catch(() => false)) {
      await approve.click()
      await expect(
        dialog.getByRole("button", { name: /^approved$/i }),
      ).toBeVisible({ timeout: 90_000 })
    }
    const closeBtn = dialog.getByRole("button", {
      name: /repay and terminate/i,
    })
    await expect(closeBtn).toBeEnabled({ timeout: 60_000 })
    await closeBtn.click()
    await waitBorrowerTxSuccess(page)
    await closeDialog(page)
    await ensureMarketClosed(
      target,
      closeRepayTarget!.asset.address as Address,
      closeRepayTarget!.asset.decimals,
    )

    expect(await marketIsClosed(target)).toBe(true)
    await step(page, "interest stopped after close", async () => {
      const sf1 = await marketScaleFactor(target)
      await advanceTime(600)
      await chain.updateState(BORROWER, target)
      expect(await marketScaleFactor(target), "scale factor frozen").toBe(sf1)
    })

    await step(
      page,
      "lender exits with request + claim, no cycle wait",
      async () => {
        // Closed market: a queued batch expires immediately; two txs, no cycle.
        // Exit only HALF so the remaining balance stays as the LEN-20 fixture.
        const bal = await chain.marketBalance(target, account1)
        const expiry = await chain.queueWithdrawal(account1, target, bal / 2n)
        // A closed market gives the batch a ZERO duration, so its expiry IS the queue block's
        // second, and getAvailableWithdrawalAmount reverts WithdrawalBatchNotExpired
        // (0x2561b880) for any block minted in that same second. Two seconds of chain time
        // before updateState makes the expiry strictly past.
        await advanceTime(2)
        await chain.updateState(account1, target)
        await syncSubgraph()
        // Never reuse the simulated expiry — read the mined batch (CONVENTIONS).
        const realExpiry = await latestWithdrawalBatchExpiry(target)
        const available = await chain.getAvailableWithdrawalAmount(
          target,
          account1,
          realExpiry,
        )
        expect(available).toBeGreaterThan(0n)
        await chain.executeWithdrawal(account1, target, account1, realExpiry)
        expect(expiry).toBeGreaterThan(0)
      },
    )

    await syncSubgraph()
    const row = await marketRow(target)
    expect(row!.isClosed).toBe(true)
    expect((await marketClosedRecords(target)).length).toBeGreaterThan(0)
    closedMarketName = closeRepayTarget!.name
    attachAgreement("BOP-23 / LEN-20 fixture", {
      market: target,
      name: closedMarketName,
      lenderWithRemainingBalance: account1,
      note: "LEN-20 unblocked: closed market with account #1 still holding a claimable balance",
    })
  })

  test("BOP-25: terminated market moves to 'Your Terminated Markets'", async ({
    page,
  }) => {
    requireMarket()
    test.skip(
      !closedMarketName,
      "BOP-23 did not run (no spare market to close)",
    )
    await connectAs(page, BORROWER_CONNECT)
    const t0 = Date.now()
    await page.goto("/borrower")
    await ensureConnected(page, BORROWER)
    // VERIFY: the dashboard sidebar section is labeled "Your Terminated Markets"
    // (marketList.borrower.terminatedTitle); the closed market lands in its
    // "Previously Active" sub-table which may need no extra expansion.
    await page
      .getByRole("button", { name: /your terminated markets/i })
      .first()
      .click()
    await expect(page.getByText(closedMarketName!).first()).toBeVisible({
      timeout: 120_000,
    })
    attachAgreement("BOP-25", {
      market: closedMarketName,
      displayLagMs: Date.now() - t0,
    })
  })

  test("BOP-14: APR cut >25% activates the doubled temporary reserve ratio", async ({
    page,
  }) => {
    requireMarket()
    await clearAprPeg(hooksAddr, market)
    const apr0 = await marketApr(market)
    aprBeforeBigCut = apr0
    const rr0 = await marketReserveRatio(market)
    expect(apr0).toBeGreaterThan(4n)
    const newApr = (apr0 * 3n) / 5n // 40% relative cut
    const reduction = apr0 - newApr
    // MarketConstraintHooks._calculateTemporaryReserveRatioBips (single rounding, pre-audit
    // fix V25-A-04): temp = max(origRR, min(10000, floor(20000 * reduction / origApr))).
    const doubled = (20_000n * reduction) / apr0
    const expectedTemp = doubled > 10_000n ? 10_000n : doubled
    const expectedRr = expectedTemp > rr0 ? expectedTemp : rr0
    const expectedRrPercent = (Number(expectedRr) / 100).toString()

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    await page
      .getByRole("button", { name: /^adjust base apr$/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    await dialog
      .getByRole("textbox")
      .first()
      .fill((Number(newApr) / 100).toFixed(2))

    await step(page, "modal warns: doubled excess + 2-week lock", async () => {
      await expect(dialog.getByText(/effects of apr adjustment/i)).toBeVisible({
        timeout: 30_000,
      })
      await expect(
        dialog.getByText(`${expectedRrPercent}%`).first(),
      ).toBeVisible({ timeout: 30_000 })
      // Pre-tx expiry hint is computed client-side (today+14d, local date) — assert presence
      // only; the on-chain expiry is asserted below (known ±1 day near midnight, not a defect).
      await expect(
        dialog.getByText(/temporary reserve ratio in force until/i),
      ).toBeVisible()
    })

    await dialog.getByRole("button", { name: /^confirm$/i }).click()
    await dialog.getByRole("checkbox").check()
    await dialog.getByRole("button", { name: /^adjust$/i }).click()
    await waitBorrowerTxSuccess(page)
    await closeDialog(page)
    await ensureAprApplied(market, newApr)

    // chain oracles
    expect(await marketApr(market)).toBe(newApr)
    expect(await marketReserveRatio(market)).toBe(expectedRr)
    const [tApr, tRr, tExpiry] = await tempExcessReserveRatio(hooksAddr, market)
    expect(BigInt(tApr)).toBe(apr0)
    expect(BigInt(tRr)).toBe(rr0)
    const now = await chain.blockTimestamp()
    // expiry == tx block timestamp + 2 weeks (1,209,600 s exact); allow the polling gap.
    expect(Math.abs(tExpiry - (now + 1_209_600))).toBeLessThanOrEqual(120)

    // subgraph oracles
    await syncSubgraph()
    const row = await marketRow(market)
    expect(row!.temporaryReserveRatioActive).toBe(true)
    expect(row!.originalAnnualInterestBips).toBe(Number(apr0))
    expect(row!.originalReserveRatioBips).toBe(Number(rr0))
    expect(row!.temporaryReserveRatioExpiry).toBe(tExpiry)
    const rrRecords = await latestReserveRatioRecords(market, 1)
    expect(rrRecords[0]).toEqual({
      oldReserveRatioBips: Number(rr0),
      newReserveRatioBips: Number(expectedRr),
    })

    // UI oracle: the borrower banner carries the on-chain expiry.
    await gotoBorrowerMarket(page, market)
    const banner = page.getByTestId("borrower-temp-ratio-active")
    await expect(banner).toBeVisible({ timeout: 60_000 })
    expect(Number(await banner.getAttribute("data-expiry"))).toBe(tExpiry)
    attachAgreement("BOP-14 activation", {
      apr0,
      newApr,
      rr0,
      expectedRr,
      hooksExpiry: tExpiry,
      bannerText: (await banner.innerText()).trim(),
    })
  })

  /**
   * LAST TEST — permanent 2-week time jump (fork-lifetime; see the suite header).
   * Verifies the runsheet's expiry-reset TBD: nothing auto-reverts at expiry; the borrower
   * must send a reset transaction (BOP-14 pilot, MarketConstraintHooks.sol L221-237).
   */
  test("BOP-14b: 2-week jump — lock expires, borrower resets the ratio", async ({
    page,
  }) => {
    requireMarket()
    const rrElevated = await marketReserveRatio(market)
    const [, rr0] = await tempExcessReserveRatio(hooksAddr, market)
    test.skip(
      rr0 === 0,
      "no active temporary reserve ratio (BOP-14 did not run)",
    )

    await advanceTime(14 * 86_400 + 3_600)
    await chain.updateState(BORROWER, market)
    await syncSubgraph()
    // No auto-revert on-chain after expiry.
    expect(await marketReserveRatio(market), "still elevated post-expiry").toBe(
      rrElevated,
    )

    await connectAs(page, BORROWER_CONNECT)
    await gotoBorrowerMarket(page, market) // fresh page → clock at post-jump chain time
    await ensureConnected(page, BORROWER)
    await expect(page.getByTestId("borrower-temp-ratio-expired")).toBeVisible({
      timeout: 60_000,
    })

    await step(page, "APR modal offers the reset", async () => {
      await page
        .getByRole("button", { name: /^adjust base apr$/i })
        .first()
        .click()
      const dialog = page.getByRole("dialog")
      const current = await marketApr(market)
      // Typing any APR below the current one flips the modal into needs-reset mode.
      await dialog
        .getByRole("textbox")
        .first()
        .fill((Number((current * 9n) / 10n) / 100).toFixed(2))
      await expect(
        dialog.getByText(/temporary reserve ratio has expired/i),
      ).toBeVisible({ timeout: 30_000 })
      const reset = dialog.getByRole("button", {
        name: /reset temporary reserve ratio/i,
      })
      await expect(reset).toBeEnabled({ timeout: 30_000 })
      await reset.click()
      await waitBorrowerTxSuccess(page)
      await closeDialog(page)
    })
    await ensureRatioReset(market, BigInt(rr0))

    // chain: original ratio restored, hooks mapping cleared (Expired path).
    expect(await marketReserveRatio(market)).toBe(BigInt(rr0))
    const [a, b, c] = await tempExcessReserveRatio(hooksAddr, market)
    expect([a, b, c]).toEqual([0, 0, 0])
    await syncSubgraph()
    const row = await marketRow(market)
    expect(row!.temporaryReserveRatioActive).toBe(false)
    expect(row!.reserveRatioBips).toBe(rr0)

    // Tidy: restore the pre-BOP-14 APR (a plain increase — unconstrained) and confirm the
    // expired banner is gone for the next suite run.
    await adjustAprThroughUi(page, (Number(aprBeforeBigCut) / 100).toFixed(2))
    await ensureAprApplied(market, aprBeforeBigCut)
    expect(await marketApr(market)).toBe(aprBeforeBigCut)
    await expect(page.getByTestId("borrower-temp-ratio-expired")).toBeHidden({
      timeout: 60_000,
    })
    attachAgreement("BOP-14b expiry/reset", {
      restoredReserveRatioBips: rr0,
      note: "chain time is now ~2 weeks ahead of wall clock — signature-API suites need dev:fork:reset",
    })
  })
})
