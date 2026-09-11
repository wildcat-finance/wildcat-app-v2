/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits } from "viem"

import {
  CHAIN_ID,
  account0,
  account1,
  absDiff,
  ensureNoMlaAcknowledged,
  ensureTouSigned,
  marketMaxTotalSupply,
  marketScaledBalance,
  marketTotalSupply,
  openDepositDialog,
  openSection,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  unpaidBatchExpiries,
} from "./lib"
import {
  hasOpenAccessProvider,
  hooksInstance,
  registeredWrapper,
} from "../borrowerflows/helpers"
import { borrowerMarkets, type BorrowerMarketRow } from "../borrowerflows/lib"
import * as chain from "../lib/chain"
import {
  APP_URL,
  advanceTime,
  faucet,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import {
  connectAs,
  dismissTxModal,
  ensureConnected,
  gotoMarket,
  openWithdrawalRequests,
  readAvailableToWithdraw,
  readOngoingAmounts,
  readWithdrawalsStatus,
} from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test, type Page } from "../lib/test"

/**
 * UAT 7 "Wallet Matrix" — the LOCAL wallet-state transitions.
 *
 * Runsheet row -> disposition
 * ---------------------------------------------------------------------------
 * WAL-01 Safe connect       -> test.fixme (wallet-integration lane; see below).
 * WAL-02 Safe lender run    -> test.fixme (same; MKT-18 documents the same gap on page 3).
 * WAL-03 Safe borrower run  -> test.fixme (same).
 * WAL-04 Rabby lender run   -> test.fixme (needs the real extension; see below).
 * WAL-05 disconnect/reconnect -> WAL-05 (here).
 * WAL-06 account switch       -> WAL-06 (here).
 * WAL-07 rejected transaction -> WAL-07 (here).
 *
 * The coverage document (e2e/COVERAGE-SUGGESTIONS-2026-09-08.md §6) splits page 7 by what each
 * half can PROVE and asks for the first half only in routine automation:
 *
 *   "App state transitions, initially using controllable local wallet behavior: switch accounts on
 *    an already-loaded market page and verify balances/permissions refresh; disconnect between
 *    request and claim and recover after reconnect; reject a deposit/borrow/claim transaction and
 *    verify actionable recovery with no phantom success/pending state. Seeding a different account
 *    before navigation is not an account-switch test. Injected RPC underpricing is not a
 *    user-rejected wallet signature."
 *
 * The second half — Safe (EIP-1271 / multisig) and Rabby — stays a MANUAL release lane. An Anvil
 * EOA cannot establish contract-wallet or extension compatibility; the four fixmes at the bottom
 * of this file carry that reason next to the runsheet rows so a green board never reads as Safe
 * or Rabby coverage.
 *
 * How the transitions are driven (the mechanics matter — see the block comment on
 * src/lib/connectors/localAnvilConnector.ts):
 *   - ACCOUNT SWITCH: the connector accepts ONE test-only window event,
 *     `wildcat:anvil-wallet` with `{ type: "switchAccount", index }`, and answers it by becoming
 *     that account and emitting wagmi's `change` event — the same emitter path
 *     `onAccountsChanged` takes for a real wallet's EIP-1193 `accountsChanged`. It is the ONLY
 *     addition this work made to src/, it lives in a file that is only registered when
 *     NEXT_PUBLIC_TEST_MODE=1, and it is inert until a command is dispatched. Before it, the
 *     harness could only pick an account BEFORE page load (`connectAs`, via localStorage +
 *     the wagmi cookie), which the coverage document explicitly rules out as an account-switch
 *     test; nothing in the app or the connector could change the selected account on a live page.
 *   - DISCONNECT / RECONNECT: no test affordance at all — the app's own wallet menu. The header
 *     address chip opens ProfileDialog, whose "Disconnect" calls wagmi's `useDisconnect`
 *     (src/components/Header/HeaderButton/ProfileDialog/index.tsx:55-58); reconnecting goes back
 *     through ConnectWalletDialog's "Local Anvil" button (`ensureConnected`).
 *   - REJECTION: the same window event with `{ type: "rejectNext", count }` makes the connector's
 *     provider throw an EIP-1193 `4001 userRejectedRequest` for the next `count` signature/send
 *     requests — the error viem maps to `UserRejectedRequestError`. This is the WALLET layer: the
 *     request never reaches anvil, which WAL-07 proves with an RPC counter. EDG-13's injected
 *     "transaction underpriced" is the RPC layer and a different row.
 *
 * Fixture: an E2E-created (page-3 / MKT-04), open-term, OPEN-ACCESS, MLA-free market owned by
 * borrower #3 — discovered exactly the way EDG's fixture and LEN-16 discover theirs. UI deposit
 * flows must never run on a PINNED market (no Borrower row in the sanitized app DB → the
 * acknowledgement modal can never be completed; see e2e/CONVENTIONS.md).
 * Accounts: #0 and #1 only. #5 stays pristine (page-2 BON-01).
 * Time: wall-clock signature ceremonies first, then ONE bounded jump (≤ one withdrawal cycle) in
 * setup to make account #0's claimable state non-trivial. No test moves time.
 */
