/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits } from "viem"

import { hasOpenAccessProvider, hooksInstance } from "../borrowerflows/helpers"
import {
  BORROWER,
  borrowerMarkets,
  type BorrowerMarketRow,
} from "../borrowerflows/lib"
import { gotoAligned, rowsIn } from "../lenderflows/helpers"
import {
  account0,
  account1,
  ensureNoMlaAcknowledged,
  ensureTouSigned,
  CHAIN_ID,
  marketMaxTotalSupply,
  marketScaledBalance,
  marketTotalSupply,
  openDepositDialog,
  openSection,
  pinnedMarkets,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  unpaidBatchExpiries,
} from "../lenderflows/lib"
import * as chain from "../lib/chain"
import {
  APP_URL,
  FORK_GQL,
  FORK_RPC,
  advanceTime,
  dbExec,
  faucet,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import {
  alignBrowserClockToChain,
  connectAs,
  ensureConnected,
  openWithdrawalRequests,
  readOngoingAmounts,
  readWithdrawalsStatus,
  waitAvailableToWithdraw,
} from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test, type Page } from "../lib/test"

/**
 * UAT 10 "Edge & Regression" (EDG-01…15) — the cross-cutting gap checks.
 *
 * ── PORTED SUBSET (COVERAGE-SUGGESTIONS-2026-09-08 §7) ────────────────────────────────
 * The v2.5 worktree owns the full file. §7 names the high-value rows for main: refresh
 * recovery, failed-send recovery and the mobile lender loop. Those are the rows here, with
 * their v2.5 titles UNCHANGED so the side-by-side pairs row-for-row:
 *
 * EDG-12 session persistence -> ported. A hard refresh between request and claim.
 * EDG-13 error states        -> ported. Subgraph/RPC outage + a failed send, via route
 *                               interception (nothing is written by the injected failures).
 * EDG-11 mobile              -> ported. Mobile viewport describe at the bottom.
 *
 * NOT ported here — not a gate; nobody has assessed them against main yet:
 *   EDG-01 (capacity overshoot), EDG-03 (deposit at cap), EDG-05 (two-batch FIFO),
 *   EDG-07 (number formatting sweep), EDG-08 (Explore "Glass Door" filter), EDG-10 (indexing
 *   lag) and the five v2.5 `test.fixme` rows EDG-02/04 (covered elsewhere) and
 *   EDG-06/09/14/15 (no sanctions oracle, ADM-11 dependency, external docs, external bot).
 *   EDG-08 in particular needs a main-side re-derivation: `isFrontendVisibleMarket` and the
 *   penalty-borrower exclusion differ from v2.5's (see e2e/COVERAGE.md).
 *
 * ── Fixtures & hygiene ───────────────────────────────────────────────────────────────
 *  - EDG-11 is read-only against the PINNED open-term market and account #0.
 *  - EDG-12/EDG-13 need a market account #0 can DEPOSIT into through the UI, so the setup
 *    discovers one from the fixture borrower's markets exactly as v2.5 does — with one extra
 *    preference (see `chooseEdgeMarket`): an MLA-free market whose deposits need no credential
 *    is picked first, because a credential-gated market fronts the deposit dialog with a
 *    self-onboarding step this suite does not exercise (LEN-15 does).
 *    On MAIN that resolves to the pre-fork fixture borrower's markets, which is what the
 *    variant needs: markets the FORK created are indexed only by the v2.5 subgraph
 *    (`wildcat-sepolia-fork`), never by main's `wildcat-sepolia-fork-v218`, because the two
 *    generations deploy through different factories. There is therefore no "run the page-3
 *    suite first" path on main and none is needed.
 *  - The market's borrower needs a `Borrower` row or the no-MLA acknowledgement renders
 *    "Borrower profile is unavailable." with Acknowledge permanently disabled. The harness DB
 *    snapshot has none for main's fixture borrower, so one is seeded exactly the way LEN-14
 *    seeds it — insert-if-missing only, never an update, so no other suite's expectations move.
 *  - Everything this suite changes is settled: the unpaid queue is drained and every batch
 *    claimed. It leaves account #0 holding a deposit position, which every lender suite's own
 *    setup already tolerates (they self-clean and assert deltas, not absolutes).
 *  - ORDERING: run this file BEFORE the permanent multi-day jumps (KNOWN-ISSUES H1) — the setup
 *    signs agreements and the signature APIs bound `timeSigned` against the SERVER wall clock.
 *    Its own time travel is bounded by ONE withdrawal cycle (360 s on main's fixtures).
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 }

/** Values that must never reach the DOM (formatter regressions have produced all of these). */
const BAD_TOKEN_RE =
  /\bNaN\b|\bInfinity\b|\bundefined\b|\[object [A-Za-z]+\]|\d,\d{4}/g

