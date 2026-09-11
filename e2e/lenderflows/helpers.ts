import { expect, type Locator, type Page } from "@playwright/test"

import { APP_URL, gql, pins } from "../lib/env"
import { alignBrowserClockToChain } from "../lib/page"

/** pins.json carries more pinned markets than lib/env's declared type; widen locally. */
export const pinnedMarkets = pins.markets as typeof pins.markets & {
  fixedTerm: string
  mla: string
  noMla: string
  wrapperMarket: string
  transferDisabled: string
  transferRestricted: string
}

/**
 * Shared oracles/readers for the lender discovery & portfolio UAT specs
 * (LEN-05..12, LEN-27, LEN-32). The classification below mirrors the app at
 * this commit: utils/marketOnboarding.ts#getSubgraphMarketOnboardingMode +
 * utils/marketCapabilities.ts#hasActiveLenderOnboardingRoleProvider.
 */

/** The hooks contract stores "no pull-provider slot" as max uint24. */
const NULL_PROVIDER_INDEX = 2 ** 24 - 1

export type SubgraphMarket = {
  id: string
  name: string
  isClosed: boolean
  version: string
  marketKind: string
  annualInterestBips: number
  commitmentFeeBips: string | null
  withdrawalBatchDuration: number
  borrower: string
  asset: { symbol: string; address: string }
  hooks: {
    id: string
    providers: {
      isApproved: boolean
      pullProviderIndex: number
      providerInstance: { kind: string } | null
    }[]
  } | null
  hooksConfig: {
    useOnDeposit: boolean
    depositRequiresAccess: boolean
    fixedTermEndTime: number
    periodDuration: number
    withdrawalWindowDuration: number
    firstWithdrawalWindowStart: number
    periodicTermClosed: boolean
  } | null
}

/** Blacklist mirrored from utils/constants.ts:15-24 (EXCLUDED_MARKETS / EXCLUDED_BORROWERS). */
const EXCLUDED_MARKETS = [
  "0xd6440bd3c97e8bfbdc311cbbb50ada03ade4810a",
  "0xfe7cf5680d2e59500f3938c2539fda4754876f94",
]
const EXCLUDED_BORROWERS = ["0x569e7cb1a1c839133012de4adee8361389b0113b"]

/**
 * Does this app build hide the blacklisted markets?
 *
 * utils/constants.ts:10-13 empties both lists when
 * `shouldShowExcludedMarkets` — `NODE_ENV === "development"` or the
 * secretsite host — so the answer depends on HOW the harness serves the app:
 * `npm run dev:fork` (next dev) lists them, a production `next start` (what the
 * boards run) drops them in every catalogue hook before a single bucket is
 * counted: useLendersMarkets.ts:129 (lender all-markets + my-markets),
 * useGetOthersMarkets.ts:36 (borrower "Other Markets"), and again in
 * AllMarketsSection/index.tsx:161.
 *
 * NODE_ENV is inlined at build time, so probe the build instead: `next dev`
 * serves /_next/static/development/_buildManifest.js, a production build 404s.
 */
let excludedMarketsHidden: Promise<boolean> | undefined
export const appHidesExcludedMarkets = (): Promise<boolean> => {
  excludedMarketsHidden ??= fetch(
    `${APP_URL}/_next/static/development/_buildManifest.js`,
  )
    .then((r) => !r.ok)
    .catch(() => true)
  return excludedMarketsHidden
}

/** The catalogue as the app sees it: subgraph rows minus the blacklist (when it applies). */
export const fetchAllMarkets = async (): Promise<SubgraphMarket[]> => {
  const { markets } = await gql<{ markets: SubgraphMarket[] }>(
    `{ markets(first: 1000) {
        id name isClosed version marketKind annualInterestBips commitmentFeeBips
        withdrawalBatchDuration borrower asset { symbol address }
        hooks { id providers { isApproved pullProviderIndex providerInstance { kind } } }
        hooksConfig { useOnDeposit depositRequiresAccess fixedTermEndTime periodDuration
          withdrawalWindowDuration firstWithdrawalWindowStart periodicTermClosed }
      } }`,
  )
  if (!(await appHidesExcludedMarkets())) return markets
  return markets.filter(
    (m) =>
      !EXCLUDED_MARKETS.includes(m.id.toLowerCase()) &&
      !EXCLUDED_BORROWERS.includes(m.borrower.toLowerCase()),
  )
}