test.describe.serial("wallet transitions (WAL-05…07)", () => {
  /** The connector's test-only control event — see localAnvilConnector.ts. */
  const WALLET_EVENT = "wildcat:anvil-wallet"

  let fixture: BorrowerMarketRow | undefined
  let market: Address
  let token: Address
  let decimals = 18
  let cycle = 3600
  /** Per-account arrangement, in underlying units. */
  let base = 0n
  let unit = 0n
  /** Seconds of chain time this suite's setup consumed (reported for the board's time budget). */
  let jumpSeconds = 0
  let setupClaimable = 0n

  const requireMarket = () =>
    test.skip(
      !fixture,
      "no open-term, open-access, MLA-free market owned by borrower #3 on the fork subgraph — " +
        "run the page-3 market-creation suite (--project=fixtures) first",
    )

  // ---------- non-throwing page oracles (safe inside expect.poll) ----------
  // Two traps a polled oracle must avoid, both hit while authoring this suite:
  //  - readAvailableToWithdraw / readWithdrawalsStatus assert visibility and THROW when the
  //    section is mid-remount, which ends a poll instead of retrying it;
  //  - `locator.getAttribute()` on an element that is ABSENT waits for it, and this config sets
  //    no actionTimeout (default 0 = no limit), so "the panel disappeared" would hang forever
  //    rather than report null.
  // So read the DOM directly: a plain querySelector answers immediately either way.
  const attrRaw = async (page: Page, testId: string, attribute: string) => {
    const value = await page
      .evaluate(
        ({ id, attr }) =>
          document.querySelector(`[data-testid="${id}"]`)?.getAttribute(attr) ??
          null,
        { id: testId, attr: attribute },
      )
      .catch(() => null)
    return value === null ? null : BigInt(value)
  }
  const availableRaw = (page: Page) =>
    attrRaw(page, "lender-available-withdraw", "data-value")
  const claimableRaw = (page: Page) =>
    attrRaw(page, "lender-withdrawals-status", "data-claimable")
  const ongoingRowCount = (page: Page) =>
    page
      .evaluate(
        () =>
          document.querySelectorAll(
            '[data-testid="withdrawals-ongoing"] .MuiDataGrid-cell[data-field="amount"]',
          ).length,
      )
      .catch(() => -1)
  /** Is the lender's own Deposit action offered? (Gone while disconnected.) */
  const depositActionOffered = (page: Page) =>
    page
      .evaluate(() =>
        [...document.querySelectorAll("button")].some((b) =>
          /^deposit$/i.test((b.textContent ?? "").trim()),
        ),
      )
      .catch(() => false)

  /** The header chip renders trimAddress(): "0xf39F...2266". */
  const shortAddress = (account: Address) =>
    new RegExp(`${account.slice(0, 6)}.*${account.slice(-4)}`, "i")

  /** Dispatch one command to the Local Anvil connector's test control surface. */
  const walletCommand = (
    page: Page,
    command:
      | { type: "switchAccount"; index: number }
      | { type: "rejectNext"; count: number },
  ) =>
    page.evaluate(
      ({ event, detail }) => {
        window.dispatchEvent(new CustomEvent(event, { detail }))
      },
      { event: WALLET_EVENT, detail: command },
    )

  /** Mark the live document so a reload between two reads is detectable. */
  const markPage = (page: Page, token_: string) =>
    page.evaluate((value) => {
      ;(window as unknown as { __walMark?: string }).__walMark = value
    }, token_)
  const readPageMark = (page: Page) =>
    page.evaluate(
      () => (window as unknown as { __walMark?: string }).__walMark ?? null,
    )

  /** The page must never render a Next.js error boundary / blank body. */
  const expectNoWhiteScreen = async (page: Page, label: string) => {
    const body = (await page.locator("body").innerText()).trim()
    expect(body.length, `${label}: page body is not blank`).toBeGreaterThan(80)
    expect(body, `${label}: no error boundary`).not.toMatch(
      /Application error|client-side exception|Internal Server Error/i,
    )
    return body
  }

  /** Top an account's market position up to `target` (respecting minimum + remaining capacity). */
  const ensurePosition = async (account: Address, target: bigint) => {
    const balance = await chain.marketBalance(market, account)
    if (balance >= target) return balance
    const room =
      (await marketMaxTotalSupply(market)) - (await marketTotalSupply(market))
    let amount = target - balance
    if (amount < base) amount = base
    if (amount > room) amount = room
    expect(
      amount >= base,
      "market has room for a minimum-clearing deposit",
    ).toBe(true)
    faucet(account, amount * 2n, token)
    await chain.approve(account, token, market, amount * 2n)
    await chain.depositUpTo(account, market, amount)
    await syncSubgraph()
    return chain.marketBalance(market, account)
  }

  test("setup: open-access fixture, agreements, positions and a claimable batch", async ({
    page,
    browser,
  }) => {
    test.setTimeout(900_000)
    // The app classifies time-gated state with Date.now(); never let the chain lag the wall clock.
    await syncChainTimeToWallClock()
    for (const account of [account0, account1]) faucet(account, parseUnits("1", 18))

    // GET /api/mla/<market> answers {"noMLA":true} for a declined-MLA market and the full
    // document otherwise (both status 200) — branch on the body, not the status.
    const mlaFree = async (id: string) => {
      const res = await fetch(`${APP_URL}/api/mla/${id}?chainId=${CHAIN_ID}`)
      const body = (await res.json().catch(() => null)) as {
        noMLA?: boolean
      } | null
      return body?.noMLA === true
    }

    // A market with a registered ERC-4626 wrapper renders a different withdraw flow (routing /
    // unwrap steps) and folds the wrapped position into "Available For Withdraw Requests", so the
    // page value would stop being the account's market balance. Prefer an unwrapped market; a
    // wrapped one is only a fallback (and is journaled).
    const hasWrapper = async (id: string) => {
      const wrapper = await registeredWrapper(id as Address).catch(() => null)
      return !!wrapper && !/^0x0{40}$/i.test(wrapper)
    }

    const owned = await borrowerMarkets()
    const candidates = owned.filter(
      (m) =>
        !m.isClosed &&
        m.marketKind !== "REVOLVING" &&
        (m.hooksConfig?.fixedTermEndTime ?? 0) === 0 &&
        (m.hooksConfig?.periodDuration ?? 0) === 0,
    )
    // Newest-first, same as EDG's fixture scan: the BOP suite claims its "primary" market
    // oldest-first, so this does not collide with it.
    let wrapped: BorrowerMarketRow | undefined
    for (const candidate of [...candidates].reverse()) {
      const instance = candidate.hooks
        ? await hooksInstance(candidate.hooks.id)
        : null
      const openAccess =
        candidate.hooksConfig?.depositRequiresAccess === false ||
        (instance !== null && hasOpenAccessProvider(instance))
      if (!openAccess) continue
      if (!(await mlaFree(candidate.id))) continue
      if (await hasWrapper(candidate.id)) {
        wrapped = wrapped ?? candidate
        continue
      }
      fixture = candidate
      break
    }
    fixture = fixture ?? wrapped

    attachAgreement("WAL fixtures", {
      borrower3Markets: owned.length,
      openTermCandidates: candidates.map((m) => m.id),
      market: fixture?.id ?? null,
      marketName: fixture?.name ?? null,
      usedWrappedFallback: !!fixture && fixture === wrapped,
    })
    if (!fixture) return

    market = fixture.id.toLowerCase() as Address
    token = fixture.asset.address as Address
    decimals = fixture.asset.decimals
    cycle = Number(fixture.withdrawalBatchDuration)
    unit = parseUnits("1", decimals)
    // Scaling rounds the credited amount down a hair, so an exactly-minimum tender is a coin
    // flip on the hook (CONVENTIONS "Amounts"): minimum + 1 unit, floored at 100 units.
    base = BigInt(fixture.hooksConfig?.minimumDeposit ?? "0") + unit
    if (base < parseUnits("100", decimals)) base = parseUnits("100", decimals)

    // ---------- wall-clock ceremonies FIRST (signature APIs bind timeSigned to the server clock) ----------
    // The market page offers Deposit only to a lender that already holds the token (a zero
    // balance renders the Faucet button instead), so fund before the acknowledgement ceremony.
    faucet(account0, base * 6n, token)
    faucet(account1, base * 6n, token)
    await connectAs(page, 0)
    await ensureTouSigned(page, account0, market)
    // Only account #0 deposits through the UI (WAL-07), so only it needs the no-MLA
    // acknowledgement; account #1's position is staged on chain.
    await ensureNoMlaAcknowledged(page, account0, market)
    // `connectAs` seeds the account BEFORE load and cannot be undone on a live page: account #1's
    // agreement runs in its own context. Without a current ToU acceptance every /lender page
    // redirects that account to the agreement gate, which would make WAL-06's switch a
    // navigation test rather than a refresh test.
    const secondContext = await browser.newContext({ baseURL: APP_URL })
    try {
      const secondPage = await secondContext.newPage()
      await connectAs(secondPage, 1)
      await ensureTouSigned(secondPage, account1, market)
    } finally {
      await secondContext.close()
    }

    // ---------- hygiene: expire pending batches, drain the unpaid FIFO, claim leftovers ----------
    for (const account of [account0, account1])
      await selfCleanWithdrawals(account, market)
    await settleUnpaidBatches(account0, market, token, decimals)
    for (const account of [account0, account1])
      await selfCleanWithdrawals(account, market)
    await syncSubgraph()
    expect(
      await unpaidBatchExpiries(market),
      "market starts with a drained unpaid queue",
    ).toEqual([])

    // ---------- positions: deliberately DIFFERENT, so a refreshed page cannot look unchanged ----------
    await ensurePosition(account1, base)
    await ensurePosition(account0, base * 2n)

    // ---------- account #0 gets a CLAIMABLE batch (the state WAL-05 must recover) ----------
    const claimTarget = base / 2n
    await chain.queueWithdrawal(account0, market, claimTarget)
    // queueWithdrawal returns the SIMULATED expiry and the mined batch can be a second later;
    // a batch getter called with the wrong expiry REVERTS (CONVENTIONS "Transactions"). Read the
    // batch back from the subgraph — hygiene above left account #0 with no other open batch.
    await syncSubgraph()
    const openBatches = await subgraph.openWithdrawalExpiries(market, account0)
    expect(
      openBatches.length,
      "exactly one open batch for account #0 after queuing the claimable request",
    ).toBe(1)
    const expiry = openBatches[0]
    const beforeJump = await chain.blockTimestamp()
    if (beforeJump <= expiry) {
      // Bounded by ONE withdrawal cycle — the only time this suite moves the chain.
      jumpSeconds = expiry - beforeJump + 1
      await advanceTime(jumpSeconds)
    }
    await chain.updateState(account0, market)
    await settleUnpaidBatches(account0, market, token, decimals)
    await syncSubgraph()
    setupClaimable = await chain.getAvailableWithdrawalAmount(
      market,
      account0,
      expiry,
    )

    attachAgreement("WAL setup", {
      market,
      marketName: fixture.name,
      asset: token,
      decimals,
      cycle,
      base,
      position0: await chain.marketBalance(market, account0),
      position1: await chain.marketBalance(market, account1),
      claimableExpiry: expiry,
      claimable0: setupClaimable,
      chainSecondsSpent: jumpSeconds,
    })
    expect(
      setupClaimable > 0n,
      "account #0 has a non-trivial claimable amount for the reconnect oracle",
    ).toBe(true)
  })

  test("WAL-05: disconnecting mid-flow returns a clean disconnected state; reconnecting recovers the pending request and the claimable position", async ({
    page,
  }) => {
    requireMarket()
    test.setTimeout(600_000)
    await connectAs(page, 0)
    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    await openSection(
      page,
      /deposit & withdraw/i,
      page.getByTestId("lender-available-withdraw"),
    )

    // ---------- mid-flow: queue a withdrawal request through the lender UI ----------
    const balanceBefore = await chain.marketBalance(market, account0)
    const withdrawWhole = base / 4n / unit
    expect(withdrawWhole > 0n, "a whole-token withdrawal fits the position").toBe(
      true,
    )
    const withdrawText = withdrawWhole.toString()
    await step(page, "queue a withdrawal request through the UI", async () => {
      await page
        .getByRole("button", { name: /^withdraw$/i })
        .first()
        .click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      await dialog.getByRole("textbox").first().fill(withdrawText)
      const confirm = dialog.getByRole("button", {
        name: new RegExp(`^withdraw ${withdrawText}`, "i"),
      })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      // The refetch can unmount the modal around the success view; the durable signal is the
      // on-chain burn of the queued amount.
      await expect
        .poll(
          async () =>
            balanceBefore - (await chain.marketBalance(market, account0)),
          { timeout: 120_000 },
        )
        .toBeGreaterThan(0n)
      // The burn above is visible on chain BEFORE the modal leaves its loading body, so the
      // dismiss has to wait the success view out rather than sample visibility once — an open
      // dialog aria-hides the page behind it and the next `openSection` would find no sidebar.
      await dismissTxModal(page)
    })
    await syncSubgraph()
    const pendingExpiries = await subgraph.openWithdrawalExpiries(
      market,
      account0,
    )
    expect(
      pendingExpiries.length,
      "the UI request is indexed as an open withdrawal",
    ).toBeGreaterThan(0)

    // ---------- baseline: what a connected account #0 sees ----------
    const marketUrl = page.url()
    await markPage(page, "WAL-05")
    const before = await step(
      page,
      "baseline: pending request + claimable, connected",
      async () => {
        await openSection(
          page,
          /deposit & withdraw/i,
          page.getByTestId("lender-available-withdraw"),
        )
        const available = await readAvailableToWithdraw(page)
        const status = await readWithdrawalsStatus(page)
        await openWithdrawalRequests(page)
        const ongoing = await readOngoingAmounts(page)
        // Come back to the section that renders the lender panels, so their disappearance on
        // disconnect is an actual observation rather than an artefact of the open section.
        await openSection(
          page,
          /deposit & withdraw/i,
          page.getByTestId("lender-available-withdraw"),
        )
        return { available, status, ongoing }
      },
    )
    expect(before.ongoing.length, "the request is listed").toBeGreaterThan(0)
    expect(
      before.status.claimableRaw > 0n,
      "a claimable amount is rendered before the disconnect",
    ).toBe(true)
    expect(
      before.status.text,
      "the claimable state is spelled out for the lender",
    ).toMatch(/ready to claim/i)

    // ---------- DISCONNECT through the app's own wallet menu (wagmi useDisconnect) ----------
    await step(page, "disconnect from the wallet menu", async () => {
      await page
        .getByRole("button", { name: shortAddress(account0) })
        .first()
        .click()
      const disconnect = page.getByRole("button", { name: /^disconnect$/i })
      await expect(disconnect).toBeVisible({ timeout: 30_000 })
      await disconnect.click()
    })

    const disconnectedBody = await step(
      page,
      "the app returns to its disconnected state on the same page",
      async () => {
        await expect(
          page.getByRole("button", { name: /connect wallet/i }).first(),
        ).toBeVisible({ timeout: 60_000 })
        // The lender-only panels unmount: no position, no claimable, no deposit action.
        await expect
          .poll(() => availableRaw(page), { timeout: 60_000 })
          .toBeNull()
        expect(
          await claimableRaw(page),
          "no claimable is rendered while disconnected",
        ).toBeNull()
        expect(
          await depositActionOffered(page),
          "no lender action is offered while disconnected",
        ).toBe(false)
        expect(page.url(), "the disconnect did not navigate away").toBe(
          marketUrl,
        )
        return expectNoWhiteScreen(page, "disconnected market page")
      },
    )
    expect(
      await readPageMark(page),
      "the disconnect did not reload the page",
    ).toBe("WAL-05")

    // ---------- RECONNECT as the same account, same page session ----------
    const after = await step(
      page,
      "reconnect the same account and recover the position",
      async () => {
        await ensureConnected(page, account0)
        await openSection(
          page,
          /deposit & withdraw/i,
          page.getByTestId("lender-available-withdraw"),
        )
        await expect
          .poll(() => availableRaw(page), { timeout: 120_000 })
          .not.toBeNull()
        const available = await readAvailableToWithdraw(page)
        const status = await readWithdrawalsStatus(page)
        await openWithdrawalRequests(page)
        const ongoing = await readOngoingAmounts(page)
        // "no duplicate prompts" (the runsheet's own words): reconnecting must not re-open the
        // ToU / agreement / acknowledgement ceremonies for an account that already signed.
        const dialogs = await page.getByRole("dialog").allInnerTexts()
        return { available, status, ongoing, dialogs }
      },
    )

    attachAgreement("WAL-05 disconnect/reconnect recovery", {
      market,
      url: marketUrl,
      pendingExpiries,
      before: {
        available: before.available.raw,
        claimable: before.status.claimableRaw,
        statusText: before.status.text,
        ongoing: before.ongoing,
      },
      disconnected: {
        connectCta: /connect wallet/i.test(disconnectedBody),
        bodyLength: disconnectedBody.length,
      },
      after: {
        available: after.available.raw,
        claimable: after.status.claimableRaw,
        statusText: after.status.text,
        ongoing: after.ongoing,
        dialogsAfterReconnect: after.dialogs,
      },
    })

    expect(
      await readPageMark(page),
      "the whole disconnect/reconnect cycle ran on ONE page session (no reload)",
    ).toBe("WAL-05")
    // The position rebases every block, so it may only grow; the request set and the claimable
    // state must come back intact.
    expect(
      after.available.raw >= before.available.raw,
      `position recovered after reconnect (before ${before.available.raw}, after ${after.available.raw})`,
    ).toBe(true)
    expect(after.ongoing, "the pending request recovered").toEqual(
      before.ongoing,
    )
    expect(
      after.status.claimableRaw >= before.status.claimableRaw,
      `claimable recovered (before ${before.status.claimableRaw}, after ${after.status.claimableRaw})`,
    ).toBe(true)
    expect(
      after.status.text,
      "the claimable state is spelled out again after reconnect",
    ).toMatch(/ready to claim/i)
    expect(
      after.dialogs.filter((text) =>
        /terms of use|service agreement|acknowledge|master loan/i.test(text),
      ),
      "reconnecting raised no duplicate agreement prompt",
    ).toEqual([])
  })

  test("WAL-06: switching the wallet account on an open market page refreshes balances, claimable and requests without a reload", async ({
    page,
  }) => {
    requireMarket()
    test.setTimeout(600_000)
    await connectAs(page, 0)
    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    await openSection(
      page,
      /deposit & withdraw/i,
      page.getByTestId("lender-available-withdraw"),
    )

    const position0 = await chain.marketBalance(market, account0)
    const position1 = await chain.marketBalance(market, account1)
    expect(
      absDiff(position0, position1) > unit,
      `the two accounts hold materially different positions (#0 ${position0}, #1 ${position1})`,
    ).toBe(true)

    const marketUrl = page.url()
    await markPage(page, "WAL-06")

    const before = await step(
      page,
      "baseline: the page is rendered for account #0",
      async () => {
        await expect
          .poll(() => availableRaw(page), { timeout: 120_000 })
          .toBe(position0)
        const available = await readAvailableToWithdraw(page)
        const status = await readWithdrawalsStatus(page)
        await openWithdrawalRequests(page)
        await expect
          .poll(() => ongoingRowCount(page), { timeout: 60_000 })
          .toBeGreaterThan(0)
        const ongoing = await ongoingRowCount(page)
        return { available, status, ongoing }
      },
    )
    expect(
      before.status.claimableRaw > 0n,
      "account #0 starts with a claimable amount (the discriminator for the switch)",
    ).toBe(true)
    expect(
      before.ongoing,
      "account #0 starts with at least one listed request",
    ).toBeGreaterThan(0)

    // ---------- the switch: the connector becomes #1 and emits wagmi's `change` ----------
    await step(page, "switch the wallet to account #1", async () => {
      await walletCommand(page, { type: "switchAccount", index: 1 })
      await expect(
        page.getByRole("button", { name: shortAddress(account1) }).first(),
      ).toBeVisible({ timeout: 60_000 })
    })

    const after = await step(
      page,
      "the page re-renders for account #1 with no manual reload",
      async () => {
        await openSection(
          page,
          /deposit & withdraw/i,
          page.getByTestId("lender-available-withdraw"),
        )
        // Balances: the new account's position, read from the chain, must appear on its own.
        await expect
          .poll(() => availableRaw(page), { timeout: 120_000 })
          .toBe(position1)
        // Permissions/positions: the per-lender withdrawal state must follow the same switch —
        // polled, so a stale render is a retry rather than a pass.
        await expect
          .poll(() => claimableRaw(page), { timeout: 120_000 })
          .toBe(0n)
        const available = await readAvailableToWithdraw(page)
        const status = await readWithdrawalsStatus(page)
        await openWithdrawalRequests(page)
        await expect.poll(() => ongoingRowCount(page), { timeout: 60_000 }).toBe(0)
        const ongoing = await ongoingRowCount(page)
        return { available, status, ongoing }
      },
    )

    attachAgreement("WAL-06 account switch", {
      market,
      url: marketUrl,
      account0,
      account1,
      chainPositions: { account0: position0, account1: position1 },
      before: {
        available: before.available.raw,
        availableText: before.available.text,
        claimable: before.status.claimableRaw,
        statusText: before.status.text,
        ongoingRows: before.ongoing,
      },
      after: {
        available: after.available.raw,
        availableText: after.available.text,
        claimable: after.status.claimableRaw,
        statusText: after.status.text,
        ongoingRows: after.ongoing,
      },
    })

    expect(
      await readPageMark(page),
      "the switch was picked up on the SAME page session (no reload)",
    ).toBe("WAL-06")
    expect(page.url(), "the switch did not navigate away").toBe(marketUrl)
    expect(
      after.available.raw,
      "the position shown is account #1's, not the stale one",
    ).toBe(position1)
    expect(
      after.available.raw !== before.available.raw,
      "the rendered position actually changed",
    ).toBe(true)
    // Withdrawal state is per-lender: account #1 queued nothing, so both the claimable amount
    // and the request table must come back empty for it.
    expect(
      after.status.claimableRaw,
      "account #1 has no claimable amount",
    ).toBe(0n)
    expect(
      after.ongoing,
      "account #1 has no listed withdrawal requests",
    ).toBe(0)
  })

  test("WAL-07: a wallet-rejected deposit surfaces an actionable error, leaves no pending or phantom success, and the retry lands", async ({
    page,
  }) => {
    requireMarket()
    test.setTimeout(600_000)
    await connectAs(page, 0)

    const amount = base
    // Pre-stage funds AND allowance on chain so the modal's own action is the DEPOSIT send —
    // an approve step would otherwise eat the single armed rejection.
    faucet(account0, amount * 3n, token)
    await chain.approve(account0, token, market, amount * 3n)
    // Market tokens rebase every block, so the "nothing landed" oracle is the SCALED balance.
    const scaledBefore = await marketScaledBalance(market, account0)

    // Count sends that actually reach anvil: a WALLET rejection must never produce one. This is
    // what separates WAL-07 from EDG-13, where the send does reach the RPC and is failed there.
    let sendsSeen = 0
    await page.route(/127\.0\.0\.1:18545/, async (route) => {
      const post = route.request().postData() ?? ""
      if (/eth_sendTransaction|eth_sendRawTransaction/.test(post)) sendsSeen += 1
      await route.continue()
    })

    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    await openSection(
      page,
      /deposit & withdraw/i,
      page.getByTestId("lender-available-withdraw"),
    )

    const rejected = await step(
      page,
      "the wallet rejects the deposit (EIP-1193 4001)",
      async () => {
        await walletCommand(page, { type: "rejectNext", count: 1 })
        const dialog = await openDepositDialog(page)
        await dialog
          .getByRole("textbox")
          .first()
          .fill(formatUnits(amount, decimals))
        const submit = dialog.getByRole("button", { name: /^deposit$/i })
        await expect(submit).toBeEnabled({ timeout: 90_000 })
        await submit.click()

        // Graceful surface: the FinalModals ErrorModal ("Oops! Something went wrong!" +
        // Try Again) or, if the app routed it to a toast instead, a visible error toast.
        // Either is acceptable; a success view or a white screen is not.
        const errorModal = page.getByText("Oops! Something went wrong!").first()
        const sawModal = await errorModal
          .waitFor({ state: "visible", timeout: 120_000 })
          .then(() => true)
          .catch(() => false)
        const retryVisible = sawModal
          ? await page
              .getByRole("button", { name: "Try Again" })
              .isVisible()
              .catch(() => false)
          : false
        const toastText = sawModal
          ? null
          : await page
              .locator('div[role="status"]')
              .first()
              .innerText()
              .catch(() => null)
        return { sawModal, retryVisible, toastText }
      },
    )

    const sendsAfterRejection = sendsSeen
    attachAgreement("WAL-07 wallet rejection", {
      market,
      amount,
      surfacedErrorModal: rejected.sawModal,
      retryOffered: rejected.retryVisible,
      toastText: rejected.toastText,
      sendsReachingAnvil: sendsAfterRejection,
      scaledBefore,
    })

    expect(
      rejected.sawModal || !!rejected.toastText,
      "a rejected signature surfaces an error (modal or toast), never silence",
    ).toBe(true)
    if (!rejected.sawModal)
      expect(
        rejected.toastText ?? "",
        "the toast carries an actual error message",
      ).toMatch(/error|fail|reject|denied/i)
    expect(
      sendsAfterRejection,
      "a WALLET rejection never reaches the RPC (this is not EDG-13's underpriced send)",
    ).toBe(0)
    // No phantom success, no stuck pending. (toHaveCount, not toBeHidden: these anchors are
    // conditionally rendered, and a multi-match locator would trip strict mode instead of
    // asserting.)
    await expect(page.getByText("Transaction Successful!")).toHaveCount(0)
    await expect(page.locator('[data-tx-status="success"]')).toHaveCount(0)
    await expect(page.locator('[data-tx-status="pending"]')).toHaveCount(0)
    await expectNoWhiteScreen(page, "deposit modal after a rejected signature")
    expect(
      await marketScaledBalance(market, account0),
      "nothing was minted by the rejected deposit",
    ).toBe(scaledBefore)

    // ---------- recovery: the user retries and the retry lands ----------
    // One rejection was armed and has been consumed, so the connector forwards again.
    await step(page, "retry the deposit; it lands", async () => {
      if (rejected.sawModal) {
        expect(rejected.retryVisible, "the ErrorModal offers Try Again").toBe(
          true,
        )
        await page.getByRole("button", { name: "Try Again" }).click()
      } else {
        // The toast route has no in-place retry (KNOWN-ISSUES #13): re-drive the dialog.
        await page.keyboard.press("Escape")
        const dialog = await openDepositDialog(page)
        await dialog
          .getByRole("textbox")
          .first()
          .fill(formatUnits(amount, decimals))
        const submit = dialog.getByRole("button", { name: /^deposit$/i })
        await expect(submit).toBeEnabled({ timeout: 90_000 })
        await submit.click()
      }
      await expect
        .poll(() => marketScaledBalance(market, account0), {
          timeout: 180_000,
          message: "the retry after a wallet rejection mints the deposit",
        })
        .toBeGreaterThan(scaledBefore)
    })
    expect(
      sendsSeen,
      "the retry produced exactly one send at the RPC",
    ).toBeGreaterThan(sendsAfterRejection)
    await page.unroute(/127\.0\.0\.1:18545/)
    await page.keyboard.press("Escape")
    await syncSubgraph()
  })

  // ---------------------------------------------------------------------------
  // Wallet-integration lane — not automatable on this harness (manual / release pass)
  // ---------------------------------------------------------------------------

  test.fixme("WAL-01: Safe connect", async () => {
    // The harness only drives the Local Anvil EOA connector. The `safe()` connector IS registered
    // (src/lib/client-config.ts:18-21) but only authorizes inside a Safe app iframe (allowedDomains
    // gnosis-safe.io / app.safe.global), which the local fork has no way to provide.
    // Per e2e/COVERAGE-SUGGESTIONS-2026-09-08.md §6 this belongs to the wallet-integration lane:
    // "run representative Safe borrower/lender loops … These require additional tooling or a
    // documented manual acceptance pass." Record the build/date/result of that pass next to the
    // automated board rather than converting this row to a green EOA test.
  })

  test.fixme("WAL-02: Safe lender run", async () => {
    // Same infrastructure gap as WAL-01, plus the part an EOA cannot prove at all: the ToU and MLA
    // ceremonies are off-chain signatures, and a Safe validates them through EIP-1271, not
    // secp256k1 recovery. Anvil EOA signing establishes nothing about that path.
    // MKT-18 (e2e/borrowerflows/market-creation.spec.ts) documents the same boundary from the
    // borrower side; keep both stubs in step.
  })

  test.fixme("WAL-03: Safe borrower run", async () => {
    // Same as WAL-02 for the borrower loop (deploy incl. MLA pre-sign, borrow, repay, terminate).
    // The app's Safe draft/resume plumbing exists (createMarketSigningDraftsSlice,
    // pendingSafeMessagesSlice) but needs a Safe signer set and the Safe UI to exercise; see
    // MKT-18, which is the same case on page 3.
  })

  test.fixme("WAL-04: Rabby lender run", async () => {
    // Needs the real Rabby browser extension (its own tx simulation and signing UI) loaded into a
    // persistent browser context with a funded key. The harness runs headless Chromium with no
    // extensions, and the runsheet's expectation ("Rabby's tx simulation shows sane previews") is
    // about the extension's own UI, not the app's. Manual/release lane, as for WAL-01…03.
  })
})