/** Playwright's clock can only be installed once per page; gotoMarket would install it again.
 *  After the first install, every open RE-SYNCS the mocked clock to chain time — the suite
 *  time-travels between tests, and a page clock left behind the chain makes the app classify
 *  expired batches as still pending (claimable renders 0 forever). */
const clocked = new WeakSet<Page>()
const openMarketPage = async (page: Page, market: string) => {
  if (clocked.has(page)) {
    await page.clock.setSystemTime((await chain.blockTimestamp()) * 1000)
  }
  if (!clocked.has(page)) {
    await alignBrowserClockToChain(page)
    clocked.add(page)
  }
  await page.goto(`/lender/market/${market.toLowerCase()}`)
}

/** The page must never render a Next.js error boundary / blank body. */
const expectNoWhiteScreen = async (
  page: Page,
  label: string,
  minLength = 80,
) => {
  const body = (await page.locator("body").innerText()).trim()
  expect(
    body.length,
    `${label}: page body is not blank`,
  ).toBeGreaterThanOrEqual(minLength)
  expect(body, `${label}: no Next.js error boundary`).not.toMatch(
    /Application error|client-side exception|Internal Server Error/i,
  )
  return body
}

/**
 * Formatter blow-ups visible in rendered text. Market names come from the fork catalogue and are
 * arbitrary strings, so a hit that is only part of a market NAME is not a formatting defect.
 */
const formatterLeaks = (body: string, allowedNames: string[]) =>
  (body.match(BAD_TOKEN_RE) ?? []).filter(
    (hit) => !allowedNames.some((name) => name.includes(hit)),
  )

/** Horizontal page overflow — the "overflowing layouts" half of EDG-07/EDG-11. */
const horizontalOverflowPx = (page: Page) =>
  page.evaluate(() => {
    const el = document.documentElement
    return Math.max(0, el.scrollWidth - el.clientWidth)
  })

/** GET /api/mla/<market> answers {"noMLA":true} for a declined-MLA market and the full MLA
 *  document otherwise (both status 200), so branch on the body. */
const mlaFree = async (id: string) => {
  const res = await fetch(`${APP_URL}/api/mla/${id}?chainId=${CHAIN_ID}`)
  const body = (await res.json().catch(() => null)) as {
    noMLA?: boolean
  } | null
  return body?.noMLA === true
}

/**
 * The no-MLA acknowledgement text embeds the borrower's legal name, and both the client and the
 * server refuse to produce it without a `Borrower` row — the modal then renders "Borrower profile
 * is unavailable." with Acknowledge permanently disabled. main's sanitized harness DB has no row
 * for its pre-fork fixture borrower. Seed a minimal one (fixture only, no app code involved),
 * INSERT-only so a borrower another suite already asserts against is never rewritten. Same shape
 * as LEN-14's seed; a no-op on v2.5, where the page-3 suite already seeded its borrower.
 */
const seedMarketBorrowerProfile = (account: Address) => {
  const a = account.toLowerCase()
  dbExec(
    `insert into "Borrower" ("chainId", address, name, alias, "registeredOnChain", "removedFromArchController")
     select ${CHAIN_ID}, '${a}', 'E2E Fixture Borrower Ltd', 'E2E Fixture Borrower', true, false
     where not exists (select 1 from "Borrower" where "chainId"=${CHAIN_ID} and address='${a}')`,
  )
}

