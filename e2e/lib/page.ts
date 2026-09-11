import { expect, type Page } from "@playwright/test"

import { blockTimestamp, ensureImpersonated } from "./chain"
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

/**
 * Seed the Local Anvil connector's account BEFORE any page load in this context (test-only).
 *
 * `account` is either an index into anvil's own accounts, or an arbitrary ADDRESS. An address is
 * seeded through the connector's `anvil-impersonate-address` key and unlocked on the node with
 * `anvil_impersonateAccount`, so the browser can transact as a real Sepolia account the fork
 * inherited (the only borrowers that own markets on `main`). Message signing stays impossible for
 * an impersonated account — see `ensureImpersonated`.
 */
export const connectAs = async (page: Page, account: number | Address) => {
  const address =
    typeof account === "number" ? ANVIL_ACCOUNTS[account] : account
  if (typeof account !== "number") await ensureImpersonated(account)
  await page.addInitScript(
    ({ index, impersonate }) => {
      try {
        if (impersonate)
          window.localStorage.setItem("anvil-impersonate-address", impersonate)
        else window.localStorage.removeItem("anvil-impersonate-address")
        window.localStorage.setItem("anvil-account-index", String(index ?? 0))
      } catch {
        /* storage unavailable */
      }
    },
    {
      index: typeof account === "number" ? account : null,
      impersonate: typeof account === "number" ? null : account,
    },
  )
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
              accounts: [address],
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
  await page
    .context()
    .addCookies([{ name: "wagmi.store", value: store, url: APP_URL }])
}

export const gotoMarket = async (page: Page, market: string) => {
  await alignBrowserClockToChain(page)
  await page.goto(`/lender/market/${market.toLowerCase()}`)
}

/** In test mode the Local Anvil connector auto-reconnects; connect through the dialog otherwise. */
export const ensureConnected = async (page: Page, account: Address) => {
  const shortAddress = new RegExp(
    `${account.slice(0, 6)}.*${account.slice(-4)}`,
    "i",
  )
  const connected = page.getByRole("button", { name: shortAddress })
  // Wait for EITHER outcome before deciding: isVisible() returns immediately (timeout option
  // ignored), and an instant pre-hydration check misclassifies a connected page, then waits
  // forever for a Connect Wallet button that never exists (found on the v2.5 prod build).
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

/**
 * Same read, but wait for the LIVE value first.
 *
 * `marketBalance` only becomes the normalized balance once `refreshLenderMarketAccounts` has
 * hydrated the account from the lens; until then the block renders the subgraph's SCALED balance,
 * which differs from the on-chain balance by the market's scaleFactor (~14% on an old market).
 * Reading the block the instant it appears is therefore a race — the first main run caught the
 * pre-hydration value and reported 4,281.95 against an on-chain 5,001.
 *
 * Poll for the value under test rather than snapshotting: a genuinely wrong number still fails,
 * it just fails after the hydration window instead of before it.
 */
export const waitAvailableToWithdraw = async (
  page: Page,
  /** Exact expected value, or a predicate for the cases with a rounding tolerance. */
  expected: bigint | ((raw: bigint) => boolean),
  timeout = 60_000,
) => {
  const el = page.getByTestId("lender-available-withdraw")
  await expect(el).toBeVisible({ timeout: 30_000 })
  const raw = async () => BigInt((await el.getAttribute("data-value")) ?? "0")
  const message = "lender-available-withdraw settles on the live balance"
  if (typeof expected === "bigint") {
    await expect
      .poll(async () => (await raw()).toString(), { message, timeout })
      .toBe(expected.toString())
  } else {
    await expect
      .poll(async () => expected(await raw()), { message, timeout })
      .toBe(true)
  }
  return readAvailableToWithdraw(page)
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
