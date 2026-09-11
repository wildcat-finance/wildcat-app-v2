import { expect, type Page } from "@playwright/test"

import { blockTimestamp } from "./chain"
import { ANVIL_ACCOUNTS, APP_URL, type Address } from "./env"

/**
 * Page oracles for the lender market page. Anchors are data-testid / data-value attributes added
 * for automation; formatted text is read alongside the raw value where the app exposes it.
 */
/** The app classifies time-gated state (batch expiry, terms) with Date.now(); after test time travel the
 *  chain leads the wall clock, so start the page's clock at chain time (timers keep ticking normally). */
export const alignBrowserClockToChain = async (page: Page) => {
  await page.clock.install({ time: (await blockTimestamp()) * 1000 })
}

/** Seed the Local Anvil connector's account BEFORE any page load in this context (test-only). */
export const connectAs = async (page: Page, accountIndex: number) => {
  await page.addInitScript((index) => {
    try {
      window.localStorage.setItem("anvil-account-index", String(index))
    } catch {
      /* storage unavailable */
    }
  }, accountIndex)
  // Pre-seed wagmi's connection cookie so EVERY mount (SSR included) hydrates already-connected:
  // without it, each hydration/remount briefly reports an undefined address and the app's
  // no-wallet guard can bounce deep links to /lender at any moment (KNOWN-ISSUES #1). Cookie
  // shape captured from a live session; the uid is reconciled by wagmi on reconnect.
  const uid = "e2e00000000"
  const store = JSON.stringify({
    state: {
      connections: {
        __type: "Map",
        value: [
          [
            uid,
            {
              accounts: [ANVIL_ACCOUNTS[accountIndex]],
              chainId: 11155111,
              connector: {
                id: "localAnvil",
                name: "Local Anvil",
                type: "localAnvil",
                uid,
              },
            },
          ],
        ],
      },
      chainId: 11155111,
      current: uid,
    },
    version: 2,
  })
  await page.context().addCookies([
    { name: "wagmi.store", value: store, url: APP_URL },
  ])
}

export const gotoMarket = async (page: Page, market: string) => {
  await alignBrowserClockToChain(page)
  await page.goto(`/lender/market/${market.toLowerCase()}`)
}

/** In test mode the Local Anvil connector auto-reconnects; connect through the dialog otherwise.
 *  Wait for the page to show EITHER outcome before deciding: isVisible() returns immediately
 *  (its timeout option is ignored — see CONVENTIONS), and a pre-hydration instant check on a
 *  fast (production) server misclassifies a connected page and then waits forever for a
 *  Connect Wallet button that will never exist. */
export const ensureConnected = async (page: Page, account: Address) => {
  const shortAddress = new RegExp(
    `${account.slice(0, 6)}.*${account.slice(-4)}`,
    "i",
  )
  const connected = page.getByRole("button", { name: shortAddress })
  const connectCta = page.getByRole("button", { name: /connect wallet/i })
  await expect(connected.or(connectCta).first()).toBeVisible({
    timeout: 30_000,
  })
  // The CTA can vanish between the race and the click (auto-reconnect completing): bounded
  // click, and on interception/detachment re-check the connected chip instead of hanging.
  for (let attempt = 0; ; attempt += 1) {
    if (await connected.isVisible().catch(() => false)) return
    const clicked = await connectCta
      .first()
      .click({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
    if (clicked) break
    if (attempt >= 2) {
      // An auto-opened dialog (ToU re-acceptance, KYB explainer) aria-hides the whole header:
      // role queries are blind to BOTH the chip and the CTA, but the chip's TEXT stays
      // findable — assert the address is rendered rather than hanging on roles.
      await expect(page.getByText(shortAddress).first()).toBeVisible({
        timeout: 30_000,
      })
      return
    }
  }
  await page.getByRole("button", { name: "Local Anvil" }).click()
  await expect(connected).toBeVisible({ timeout: 30_000 })
}

/** "Available For Withdraw Requests" block: formatted text + raw underlying units. */
export const readAvailableToWithdraw = async (page: Page) => {
  const el = page.getByTestId("lender-available-withdraw")
  await expect(el).toBeVisible({ timeout: 30_000 })
  return {
    text: (await el.innerText()).trim(),
    raw: BigInt((await el.getAttribute("data-value")) ?? "0"),
  }
}

/** Withdrawals status line ("… ready to claim" / "No assets available…"): text + raw claimable amount. */
export const readWithdrawalsStatus = async (page: Page) => {
  const el = page.getByTestId("lender-withdrawals-status")
  await expect(el).toBeVisible({ timeout: 30_000 })
  return {
    text: (await el.innerText()).trim(),
    claimableRaw: BigInt((await el.getAttribute("data-claimable")) ?? "0"),
  }
}

/** Open the market page's "Withdrawal Requests" section (WithdrawalRequests only mounts there). */
export const openWithdrawalRequests = async (page: Page) => {
  // The sidebar item concatenates a count badge ("Withdrawal Requests1"); match the prefix.
  await page
    .getByText(/^Withdrawal Requests/)
    .first()
    .click()
  await expect(page.getByTestId("withdrawals-ongoing")).toBeVisible({
    timeout: 30_000,
  })
}

/** Amount cells of the "Ongoing" withdrawal requests table (formatted, e.g. "40 DAI").
 *  Waits for the async DataGrid to render at least one row; header cells also carry data-field,
 *  so only .MuiDataGrid-cell counts. */
export const readOngoingAmounts = async (page: Page, timeout = 30_000) => {
  const cells = page
    .getByTestId("withdrawals-ongoing")
    .locator('.MuiDataGrid-cell[data-field="amount"]')
  await cells.first().waitFor({ state: "visible", timeout })
  return cells.allInnerTexts()
}

export const waitForTxSuccess = (page: Page, timeout = 120_000) =>
  expect(page.locator('[data-tx-status="success"]').first()).toBeVisible({
    timeout,
  })

/**
 * Dismiss a transaction modal once it has reached (or has yet to reach) its success view.
 *
 * The on-chain effect a test polls for lands BEFORE the modal leaves its loading body: the
 * WithdrawModal only swaps in the success body after the app has the receipt and its refetch
 * settles (WithdrawModal/index.tsx `view === "loading"` -> `"done"`). Sampling
 * `isVisible()` once right after the chain poll therefore reads the "Wait A Moment..." spinner,
 * skips the dismiss, and leaves the dialog open a second later — and an open MUI dialog marks
 * the rest of the page `aria-hidden`, so every later `getByRole` on the page BEHIND it resolves
 * to nothing (the WAL-05 board failure: six 15 s `openSection` clicks with "waiting for
 * getByRole('button', { name: /deposit & withdraw/i }).first()").
 *
 * The refetch can also unmount the modal on its own, so "no dialog" is a valid outcome and the
 * dismiss stays optional. The click is bounded with an Escape fallback: the button can be
 * visible yet pointer-blocked by a closing overlay, and an unbounded click then eats the whole
 * test budget. The postcondition is the dialog being GONE, not the click having happened.
 */
export const dismissTxModal = async (
  page: Page,
  name: RegExp = /back to market/i,
  timeout = 120_000,
) => {
  const dialog = page.getByRole("dialog").first()
  const dismiss = page.getByRole("button", { name }).first()
  await expect(async () => {
    if (!(await dialog.isVisible().catch(() => false))) return
    const reached = await dismiss
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false)
    const clicked =
      reached &&
      (await dismiss
        .click({ timeout: 10_000 })
        .then(() => true)
        .catch(() => false))
    if (!clicked) await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden({ timeout: 10_000 })
  }).toPass({ timeout })
}