test.describe.serial("edge & regression (UAT 10)", () => {
  const openTerm = pinnedMarkets.openTerm.toLowerCase() as Address

  // fixture used by every transaction row
  let edge: BorrowerMarketRow | undefined
  let edgeMarket: Address
  let edgeToken: Address
  let edgeDecimals = 18
  let edgeMinDeposit = 0n
  let edgeDeposit = 0n

  const requireEdgeMarket = () =>
    test.skip(
      !edge,
      "no open-term, open-access market owned by the fixture borrower on the fork subgraph — " +
        "run the page-3 market-creation suite first",
    )

  /**
   * Fixture choice, newest-first like v2.5's, but ranked so the UI deposit ceremony is drivable:
   *   1. MLA-free AND deposits need no credential — the acknowledgement + approve + deposit path
   *      LEN-14/LEN-15 already prove end to end;
   *   2. MLA-free (self-onboarding through an open-access pull provider);
   *   3. anything open-access, MLA or not.
   * Newest-first so we do not collide with the borrower-ops suite's "primary" market, which it
   * picks oldest-first.
   */
  const chooseEdgeMarket = async (candidates: BorrowerMarketRow[]) => {
    const ranked: BorrowerMarketRow[][] = [[], [], []]
    for (const candidate of [...candidates].reverse()) {
      const instance = candidate.hooks
        ? await hooksInstance(candidate.hooks.id)
        : null
      const openDeposits =
        candidate.hooksConfig?.depositRequiresAccess === false
      const openAccess =
        openDeposits || (instance !== null && hasOpenAccessProvider(instance))
      if (openAccess) {
        const noMla = await mlaFree(candidate.id)
        if (noMla && openDeposits) ranked[0].push(candidate)
        else if (noMla) ranked[1].push(candidate)
        else ranked[2].push(candidate)
      }
    }
    return ranked.flat()[0]
  }

  /** Top the account's edge-market position up to `target` (respecting the minimum + the cap). */
  const ensureEdgePosition = async (account: Address, target: bigint) => {
    const balance = await chain.marketBalance(edgeMarket, account)
    if (balance >= target) return balance
    const unit = parseUnits("1", edgeDecimals)
    const room =
      (await marketMaxTotalSupply(edgeMarket)) -
      (await marketTotalSupply(edgeMarket))
    let amount = target - balance
    if (amount < edgeMinDeposit + unit) amount = edgeMinDeposit + unit
    if (amount > room) amount = room
    expect(
      amount > edgeMinDeposit,
      "edge market has room for a minimum-clearing deposit",
    ).toBe(true)
    faucet(account, amount * 2n, edgeToken)
    await chain.approve(account, edgeToken, edgeMarket, amount * 2n)
    await chain.depositUpTo(account, edgeMarket, amount)
    await syncSubgraph()
    return chain.marketBalance(edgeMarket, account)
  }

  test("setup: chain time, agreements, and the page-3 edge-market fixture", async ({
    page,
  }) => {
    test.setTimeout(420_000)
    // The app classifies time-gated state with Date.now(); never let the chain lag the wall clock.
    await syncChainTimeToWallClock()
    for (const account of [account0, account1])
      faucet(account, parseUnits("1", 18))

    const pinned = await subgraph.market(openTerm)
    expect(
      pinned,
      "pinned openTerm market exists on the fork subgraph",
    ).not.toBeNull()

    // Edge fixture: open-term, owned by the fixture borrower, and depositable by account #0
    // without an allowlist entry.
    const owned = await borrowerMarkets()
    const candidates = owned.filter(
      (m) =>
        !m.isClosed &&
        (m.hooksConfig?.fixedTermEndTime ?? 0) === 0 &&
        (m.hooksConfig?.periodDuration ?? 0) === 0,
    )
    edge = await chooseEdgeMarket(candidates)

    attachAgreement("EDG fixtures", {
      pinnedOpenTerm: openTerm,
      fixtureBorrower: BORROWER,
      borrowerMarkets: owned.length,
      openTermCandidates: candidates.map((m) => m.id),
      edgeMarket: edge?.id ?? null,
      edgeMarketName: edge?.name ?? null,
      edgeDepositRequiresAccess: edge?.hooksConfig?.depositRequiresAccess,
    })
    if (!edge) return

    edgeMarket = edge.id as Address
    edgeToken = edge.asset.address as Address
    edgeDecimals = edge.asset.decimals
    edgeMinDeposit = BigInt(edge.hooksConfig?.minimumDeposit ?? "0")
    edgeDeposit = edgeMinDeposit + parseUnits("1", edgeDecimals)
    if (edgeDeposit < parseUnits("100", edgeDecimals))
      edgeDeposit = parseUnits("100", edgeDecimals)

    // The acknowledgement copy needs the borrower's legal name (see the helper).
    seedMarketBorrowerProfile(BORROWER)

    // Signature ceremonies run on the EDGE market (wall-clock pages): the market page offers
    // Deposit only to a lender holding the token (zero balance renders the Faucet button
    // instead), so fund first; the no-MLA acknowledgement applies only when the borrower
    // declined an MLA for this market.
    faucet(account0, edgeDeposit * 2n, edgeToken)
    await ensureTouSigned(page, account0, edgeMarket)
    if (await mlaFree(edgeMarket)) {
      await ensureNoMlaAcknowledged(page, account0, edgeMarket)
    }

    // Self-clean, in the order the conventions demand: expire pending batches first (selfClean
    // advances time), then repay & drain the unpaid FIFO, then claim what is left.
    for (const account of [account0, account1])
      await selfCleanWithdrawals(account, edgeMarket)
    await settleUnpaidBatches(account0, edgeMarket, edgeToken, edgeDecimals)
    for (const account of [account0, account1])
      await selfCleanWithdrawals(account, edgeMarket)
    await syncSubgraph()
    expect(
      await unpaidBatchExpiries(edgeMarket),
      "edge market starts with a drained unpaid queue",
    ).toEqual([])
  })

  test("EDG-12: a hard refresh between request and claim recovers the full position", async ({
    page,
  }) => {
    requireEdgeMarket()
    test.setTimeout(480_000)
    await connectAs(page, 0)
    // EDG-10 leaves a pending request; make this test self-sufficient anyway.
    await ensureEdgePosition(account0, edgeDeposit)
    await openMarketPage(page, edgeMarket)
    await ensureConnected(page, account0)

    let pending = await subgraph.openWithdrawalExpiries(edgeMarket, account0)
    if (pending.length === 0) {
      const balance = await chain.marketBalance(edgeMarket, account0)
      expect(balance, "a position to request against").toBeGreaterThan(0n)
      await chain.queueWithdrawal(account0, edgeMarket, balance / 4n)
      await syncSubgraph()
      pending = await subgraph.openWithdrawalExpiries(edgeMarket, account0)
    }
    expect(
      pending.length,
      "a pending withdrawal request exists",
    ).toBeGreaterThan(0)
    const expiry = pending[pending.length - 1]

    /**
     * Read the post-reload state once the position block has SETTLED.
     *
     * `lender-available-withdraw` first renders the SUBGRAPH's scaled balance and only becomes
     * the normalized, live figure once `refreshLenderMarketAccounts` hydrates it from the lens
     * (see `lib/page.waitAvailableToWithdraw`). Snapshotting it right after a reload therefore
     * makes the whole before/after comparison a race: the two reads can land on opposite sides
     * of that hydration and the position appears to SHRINK across the refresh — observed here as
     * 3750.7505 → 3749.9662 DAI, which is the indexed-vs-live scale factor, not a lost position.
     * Settling both reads on the live on-chain balance keeps the recovery assertion below honest
     * (a genuinely wrong number still fails, just after the hydration window) and makes it
     * strictly stronger: the refreshed page must show the real position, not merely a big one.
     */
    const readSettledState = async () => {
      const onChain = await chain.marketBalance(edgeMarket, account0)
      await page.reload()
      await ensureConnected(page, account0)
      await openSection(page, /deposit & withdraw/i)
      const available = await waitAvailableToWithdraw(page, onChain)
      const status = await readWithdrawalsStatus(page)
      await openWithdrawalRequests(page)
      const ongoing = await readOngoingAmounts(page)
      return { available, status, ongoing }
    }

    const beforeReload = await step(
      page,
      "baseline: state once the request is on the page",
      readSettledState,
    )
    expect(
      beforeReload.ongoing.length,
      "the request is listed",
    ).toBeGreaterThan(0)

    const afterReload = await step(
      page,
      "hard refresh mid-flow",
      readSettledState,
    )

    attachAgreement("EDG-12 refresh recovery", {
      market: edgeMarket,
      expiry,
      before: {
        available: beforeReload.available.raw,
        claimable: beforeReload.status.claimableRaw,
        ongoing: beforeReload.ongoing,
      },
      after: {
        available: afterReload.available.raw,
        claimable: afterReload.status.claimableRaw,
        ongoing: afterReload.ongoing,
      },
    })
    // The position rebases every block, so the balance may only grow; the pending request set
    // and the claimable amount must survive the refresh exactly.
    expect(
      afterReload.available.raw >= beforeReload.available.raw,
      "position recovered after the refresh (rebase may only add)",
    ).toBe(true)
    expect(afterReload.ongoing, "pending requests recovered").toEqual(
      beforeReload.ongoing,
    )
    expect(afterReload.status.claimableRaw, "claimable state recovered").toBe(
      beforeReload.status.claimableRaw,
    )

    await step(page, "expire, refresh again, then claim", async () => {
      const now = await chain.blockTimestamp()
      if (now <= expiry) await advanceTime(expiry - now + 2)
      await chain.updateState(account0, edgeMarket)
      await syncSubgraph()
      const claimable = await chain.getAvailableWithdrawalAmount(
        edgeMarket,
        account0,
        expiry,
      )
      expect(claimable, "the expired batch paid out").toBeGreaterThan(0n)

      // The page's mocked clock was aligned to chain time BEFORE the jump; the app classifies
      // batch expiry with Date.now(), so without a re-sync the reloaded page still thinks the
      // batch is pending and renders claimable as 0 forever.
      await page.clock.setSystemTime((await chain.blockTimestamp()) * 1000)
      await page.reload()
      await ensureConnected(page, account0)
      await openSection(page, /deposit & withdraw/i)
      await expect
        .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
          timeout: 90_000,
          message: "claimable state survives the hard refresh",
        })
        .toBe(claimable)

      const tokenBefore = await chain.erc20Balance(edgeToken, account0)
      await page
        .getByRole("button", { name: /claim assets/i })
        .first()
        .click()
      await expect
        .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
          timeout: 120_000,
        })
        .toBe(0n)
      expect(
        (await chain.erc20Balance(edgeToken, account0)) - tokenBefore,
        "claim paid the recovered amount",
      ).toBe(claimable)
    })
    await syncSubgraph()
  })

  test("EDG-13: RPC and subgraph failures degrade gracefully, with a retry path", async ({
    page,
  }) => {
    requireEdgeMarket() // the underpriced-send step drives the edge market's deposit modal
    test.setTimeout(420_000)
    await connectAs(page, 0)
    // page.unroute() identifies a route by its matcher VALUE, so the matchers must be the same
    // function objects that were registered — never re-created inline at unroute time.
    const isSubgraph = (url: URL) => url.href.startsWith(FORK_GQL)
    const isRpc = (url: URL) => url.href.startsWith(FORK_RPC)

    await step(
      page,
      "subgraph unreachable: empty state, not a white screen",
      async () => {
        await page.route(isSubgraph, (route) => route.abort("failed"))
        await gotoAligned(page, "/lender/all-markets")
        // The shell must still render: the lender nav, or the table's own empty state.
        const shell = page
          .getByTestId("lender-nav-sidebar")
          .or(page.getByText("No Markets Available").first())
        await expect(shell.first()).toBeVisible({ timeout: 90_000 })
        const body = await expectNoWhiteScreen(
          page,
          "all-markets (subgraph down)",
        )
        attachAgreement("EDG-13 subgraph down", {
          endpoint: FORK_GQL,
          showsEmptyState: /No Markets Available|Are Loading/i.test(body),
          bodyLength: body.length,
        })
        await page.unroute(isSubgraph)
      },
    )

    await step(
      page,
      "recovery: the catalogue comes back after a reload",
      async () => {
        await page.reload()
        await ensureConnected(page, account0)
        await expect(rowsIn(page, "self-onboard").first()).toBeVisible({
          timeout: 120_000,
        })
      },
    )

    await step(
      page,
      "RPC unreachable: the market page still renders",
      async () => {
        await page.route(isRpc, (route) => route.abort("failed"))
        await openMarketPage(page, openTerm)
        // With no chain data the page is mostly skeletons, so the signal here is purely
        // "no error boundary, no blank document" — hence the relaxed length floor.
        const body = await expectNoWhiteScreen(
          page,
          "market page (RPC down)",
          0,
        )
        expect(
          await page.locator("body *").count(),
          "the app shell still rendered without a chain",
        ).toBeGreaterThan(10)
        attachAgreement("EDG-13 RPC down", {
          endpoint: FORK_RPC,
          bodyLength: body.length,
        })
        await page.unroute(isRpc)
      },
    )

    await step(
      page,
      "underpriced transaction: graceful error, retry offered, nothing sent",
      async () => {
        // Fail ONLY the send methods; reads/estimates keep working so the flow reaches the send.
        await page.route(isRpc, async (route) => {
          const post = route.request().postData() ?? ""
          if (!/eth_sendTransaction|eth_sendRawTransaction/.test(post)) {
            await route.continue()
            return
          }
          let payload: unknown
          try {
            payload = JSON.parse(post)
          } catch {
            payload = { id: 1 }
          }
          const error = { code: -32000, message: "transaction underpriced" }
          const body = Array.isArray(payload)
            ? payload.map((entry) => ({
                jsonrpc: "2.0",
                id: (entry as { id?: number }).id ?? 1,
                error,
              }))
            : {
                jsonrpc: "2.0",
                id: (payload as { id?: number }).id ?? 1,
                error,
              }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(body),
          })
        })

        const marketRow = await subgraph.market(edgeMarket)
        const minimum = BigInt(marketRow!.hooksConfig?.minimumDeposit ?? "0")
        let amount = minimum + parseUnits("1", edgeDecimals)
        if (amount < parseUnits("10", edgeDecimals))
          amount = parseUnits("10", edgeDecimals)
        // Pre-stage funds AND allowance on chain so the modal's own action is the deposit send
        // (an approve failure surfaces as a toast, not as the deposit ErrorModal).
        faucet(account0, amount * 2n, edgeToken)
        await chain.approve(account0, edgeToken, edgeMarket, amount * 2n)
        // Market tokens rebase every block, so the "nothing landed" oracle is the SCALED balance.
        const scaledBefore = await marketScaledBalance(edgeMarket, account0)

        await openMarketPage(page, edgeMarket)
        await ensureConnected(page, account0)
        const dialog = await openDepositDialog(page)
        await dialog
          .getByRole("textbox")
          .first()
          .fill(formatUnits(amount, edgeDecimals))
        const submit = dialog.getByRole("button", { name: /^deposit$/i })
        await expect(submit).toBeEnabled({ timeout: 90_000 })
        await submit.click()

        // Graceful surface: the FinalModals ErrorModal ("Oops! Something went wrong!" + Try Again)
        // or, if the app routed it to a toast instead, a visible error toast. Either is acceptable;
        // a success modal or a white screen is not.
        const errorModal = page.getByText("Oops! Something went wrong!").first()
        const retry = page.getByRole("button", { name: "Try Again" })
        const sawModal = await errorModal
          .waitFor({ state: "visible", timeout: 120_000 })
          .then(() => true)
          .catch(() => false)
        const sawRetry = sawModal
          ? await retry.isVisible().catch(() => false)
          : false
        // Bounded: `innerText()` inherits the config's (absent) action timeout, so an absent
        // toast would otherwise block until the TEST timeout instead of reporting "no surface".
        const toastText = sawModal
          ? null
          : await page
              .locator('div[role="status"]')
              .first()
              .innerText({ timeout: 15_000 })
              .catch(() => null)

        attachAgreement("EDG-13 underpriced send", {
          market: edgeMarket,
          surfacedErrorModal: sawModal,
          retryOffered: sawRetry,
          toastText,
        })
        expect(
          sawModal || !!toastText,
          "a failed send surfaces an error (modal or toast), never silence",
        ).toBe(true)
        // A toast without an error message is not an error surface — pin the content.
        if (!sawModal)
          expect(toastText ?? "", "toast carries an actual error").toMatch(
            /error|fail|underpriced|reject/i,
          )
        await expect(page.getByText("Transaction Successful!")).toBeHidden()
        await expectNoWhiteScreen(page, "deposit modal after a failed send")
        expect(
          await marketScaledBalance(edgeMarket, account0),
          "nothing was minted by the failed send",
        ).toBe(scaledBefore)

        // RECOVERY (the other half of the runsheet row): remove the injected failure and use
        // the app's own retry path — the ErrorModal's Try Again resubmits; the toast route has
        // no in-place retry (KNOWN-ISSUES #13), so there the deposit is re-driven through the
        // dialog. Success oracle: the scaled balance actually increases.
        await page.unroute(isRpc)
        if (sawModal) {
          expect(sawRetry, "the ErrorModal offers Try Again").toBe(true)
          await retry.click()
        } else {
          await page.keyboard.press("Escape")
          const dialog2 = await openDepositDialog(page)
          await dialog2
            .getByRole("textbox")
            .first()
            .fill(formatUnits(amount, edgeDecimals))
          const submit2 = dialog2.getByRole("button", { name: /^deposit$/i })
          await expect(submit2).toBeEnabled({ timeout: 90_000 })
          await submit2.click()
        }
        await expect
          .poll(() => marketScaledBalance(edgeMarket, account0), {
            timeout: 120_000,
            message: "retry after RPC recovery lands the deposit",
          })
          .toBeGreaterThan(scaledBefore)
        await page.keyboard.press("Escape")
      },
    )
  })
})