export type OnboardingMode = "self" | "manual" | undefined

/** Mirror of getSubgraphMarketOnboardingMode over raw subgraph rows. */
export const onboardingMode = (m: SubgraphMarket): OnboardingMode => {
  if (m.version === "V1") return "manual"
  if (!m.hooksConfig) return undefined
  if (!m.hooksConfig.useOnDeposit || !m.hooksConfig.depositRequiresAccess)
    return "self"
  const providers = m.hooks?.providers
  if (!providers) return undefined
  const hasOnboardingProvider = providers.some(
    (p) =>
      p.isApproved &&
      p.pullProviderIndex >= 0 &&
      p.pullProviderIndex !== NULL_PROVIDER_INDEX &&
      // access-list membership is borrower-managed; excluded from self-onboard
      p.providerInstance?.kind !== "ACCESS_LIST",
  )
  return hasOnboardingProvider ? "self" : "manual"
}

export type CatalogueCounts = {
  self: number
  manual: number
  terminated: number
  unknown: number
  all: number
}

/**
 * Lender-dashboard bucket counts over the given rows (mine already removed).
 * Mirrors AllMarketsSection/index.tsx:187-221 + OtherMarketsTable/index.tsx:166-182:
 * open rows split by isSelfServiceMarketOnboardingMode (Open | Self) vs Managed,
 * closed rows into "terminated". Rows the app never receives (the blacklist) are
 * already gone — see fetchAllMarkets above.
 */
export const classify = (markets: SubgraphMarket[]): CatalogueCounts => {
  const self = markets.filter(
    (m) => !m.isClosed && onboardingMode(m) === "self",
  ).length
  const manual = markets.filter(
    (m) => !m.isClosed && onboardingMode(m) === "manual",
  ).length
  const terminated = markets.filter((m) => m.isClosed).length
  const unknown = markets.filter(
    (m) => !m.isClosed && onboardingMode(m) === undefined,
  ).length
  return { self, manual, terminated, unknown, all: self + manual + terminated }
}

export type Position = {
  marketId: string
  marketName: string
  isClosed: boolean
}

/**
 * Markets where this wallet has a LenderAccount entity.
 *
 * The app splits My Markets from Other Markets on MarketAccount.hasEverInteracted
 * (AllMarketsSection/index.tsx:157-165), which is a SUPERSET of this: the SDK ORs
 * the indexed entry with live lens state — `role !== Null || marketBalance > 0`
 * (@wildcatfi/wildcat-sdk/dist/account/index.js:59-67). A wallet merely granted a
 * credential on a market it never funded is therefore "mine" to the app and
 * "other" here. Nothing on the fork is in that state today; if a bucket count is
 * ever off by one in the self/manual direction, check that first.
 */
export const fetchPositions = async (account: string): Promise<Position[]> =>
  (
    await gql<{
      lenderAccounts: {
        market: { id: string; name: string; isClosed: boolean }
      }[]
    }>(
      `{ lenderAccounts(where: { address: "${account.toLowerCase()}" }, first: 100) {
        market { id name isClosed } } }`,
    )
  ).lenderAccounts.map((a) => ({
    marketId: a.market.id,
    marketName: a.market.name,
    isClosed: a.market.isClosed,
  }))

/** Full oracle snapshot: positions + bucket counts as the lender dashboard derives them. */
export const fetchLenderDashboardOracle = async (account: string) => {
  const [markets, positions] = await Promise.all([
    fetchAllMarkets(),
    fetchPositions(account),
  ])
  const mine = new Set(positions.map((p) => p.marketId))
  const other = markets.filter((m) => !mine.has(m.id))
  return {
    markets,
    positions,
    other: classify(other),
    everything: classify(markets),
    mineActive: positions.filter((p) => !p.isClosed).length,
    mineTerminated: positions.filter((p) => p.isClosed).length,
  }
}

/** Navigate with the browser clock aligned to chain time (see lib/page.ts). */
export const gotoAligned = async (page: Page, path: string) => {
  await alignBrowserClockToChain(page)
  await page.goto(path)
}

const parseTrailingCount = (text: string, label: string): number => {
  const m = text.replace(/\s+/g, " ").match(new RegExp(`${label}\\s*(\\d*)`))
  if (!m) throw new Error(`"${label}" not found in "${text}"`)
  // An absent badge means 0 (DashboardSidebarComponents renders null for 0).
  return m[1] ? Number(m[1]) : 0
}

/** Left-nav counts (LenderNavSidebar). Only meaningful on /lender/all-markets. */
export const readNavCounts = async (page: Page) => {
  const sidebar = page.getByTestId("lender-nav-sidebar")
  await expect(sidebar).toBeVisible({ timeout: 30_000 })
  const text = (await sidebar.innerText()).replace(/\n/g, " ")
  const myMarketsVisible = await sidebar
    .locator('a[href="/lender/my-markets"]')
    .isVisible()
  return {
    myMarkets: myMarketsVisible ? parseTrailingCount(text, "My Markets") : null,
    allMarkets: parseTrailingCount(text, "All Markets"),
    otherTotal: parseTrailingCount(text, "Other Markets"),
    selfOnboard: parseTrailingCount(text, "Self-Onboard"),
    manual: parseTrailingCount(text, "Onboard by Borrower"),
    terminated: parseTrailingCount(text, "Terminated"),
  }
}

/** Count in a MarketsTableAccordion header (e.g. "Self-Onboard223" in #self-onboard). */
export const readAccordionCount = async (
  page: Page,
  containerId: string,
  timeout = 60_000,
): Promise<number> => {
  const summary = page.locator(`#${containerId} .MuiAccordionSummary-root`)
  await expect(summary).toBeVisible({ timeout })
  await expect(summary).not.toContainText("Are Loading...", { timeout })
  const text = (await summary.innerText()).replace(/\n/g, "")
  const m = text.match(/(\d+)\s*$/)
  if (!m) throw new Error(`no count in accordion header "${text}"`)
  return Number(m[1])
}

export const rowsIn = (page: Page, containerId: string): Locator =>
  page.locator(`#${containerId} .MuiDataGrid-row`)

export const cellIn = (row: Locator, field: string): Locator =>
  row.locator(`.MuiDataGrid-cell[data-field="${field}"]`)

/** Wait until the three all-markets accordions are done loading; return their counts. */
export const readOtherMarketsCounts = async (page: Page) => ({
  self: await readAccordionCount(page, "self-onboard"),
  manual: await readAccordionCount(page, "manual"),
  terminated: await readAccordionCount(page, "other-terminated"),
})

/** Open one of the MarketsFilterSelect dropdowns by its placeholder ("Asset", "Status", …). */
export const openFilterMenu = async (page: Page, placeholder: string) => {
  // Re-opening a select right after Escape races MUI's close transition (the click lands on the
  // dying backdrop and is swallowed) — retry the click until the popover actually appears.
  const combo = page
    .getByRole("combobox")
    .filter({ hasText: placeholder })
    .first()
  await expect(async () => {
    // Only click while no popover is up: an open MUI modal aria-hides the
    // rest of the page, so the combobox role query would stall and time out.
    if ((await page.locator(".MuiPopover-root:visible").count()) === 0) {
      // Click the placeholder text, never the combo's center: with an active
      // selection MarketsFilterSelect renders a count chip whose click CLEARS
      // the filter (renderValue onClick=handleClear) instead of opening.
      await combo.getByText(placeholder, { exact: true }).click()
    }
    await expect(page.locator(".MuiPopover-root:visible").last()).toBeVisible({
      timeout: 2_000,
    })
  }).toPass({ timeout: 30_000 })
  return page.locator(".MuiPopover-root:visible").last()
}

export const closeFilterMenu = async (page: Page) => {
  await page.keyboard.press("Escape")
  await expect(page.locator(".MuiPopover-root:visible")).toHaveCount(0)
}

/** Compact-duration formatter mirroring utils/periodicWithdrawalWindow.ts (largest unit only). */
export const parseCompactDurationSeconds = (label: string): number => {
  const m = label.match(/(\d+)\s*(y|mo|w|d|h|m|s)\b/)
  if (!m) throw new Error(`no compact duration in "${label}"`)
  const mult: Record<string, number> = {
    y: 31557600,
    mo: 2629800,
    w: 604800,
    d: 86400,
    h: 3600,
    m: 60,
    s: 1,
  }
  return Number(m[1]) * mult[m[2]]
}