// Mobile needs its own describe: `test.use` applies per describe block.
test.describe("edge & regression: mobile (UAT 10)", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  })

  test("EDG-11: the core lender loop is usable on a mobile viewport", async ({
    page,
  }) => {
    test.setTimeout(300_000)
    const account = account0
    // Wallet connection on mobile: the Local Anvil connector auto-reconnects from the seeded
    // cookie, and the mobile header renders the trimmed address as plain text (Header/MobileMenu),
    // not as a button — so ensureConnected's role query does not apply here.
    await connectAs(page, 0)
    const shortAddress = new RegExp(
      `${account.slice(0, 6)}.*${account.slice(-4)}`,
      "i",
    )

    await step(
      page,
      "explore renders and the wallet is connected",
      async () => {
        await gotoAligned(page, "/lender")
        await expect(page.getByText(shortAddress).first()).toBeVisible({
          timeout: 90_000,
        })
        await expect(page.getByText("Top Markets").first()).toBeVisible({
          timeout: 90_000,
        })
        const overflow = await horizontalOverflowPx(page)
        attachAgreement("EDG-11 explore (mobile)", {
          viewport: MOBILE_VIEWPORT,
          horizontalOverflowPx: overflow,
        })
        expect(
          overflow,
          "explore fits the mobile viewport",
        ).toBeLessThanOrEqual(2)
        await expectNoWhiteScreen(page, "mobile /lender")
      },
    )

    await step(page, "market detail renders the lender actions", async () => {
      const marketId = pinnedMarkets.openTerm.toLowerCase()
      await gotoAligned(page, `/lender/market/${marketId}`)
      await expect(page.getByText(shortAddress).first()).toBeVisible({
        timeout: 90_000,
      })
      // MobileMarketActions reuses the same copy as the desktop TransactionBlocks.
      await expect(
        page
          .getByText(/Available For Withdraw Requests|Available To Deposit/)
          .first(),
      ).toBeVisible({ timeout: 120_000 })
      const overflow = await horizontalOverflowPx(page)
      const body = await expectNoWhiteScreen(page, "mobile market page")
      const marketName = (await subgraph.market(marketId))?.name ?? ""
      attachAgreement("EDG-11 market detail (mobile)", {
        market: marketId,
        horizontalOverflowPx: overflow,
        hasDepositAction:
          (await page.getByRole("button", { name: /^deposit$/i }).count()) > 0,
      })
      expect(
        overflow,
        "market detail fits the mobile viewport",
      ).toBeLessThanOrEqual(2)
      expect(
        formatterLeaks(body, [marketName]),
        "no formatter leaks on the mobile market page",
      ).toEqual([])
    })
  })
})