/** Periodic-window arithmetic mirroring PeriodicTermHooks / getPeriodicScheduleTiming. */
export const periodicTiming = (
  schedule: {
    firstWithdrawalWindowStart: number
    periodDuration: number
    withdrawalWindowDuration: number
  },
  nowSec: number,
) => {
  const {
    firstWithdrawalWindowStart: start,
    periodDuration: period,
    withdrawalWindowDuration: windowDuration,
  } = schedule
  if (nowSec < start)
    return {
      isOpen: false,
      nextWindowStart: start,
      secondsToBoundary: start - nowSec,
    }
  const into = (nowSec - start) % period
  const currentPeriodStart = nowSec - into
  const isOpen = into < windowDuration
  const nextWindowStart = currentPeriodStart + period
  const secondsToBoundary = isOpen
    ? currentPeriodStart + windowDuration - nowSec
    : nextWindowStart - nowSec
  return { isOpen, nextWindowStart, secondsToBoundary }
}

/** "DD MMM YYYY" in UTC, mirroring utils/formatters.ts#formatUtcMaturityDate. */
export const formatUtcMaturityDate = (unixSeconds: number): string => {
  const d = new Date(unixSeconds * 1000)
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Mirror of utils/formatters.ts#formatBps for whole-percent APR display. */
export const formatBpsPercent = (bips: number): string => {
  const pct = bips / 100
  return `${Number.isInteger(pct) ? pct : parseFloat(pct.toFixed(2))}%`
}

/** Search box on the all-markets / my-markets header. */
export const searchField = (page: Page): Locator =>
  page.getByPlaceholder("Search")

/**
 * Dismiss the borrower-side ToU signature modal if it pops (never sign it).
 *
 * The prompt auto-opens only once the borrower status query resolves, so it is NOT up at the
 * moment the toggle finishes navigating — and isVisible() ignores its timeout option (see
 * CONVENTIONS), which made the old instant probe a coin flip. Wait for it, bounded.
 */
export const dismissTouDialogIfPresent = async (
  page: Page,
  timeout = 10_000,
) => {
  const dialog = page
    .getByRole("dialog")
    .filter({ hasText: "Terms of Use Signature Required" })
  const appeared = await dialog
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false)
  if (!appeared) return
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden({ timeout: 10_000 })
}

/**
 * Close whatever modal is covering the page, except one we asked to keep.
 *
 * A MUI dialog aria-hides everything behind it, so ANY open modal makes the header's role
 * queries (the wallet chip) unreachable and a bare click on the chip waits out the whole test —
 * the LEN-12 board failure, where the borrower-side ToU prompt opened between the dismiss probe
 * and the click. The ToU prompt closes on Escape; head's KYB "How Wildcat checks this profile"
 * explainer only closes via its own button (mirrors dismissTouPromptIfOpen in
 * borrowerflows/onboarding.spec.ts).
 */
export const dismissBlockingDialogs = async (page: Page, keep?: Locator) => {
  for (let i = 0; i < 6; i += 1) {
    const dialog = page.getByRole("dialog").last()
    // eslint-disable-next-line no-await-in-loop
    if (!(await dialog.isVisible().catch(() => false))) return
    // eslint-disable-next-line no-await-in-loop
    if (keep && (await keep.isVisible().catch(() => false))) return
    const ack = dialog.getByRole("button", { name: /i understand/i })
    const clicked =
      // eslint-disable-next-line no-await-in-loop
      (await ack.isVisible().catch(() => false)) &&
      // Stacked dialogs put another backdrop over this button: bounded click, Escape on
      // interception (which closes whichever dialog is topmost anyway).
      // eslint-disable-next-line no-await-in-loop
      (await ack
        .click({ timeout: 5_000 })
        .then(() => true)
        .catch(() => false))
    // eslint-disable-next-line no-await-in-loop
    if (!clicked) await page.keyboard.press("Escape")
    // eslint-disable-next-line no-await-in-loop
    await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {})
  }
}
