import {
  cellIn,
  classify,
  closeFilterMenu,
  dismissBlockingDialogs,
  dismissTouDialogIfPresent,
  fetchAllMarkets,
  fetchLenderDashboardOracle,
  formatUtcMaturityDate,
  gotoAligned,
  openFilterMenu,
  parseCompactDurationSeconds,
  periodicTiming,
  pinnedMarkets,
  readAccordionCount,
  readNavCounts,
  readOtherMarketsCounts,
  rowsIn,
  searchField,
  type SubgraphMarket,
} from "./helpers"
import { ensureTouSigned } from "./lib"
import { approve, blockTimestamp, depositUpTo, marketBalance } from "../lib/chain"
import { ANVIL_ACCOUNTS, faucet, gql, pins, type Address } from "../lib/env"
import { connectAs, ensureConnected } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import { expect, test } from "../lib/test"

/**
 * Lender discovery & explorer UAT cases (LEN-05..LEN-12), read-only.
 * Oracle: the fork subgraph; classification helpers mirror the app's own
 * bucket derivation (see helpers.ts). No transactions, no time travel.
 */

const account = ANVIL_ACCOUNTS[0] as Address
const ALL_MARKETS = "/lender/all-markets"
const MY_MARKETS = "/lender/my-markets"

/** Search predicate mirror of utils/filters.ts#filterMarketAccounts (market fields only). */
const matchesSearch = (m: SubgraphMarket, q: string) => {
  const s = q.toLowerCase()
  return (
    m.name.toLowerCase().includes(s) ||
    m.id.toLowerCase().includes(s) ||
    m.asset.symbol.toLowerCase().includes(s)
  )
}

const expectCounts = async (
  page: Parameters<typeof readOtherMarketsCounts>[0],
  expected: { self: number; manual: number; terminated: number },
  label: string,
) => {
  await expect
    .poll(async () => readOtherMarketsCounts(page), {
      message: label,
      timeout: 30_000,
    })
    .toEqual(expected)
}

// After a harness reset the app DB snapshot holds NO ToU acceptance for our accounts, and every
// /lender page redirects to the agreement gate ("Are Loading..." forever from a test's viewpoint).
// Make the suite self-sufficient instead of depending on agreements.spec.ts having run first.
test("setup: current ToU acceptance for the reading account", async ({
  page,
}) => {
  await ensureTouSigned(page, account, pins.markets.openTerm)
})

test("LEN-05: explorer filters & search", async ({ page }) => {
  test.setTimeout(420_000)
  await gotoAligned(page, ALL_MARKETS)
  await ensureConnected(page, account)

  const oracle = await fetchLenderDashboardOracle(account)
  const mine = new Set(oracle.positions.map((p) => p.marketId))
  const other = oracle.markets.filter((m) => !mine.has(m.id))
  const baseline = {
    self: oracle.other.self,
    manual: oracle.other.manual,
    terminated: oracle.other.terminated,
  }
  const pick = (ms: SubgraphMarket[]) => {
    const c = classify(ms)
    return { self: c.self, manual: c.manual, terminated: c.terminated }
  }

  await step(
    page,
    "baseline: unfiltered counts match the subgraph",
    async () => {
      await expectCounts(page, baseline, "unfiltered accordion counts")
      attachAgreement("LEN-05 baseline", { ui: baseline, oracle: oracle.other })
    },
  )

  // Fork-state note (not an upstream change): account #0 now holds a
  // LenderAccount on the pinned fixed-term market (an earlier suite deposited
  // there), so that market lives in My Markets and is excluded from Other
  // Markets. Pick the search subject deterministically from the oracle's own
  // "other" bucket instead of relying on a pin staying position-free.
  const subject = [...other]
    .filter((m) => !m.isClosed)
    .sort((a, b) => (a.id < b.id ? -1 : 1))[0]
  expect(subject, "an open market outside our positions exists").toBeTruthy()
  // Search by the FULL market name: the app's search also matches borrower
  // name/alias/address (utils/filters.ts#filterMarketAccounts, unchanged since
  // base), which our subgraph oracle cannot see. A short fragment ("Test")
  // collides with borrower names; a full market name never does.
  const searchTerm = subject.name

  await step(page, `search by market name "${searchTerm}"`, async () => {
    await searchField(page).fill(searchTerm)
    const expected = pick(other.filter((m) => matchesSearch(m, searchTerm)))
    await expectCounts(page, expected, `search "${searchTerm}"`)
    // Every rendered row's name matches the search.
    for (const id of ["self-onboard", "manual", "other-terminated"]) {
      const names = await rowsIn(page, id)
        .locator('.MuiDataGrid-cell[data-field="name"]')
        .allInnerTexts()
      for (const n of names)
        expect(n.toLowerCase(), `row in #${id}`).toContain(
          searchTerm.toLowerCase(),
        )
    }
    attachAgreement("LEN-05 search by name", { searchTerm, expected })
  })

  await step(page, "search by market address", async () => {
    await searchField(page).fill(subject.id)
    const expected = pick(other.filter((m) => m.id === subject.id))
    expect(
      expected.self + expected.manual + expected.terminated,
      "address search hits exactly the subject market",
    ).toBe(1)
    await expectCounts(page, expected, "search by address")
  })

  await step(page, "clear search with the erase button", async () => {
    await searchField(page)
      .locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")]')
      .getByRole("button")
      .click()
    await expect(searchField(page)).toHaveValue("")
    await expectCounts(page, baseline, "counts restored after clearing search")
  })

  await step(page, "asset filter: WETH", async () => {
    const menu = await openFilterMenu(page, "Asset")
    await menu.getByRole("checkbox", { name: "WETH", exact: true }).check()
    await closeFilterMenu(page)
    const expected = pick(other.filter((m) => m.asset.symbol === "WETH"))
    await expectCounts(page, expected, "asset=WETH")
    const assets = await rowsIn(page, "self-onboard")
      .locator('.MuiDataGrid-cell[data-field="asset"]')
      .allInnerTexts()
    for (const a of assets) expect(a.trim()).toBe("WETH")
    attachAgreement("LEN-05 asset filter", { asset: "WETH", expected })
  })

  await step(page, "combine asset + withdrawal cycle (≤ 24h)", async () => {
    const menu = await openFilterMenu(page, "Withdrawal Cycle")
    await menu.getByRole("checkbox", { name: "≤ 24h", exact: true }).check()
    await closeFilterMenu(page)
    const expected = pick(
      other.filter(
        (m) => m.asset.symbol === "WETH" && m.withdrawalBatchDuration <= 86400,
      ),
    )
    await expectCounts(page, expected, "asset=WETH & cycle<=24h")
    attachAgreement("LEN-05 combined filters", { expected })
  })

  await step(page, "reset both selects from their menus", async () => {
    const cycleMenu = await openFilterMenu(page, "Withdrawal Cycle")
    await cycleMenu.getByRole("option", { name: "Reset" }).click()
    await closeFilterMenu(page)
    const assetMenu = await openFilterMenu(page, "Asset")
    await assetMenu.getByRole("option", { name: "Reset" }).click()
    await closeFilterMenu(page)
    await expectCounts(page, baseline, "counts restored after reset")
  })

  await step(page, "status options; Terminated maps to isClosed", async () => {
    // Verified live on head d335b59b: the explorer's Status filter offers
    // exactly the live-market statuses (marketStatusesMock — which has never
    // contained TERMINATED, on base ae0335f3 or head). Closed markets are not
    // a status-filter value; they live in the dedicated #other-terminated
    // accordion asserted below and in LEN-06. Pin the option set so an
    // upstream change (e.g. adding a Terminated option) fails loudly here.
    const menu = await openFilterMenu(page, "Status")
    const options = (await menu.locator("label").allInnerTexts()).map((t) =>
      t.trim(),
    )
    expect(new Set(options)).toEqual(new Set(["Healthy", "Pending", "Penalty"]))
    await closeFilterMenu(page)
    // "Terminated maps to isClosed": every row of the terminated accordion —
    // populated from isClosed markets (see helpers.ts#classify) — renders the
    // Terminated status chip, and its count equals the oracle's bucket.
    await expectCounts(page, baseline, "unfiltered counts before status probe")
    const statuses = await rowsIn(page, "other-terminated")
      .locator('.MuiDataGrid-cell[data-field="status"]')
      .allInnerTexts()
    expect(statuses.length).toBeGreaterThan(0)
    for (const s of statuses) expect(s).toContain("Terminated")
    attachAgreement("LEN-05 status options", { options })
  })

  await step(
    page,
    "status filter: Healthy shows only healthy rows",
    async () => {
      const menu = await openFilterMenu(page, "Status")
      await menu.getByRole("checkbox", { name: "Healthy", exact: true }).check()
      await closeFilterMenu(page)
      // Healthy/Pending depend on live delinquency (willBeDelinquent is chain-
      // time derived), so assert the invariant on rendered rows, not exact counts.
      const counts = await readOtherMarketsCounts(page)
      expect(counts.terminated, "no closed market passes Healthy").toBe(0)
      expect(counts.self + counts.manual).toBeGreaterThan(0)
      expect(counts.self).toBeLessThanOrEqual(baseline.self)
      expect(counts.manual).toBeLessThanOrEqual(baseline.manual)
      const statuses = await rowsIn(page, "self-onboard")
        .locator('.MuiDataGrid-cell[data-field="status"]')
        .allInnerTexts()
      expect(statuses.length).toBeGreaterThan(0)
      for (const s of statuses) expect(s).toContain("Healthy")
      attachAgreement("LEN-05 status=Healthy", { counts, baseline })
      const reset = await openFilterMenu(page, "Status")
      await reset.getByRole("option", { name: "Reset" }).click()
      await closeFilterMenu(page)
      await expectCounts(page, baseline, "counts restored after status reset")
    },
  )

  // Filters named in the runsheet that do not exist on this build's explorer
  // (type, term, APR, remaining, total debt, your loan) are recorded here so
  // the coverage gap is visible in the report.
  attachAgreement("LEN-05 coverage note", {
    exercised: [
      "search (name/address)",
      "asset",
      "status",
      "withdrawal cycle",
      "reset",
    ],
    notPresentOnThisBuild: [
      "type",
      "term",
      "APR",
      "remaining",
      "total debt",
      "your loan",
    ],
  })
})

test("LEN-06: market counts reconcile (nav vs content vs subgraph; lender, borrower, disconnected)", async ({
  page,
}) => {
  test.setTimeout(480_000)
  await gotoAligned(page, ALL_MARKETS)
  await ensureConnected(page, account)

  const oracle = await fetchLenderDashboardOracle(account)

  await step(
    page,
    "lender all-markets: nav == content == subgraph",
    async () => {
      // Content accordions settle first; nav re-dispatches from the same data.
      const content = await readOtherMarketsCounts(page)
      await expect
        .poll(
          async () => {
            const nav = await readNavCounts(page)
            return {
              all: nav.allMarkets,
              other: nav.otherTotal,
              self: nav.selfOnboard,
              manual: nav.manual,
              terminated: nav.terminated,
            }
          },
          { message: "nav badges settle to the content classification" },
        )
        .toEqual({
          all: content.self + content.manual + content.terminated,
          other: content.self + content.manual + content.terminated,
          self: content.self,
          manual: content.manual,
          terminated: content.terminated,
        })
      const nav = await readNavCounts(page)
      // The 424-vs-328 regression: the badge must equal the sum of its buckets.
      expect(nav.allMarkets).toBe(nav.selfOnboard + nav.manual + nav.terminated)
      // UI vs subgraph oracle.
      expect({
        self: content.self,
        manual: content.manual,
        terminated: content.terminated,
      }).toEqual({
        self: oracle.other.self,
        manual: oracle.other.manual,
        terminated: oracle.other.terminated,
      })
      expect(nav.myMarkets, "My Markets badge shows active mine").toBe(
        oracle.mineActive,
      )
      attachAgreement("LEN-06 lender counts", {
        nav,
        content,
        oracle: oracle.other,
      })
    },
  )

  await step(
    page,
    "header count equals rendered rows (incl. last page)",
    async () => {
      const content = await readOtherMarketsCounts(page)
      const firstPageRows = await rowsIn(page, "self-onboard").count()
      expect(firstPageRows).toBe(Math.min(50, content.self))
      // Walk the terminated table to its last page: header == total rendered rows.
      const lastPage = Math.ceil(content.terminated / 50)
      if (lastPage > 1) {
        await page
          .locator("#other-terminated")
          .getByRole("button", { name: `Go to page ${lastPage}` })
          .click()
        await expect(rowsIn(page, "other-terminated")).toHaveCount(
          content.terminated - 50 * (lastPage - 1),
        )
      }
    },
  )

  await step(
    page,
    "my-markets: section counts equal the position oracle",
    async () => {
      await gotoAligned(page, MY_MARKETS)
      await ensureConnected(page, account)
      await expect
        .poll(async () => readAccordionCount(page, "deposited"), {
          message: "deposited accordion settles",
          timeout: 60_000,
        })
        .toBe(oracle.mineActive)
      const activeButton = page.getByRole("button", { name: /^Active Markets/ })
      await expect(activeButton).toContainText(String(oracle.mineActive))
      expect(await readAccordionCount(page, "non-deposited")).toBe(0)
      const terminatedButton = page.getByRole("button", {
        name: /^Terminated Markets/,
      })
      await expect(terminatedButton).toBeVisible()
      const terminatedText = (await terminatedButton.innerText()).replace(
        /\n/g,
        "",
      )
      const terminatedShown = Number(terminatedText.match(/(\d+)$/)?.[1] ?? "0")
      expect(terminatedShown).toBe(oracle.mineTerminated)
      attachAgreement("LEN-06 my-markets", {
        deposited: oracle.mineActive,
        terminated: oracle.mineTerminated,
        positions: oracle.positions,
      })
    },
  )

  await step(page, "borrower side: 'Other Markets' totals agree", async () => {
    await gotoAligned(page, "/borrower")
    await ensureConnected(page, account)
    await dismissTouDialogIfPresent(page)
    const borrowed = oracle.markets.filter(
      (m) => m.borrower.toLowerCase() === account.toLowerCase(),
    ).length
    const expectedOther = oracle.markets.length - borrowed
    await expect
      .poll(
        async () => {
          const text = (await page.locator("body").innerText()).replace(
            /\n/g,
            " ",
          )
          const counts = [...text.matchAll(/Other Markets\s*(\d+)/g)].map((m) =>
            Number(m[1]),
          )
          return counts
        },
        {
          message: "borrower nav + content 'Other Markets' totals",
          timeout: 90_000,
        },
      )
      .toEqual(expect.arrayContaining([expectedOther]))
    const text = (await page.locator("body").innerText()).replace(/\n/g, " ")
    const counts = [...text.matchAll(/Other Markets\s*(\d+)/g)].map((m) =>
      Number(m[1]),
    )
    expect(
      counts.length,
      "badge appears in nav and content",
    ).toBeGreaterThanOrEqual(2)
    for (const c of counts) expect(c).toBe(expectedOther)
    attachAgreement("LEN-06 borrower side", { counts, expectedOther, borrowed })
  })

  await step(page, "disconnected: own markets move into 'other'", async () => {
    await gotoAligned(page, ALL_MARKETS)
    await ensureConnected(page, account)
    await readOtherMarketsCounts(page) // wait for the initial load
    await page.getByRole("button", { name: /0xf39F.*2266/i }).click()
    await page.getByRole("button", { name: "Disconnect" }).click()
    await expect(
      page.getByRole("button", { name: /connect wallet/i }).first(),
    ).toBeVisible({ timeout: 30_000 })
    const everything = classify(oracle.markets)
    await expect
      .poll(async () => readOtherMarketsCounts(page), {
        message: "disconnected content counts equal the whole catalogue",
        timeout: 90_000,
      })
      .toEqual({
        self: everything.self,
        manual: everything.manual,
        terminated: everything.terminated,
      })
    const nav = await readNavCounts(page)
    expect(nav.myMarkets, "My Markets link hidden when disconnected").toBeNull()
    expect(nav.allMarkets).toBe(everything.all)
    expect(nav.allMarkets).toBe(
      oracle.other.all + oracle.mineActive + oracle.mineTerminated,
    )
    attachAgreement("LEN-06 disconnected", { nav, everything })
  })
})

// Upstream 05af0a4f "back by destination not browser history" (+ 56b0e8d5)
// replaced history-based back controls with explicit destination links, and
// 24624183 rerouted lender-side borrower chips to the PUBLIC borrower profile
// (/profile/borrower/<addr>). The intended model now: the profile sidebar's
// "Back" is a plain link to the lender root (/lender) — it does NOT restore
// the previously open list.
test("LEN-07: back from a borrower profile is destination-based (→ /lender)", async ({
  page,
}) => {
  await gotoAligned(page, ALL_MARKETS)
  await ensureConnected(page, account)
  await readOtherMarketsCounts(page)

  const profileHref = await step(
    page,
    "open a borrower profile from Other Markets",
    async () => {
      // Borrower chips link to the public borrower profile since 24624183.
      const link = page
        .locator('#self-onboard a[href^="/profile/borrower/"]')
        .first()
      const href = await link.getAttribute("href")
      await link.click()
      await page.waitForURL(/\/profile\/borrower\//, { timeout: 30_000 })
      attachAgreement("LEN-07 profile page", { href, landedOn: page.url() })
      return href
    },
  )
  expect(profileHref).toMatch(
    /^\/profile\/borrower\/0x[0-9a-f]{40}\?chainId=\d+$/i,
  )

  await step(page, "the Back control names its destination", async () => {
    // The first profile visit in a fresh context pops the "How Wildcat checks
    // this profile" explainer once profile data loads (its timing varies —
    // a 5s peek raced it and the dialog then intercepted the Back click).
    // Wait generously for it and acknowledge; absent is also fine.
    const explainer = page.getByRole("button", { name: "I understand" })
    await explainer.click({ timeout: 30_000 }).catch(() => {})
    await expect(explainer).toBeHidden()
    // BorrowerSidebar computes the back link from context: no borrower-context
    // path and no from=borrower query → the lender root (05af0a4f, 56b0e8d5).
    const back = page.getByRole("link", { name: "Back", exact: true })
    await expect(back).toBeVisible({ timeout: 60_000 })
    await expect(back).toHaveAttribute("href", "/lender")
    await back.click()
    await page.waitForURL(/\/lender$/, { timeout: 30_000 })
    expect(page.url()).not.toContain("/lender/my-markets")
    attachAgreement("LEN-07 back destination", {
      landedOn: page.url(),
      note: "destination-based back: profile → /lender root (the Explore dashboard), not the previously open list",
    })
  })
})

// Upstream 24624183 "fix opening borrower profile from lender's side" —
// verified live on head d335b59b: the chip's /profile/borrower/<addr> page
// renders the BORROWER's public profile (KNOWN-ISSUES #7 closed), and the old
// /lender/profile/:address route 307-redirects to it (next.config.mjs).
test("LEN-07b: borrower chip routes to the borrower's public profile", async ({
  page,
}) => {
  await gotoAligned(page, ALL_MARKETS)
  await ensureConnected(page, account)
  await readOtherMarketsCounts(page)

  const address = await step(page, "open the first borrower chip", async () => {
    const link = page
      .locator('#self-onboard a[href^="/profile/borrower/"]')
      .first()
    const href = (await link.getAttribute("href"))!
    await link.click()
    await page.waitForURL(/\/profile\/borrower\//, { timeout: 30_000 })
    return href.match(/\/profile\/borrower\/(0x[0-9a-f]{40})/i)![1]
  })

  await step(page, "the page shows THAT borrower, not ourselves", async () => {
    await expect(page.getByText("Overall Info").first()).toBeVisible({
      timeout: 60_000,
    })
    // The old defect rendered the CONNECTED lender's own profile; the fixed
    // page is the borrower's public profile, whose Overall Info block lists
    // the clicked borrower's trimmed address (utils/formatters.ts trimAddress).
    const trimmed = `${address.slice(0, 6)}...${address.slice(-4)}`
    await expect(
      page
        .getByText(
          new RegExp(`${address.slice(0, 6)}\\.\\.\\.${address.slice(-4)}`, "i"),
        )
        .first(),
    ).toBeVisible({ timeout: 60_000 })
    attachAgreement("LEN-07b borrower identity", { address, trimmed })
  })

  await step(page, "legacy route redirects to the public profile", async () => {
    await page.goto(`/lender/profile/${address}`)
    await page.waitForURL(new RegExp(`/profile/borrower/${address}`, "i"), {
      timeout: 30_000,
    })
    attachAgreement("LEN-07b legacy redirect", { landedOn: page.url() })
  })
})

test("LEN-08: term column across open, fixed and periodic markets", async ({
  page,
}) => {
  test.setTimeout(300_000)
  // KNOWN-ISSUES #1: on head the wallet-gated /lender/my-markets deep link
  // deterministically bounces to /lender while wagmi reconnects; pre-seed the
  // connector state so hydration starts connected (the documented workaround).
  await connectAs(page, 0)
  const catalogue = await fetchAllMarkets()
  const [openM, perM, fixM] = [
    pins.markets.openTerm,
    pins.markets.periodic,
    pinnedMarkets.fixedTerm,
  ].map((id) => catalogue.find((m) => m.id === id.toLowerCase()))
  expect(
    openM && perM && fixM,
    "pinned markets exist in the catalogue",
  ).toBeTruthy()

  // Self-sufficiency: my-markets lists only markets the lender holds a position in. The
  // periodic-market deposit used to be left behind by the periodic suite, which now runs
  // LAST (its LEN-35 advances the chain to the fixed-term maturity — KNOWN-ISSUES H1), so
  // seed it chain-side here when absent. 6,000 DAI clears the pinned market's minimum.
  for (const m of [openM!, perM!, fixM!]) {
    if ((await marketBalance(m.id as Address, account)) === 0n) {
      const amount = 6_000n * 10n ** 18n
      faucet(account, amount, m.asset.address)
      await approve(account, m.asset.address as Address, m.id as Address, amount)
      await depositUpTo(account, m.id as Address, amount)
    }
  }

  await step(page, "my-markets: open-term row shows 'Open Term'", async () => {
    await gotoAligned(page, MY_MARKETS)
    await ensureConnected(page, account)
    const row = rowsIn(page, "deposited").filter({ hasText: openM!.name })
    await expect(row).toHaveCount(1, { timeout: 60_000 })
    await expect(cellIn(row, "term")).toHaveText("Open Term")
  })

  await step(
    page,
    "my-markets: periodic row shows the window state",
    async () => {
      const row = rowsIn(page, "deposited").filter({ hasText: perM!.name })
      await expect(row).toHaveCount(1, { timeout: 60_000 })
      const termText = (await cellIn(row, "term").innerText()).trim()
      const now = await blockTimestamp()
      const timing = periodicTiming(perM!.hooksConfig!, now)
      attachAgreement("LEN-08 periodic term cell", { termText, now, timing })
      if (timing.secondsToBoundary < 30) {
        // Too close to a window boundary to pin the state; either is correct.
        expect(termText).toMatch(/^(Window open|Opens in .+)$/)
      } else if (timing.isOpen) {
        expect(termText).toBe("Window open")
      } else {
        expect(termText).toMatch(/^Opens in /)
        const shown = parseCompactDurationSeconds(termText)
        const expected = timing.nextWindowStart - now
        // The chip rounds to its largest unit; allow one rounding step + read skew.
        expect(
          Math.abs(shown - expected),
          `countdown "${termText}" vs ${expected}s to next window`,
        ).toBeLessThanOrEqual(Math.max(90, shown * 0.51))
      }
    },
  )

  await step(
    page,
    "my-markets: fixed-term row shows its maturity",
    async () => {
      // Fork-state note (not an upstream change): the pinned fixed-term market
      // is now one of account #0's positions, so it renders in the My Markets
      // deposited table rather than the explorer; read the term cell there.
      const row = rowsIn(page, "deposited").filter({ hasText: fixM!.name })
      await expect(row).toHaveCount(1, { timeout: 60_000 })
      const termText = (await cellIn(row, "term").innerText()).trim()
      const now = await blockTimestamp()
      const end = fixM!.hooksConfig!.fixedTermEndTime
      const daysLeft = Math.abs((end - now) / 86400)
      attachAgreement("LEN-08 fixed term cell", {
        termText,
        end,
        now,
        daysLeft,
      })
      if (daysLeft > 7.05) {
        expect(termText).toBe(formatUtcMaturityDate(end))
      } else if (daysLeft > 6.95) {
        // humanize-duration rounding straddles the date/duration cutover here.
        expect(termText).toMatch(
          new RegExp(`^(${formatUtcMaturityDate(end)}|.+ (left|ago))$`),
        )
      } else {
        expect(termText).toMatch(/ (left|ago)$/)
      }
    },
  )
})

test("LEN-09: asset filter contents (observational)", async ({ page }) => {
  await gotoAligned(page, ALL_MARKETS)
  await ensureConnected(page, account)
  await readOtherMarketsCounts(page)

  await step(page, "read the asset filter options", async () => {
    const menu = await openFilterMenu(page, "Asset")
    const options = (await menu.locator("label").allInnerTexts()).map((t) =>
      t.trim(),
    )
    await closeFilterMenu(page)

    expect(options.length, "asset filter is populated").toBeGreaterThan(0)

    // The options mirror the SDK's getAllTokensWithMarkets (subgraph `tokens`,
    // default page of 100, deduplicated by symbol on testnets).
    const { tokens } = await gql<{ tokens: { symbol: string }[] }>(
      `{ tokens { symbol } }`,
    )
    const expectedSymbols: string[] = []
    for (const tkn of tokens)
      if (!expectedSymbols.includes(tkn.symbol))
        expectedSymbols.push(tkn.symbol)
    expect(new Set(options)).toEqual(new Set(expectedSymbols))

    // Record what shows: underlying assets vs wrapped debt tokens (product TBD).
    const markets = await fetchAllMarkets()
    const underlyingSymbols = new Set(markets.map((m) => m.asset.symbol))
    const wrappedDebtTokens = options.filter((o) => o.startsWith("v-"))
    const notAnUnderlying = options.filter((o) => !underlyingSymbols.has(o))
    expect(
      options.filter((o) => underlyingSymbols.has(o)).length,
      "underlying assets are listed",
    ).toBeGreaterThan(0)
    attachAgreement("LEN-09 observed asset filter contents", {
      options,
      wrappedDebtTokens,
      notUnderlyingOfAnyMarket: notAnUnderlying,
      note: "Wrapped debt tokens (v-*) and market-token symbols DO appear in the asset filter on this build; whether they should is the open product decision the runsheet flags.",
    })
  })
})

test("LEN-10: market detail renders every section; no column overlap", async ({
  page,
}) => {
  test.setTimeout(420_000)
  const market = pins.markets.openTerm.toLowerCase()

  // KNOWN-ISSUES #1: the later my-markets steps deep-link a wallet-gated
  // route; pre-seed the connector so hydration starts connected.
  await connectAs(page, 0)
  await gotoAligned(page, `/lender/market/${market}`)
  await ensureConnected(page, account)

  const sections: Array<{ nav: RegExp; probe: () => Promise<void> }> = [
    {
      nav: /^Deposit & Withdraw$/,
      probe: async () => {
        await expect(
          page.getByText("Available To Deposit").first(),
        ).toBeVisible({
          timeout: 60_000,
        })
        await expect(page.getByTestId("lender-available-withdraw")).toBeVisible(
          {
            timeout: 60_000,
          },
        )
      },
    },
    {
      nav: /^Status and Details$/,
      probe: async () => {
        await expect(page.getByText("Parameters", { exact: true })).toBeVisible(
          {
            timeout: 60_000,
          },
        )
        await expect(
          page.getByText("Market Address", { exact: true }),
        ).toBeVisible()
      },
    },
    {
      nav: /^Withdrawal Requests/,
      probe: async () => {
        await expect(page.getByTestId("withdrawals-ongoing")).toBeVisible({
          timeout: 60_000,
        })
        for (const label of ["Ongoing", "Claimable", "Outstanding"])
          await expect(
            page.getByText(label, { exact: true }).first(),
          ).toBeVisible()
      },
    },
    {
      nav: /^About Borrower$/,
      probe: async () => {
        await expect(page.getByText("Overall Info").first()).toBeVisible({
          timeout: 60_000,
        })
        await expect(
          page.getByText("Profile Verification").first(),
        ).toBeVisible()
        // First visit pops the "How Wildcat checks this profile" explainer,
        // which blocks the sidebar; acknowledge it before moving on.
        const explainer = page.getByRole("button", { name: "I understand" })
        if (await explainer.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await explainer.click()
          await expect(explainer).toBeHidden()
        }
      },
    },
    {
      nav: /^Market History$/,
      probe: async () => {
        // The section shell always renders (search box + CSV export, upstream
        // 5ec10f25/f38973e9); the records TABLE needs the subgraph schema that
        // SDK >=3.2.5-beta's getMarketEvents queries (WithdrawalExecution
        // .eventIndex etc. — upstream eab09477 moved the app to 3.2.7-beta).
        // The fork subgraph is pinned at 2.5.9, which predates it: the whole
        // records query errors and the section shows its empty state. Gate the
        // table asserts on the harness schema so they re-arm automatically
        // when the fork subgraph is upgraded. See KNOWN-ISSUES #9.
        await expect(page.getByPlaceholder("Search by ID")).toBeVisible({
          timeout: 60_000,
        })
        await expect(
          page.getByRole("button", { name: "Export CSV" }),
        ).toBeVisible()
        const schemaServesRecords = await gql(
          `{ withdrawalExecutions(first: 1, where: { eventIndex_gte: 0 }) { id } }`,
        ).then(
          () => true,
          () => false,
        )
        if (schemaServesRecords) {
          await expect(page.getByText("Transaction ID").first()).toBeVisible({
            timeout: 60_000,
          })
          await expect(
            page.getByText("Event", { exact: true }).first(),
          ).toBeVisible()
        } else {
          await expect(
            page.getByText("No matching recent events").first(),
          ).toBeVisible({ timeout: 60_000 })
        }
        attachAgreement("LEN-10 market history", {
          schemaServesRecords,
          note: schemaServesRecords
            ? "records table asserted"
            : "fork subgraph 2.5.9 cannot serve SDK 3.2.7-beta getMarketEvents (no WithdrawalExecution.eventIndex); empty state asserted instead — KNOWN-ISSUES #9",
        })
      },
    },
    {
      nav: /^Wrapped Debt Token/,
      probe: async () => {
        await expect(
          page.getByText(/No wrapper deployed|Wrap|Unwrap/).first(),
        ).toBeVisible({ timeout: 60_000 })
      },
    },
  ]

  for (const s of sections) {
    await step(page, `section ${s.nav}`, async () => {
      await page.getByRole("button", { name: s.nav }).click()
      await s.probe()
    })
  }

  await step(page, "record raw i18n keys leaking into the page", async () => {
    // Known defect on this build: MarketActions renders the untranslated key
    // "lenderMarketDetails.transactions.deposit.rows.walletBalance".
    await page.getByRole("button", { name: /^Deposit & Withdraw$/ }).click()
    await expect(page.getByText("Available To Deposit").first()).toBeVisible({
      timeout: 60_000,
    })
    const body = await page.locator("body").innerText()
    const rawKeys = [
      ...new Set(
        [...body.matchAll(/\b[a-z][a-zA-Z]+(?:\.[a-z][a-zA-Z]+){3,}\b/g)].map(
          (m) => m[0],
        ),
      ),
    ]
    attachAgreement("LEN-10 raw i18n keys observed", { rawKeys })
    // Known defect on this build: the lenderMarketDetails.transactions.*
    // namespace is missing from en.json and renders raw (walletBalance,
    // minimumDeposit, withdraw.rows.cycle, …). Fail only on new families.
    const unexpected = rawKeys.filter(
      (k) => !k.startsWith("lenderMarketDetails.transactions."),
    )
    expect(
      unexpected,
      "no untranslated keys beyond the known lenderMarketDetails.transactions.* family",
    ).toEqual([])
  })

  await step(page, "list tables: adjacent cells never overlap", async () => {
    await gotoAligned(page, MY_MARKETS)
    await ensureConnected(page, account)
    await expect(rowsIn(page, "deposited").first()).toBeVisible({
      timeout: 60_000,
    })
    const overlaps = await page.evaluate(() => {
      const bad: string[] = []
      document
        .querySelectorAll("#deposited .MuiDataGrid-row")
        .forEach((row, ri) => {
          const cells = Array.from(row.querySelectorAll(".MuiDataGrid-cell"))
            .map((c) => ({
              field: c.getAttribute("data-field"),
              rect: c.getBoundingClientRect(),
            }))
            .sort((a, b) => a.rect.left - b.rect.left)
          for (let i = 1; i < cells.length; i += 1) {
            if (cells[i].rect.left < cells[i - 1].rect.right - 1)
              bad.push(
                `row ${ri}: ${cells[i - 1].field} overlaps ${cells[i].field}`,
              )
          }
        })
      return bad
    })
    expect(overlaps, "Remaining/Asset and neighbours never overlap").toEqual([])
  })

  await step(page, "number formatting in Remaining / Total Debt", async () => {
    const numberCells = [
      ...(await rowsIn(page, "deposited")
        .locator('.MuiDataGrid-cell[data-field="capacityLeft"]')
        .allInnerTexts()),
      ...(await rowsIn(page, "deposited")
        .locator('.MuiDataGrid-cell[data-field="debt"]')
        .allInnerTexts()),
    ].map((t) => t.trim())
    for (const text of numberCells) {
      expect(text, "grouped, dot-decimal token amount").toMatch(
        /^\d{1,3}(,\d{3})*(\.\d+)?$/,
      )
    }
    attachAgreement("LEN-10 sampled amount cells", { numberCells })
  })

  await step(page, "longest-name market detail still renders", async () => {
    const markets = await fetchAllMarkets()
    const longest = markets
      .filter((m) => !m.isClosed)
      .reduce((a, b) => (b.name.length > a.name.length ? b : a))
    await gotoAligned(page, `/lender/market/${longest.id}`)
    await ensureConnected(page, account)
    await expect(page.getByText(longest.name).first()).toBeVisible({
      timeout: 90_000,
    })
    await expect(page.getByText("Parameters", { exact: true })).toBeVisible({
      timeout: 90_000,
    })
    attachAgreement("LEN-10 long name market", {
      market: longest.id,
      name: longest.name,
      nameLength: longest.name.length,
    })
  })
})

test.describe("LEN-11: links and copy on Status & Details", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] })

  test("LEN-11: copy buttons and explorer links for the four addresses", async ({
    page,
  }) => {
    test.setTimeout(300_000)
    const market = pins.markets.openTerm.toLowerCase()
    const { market: m } = await gql<{
      market: { id: string; asset: { address: string }; hooks: { id: string } }
    }>(`{ market(id: "${market}") { id asset { address } hooks { id } } }`)

    await gotoAligned(page, `/lender/market/${market}`)
    await ensureConnected(page, account)
    // A click during hydration is silently swallowed (observed on a fresh dev server: the
    // page stayed on Deposit & Withdraw for the full wait) — re-click until the section
    // actually switches.
    await expect(async () => {
      await page.getByRole("button", { name: /^Status and Details$/ }).click()
      await expect(page.getByText("Parameters", { exact: true })).toBeVisible({
        timeout: 10_000,
      })
    }).toPass({ timeout: 90_000 })

    const cases = [
      { title: "Market Address", address: m.id, linkKind: "address" },
      {
        title: "Underlying Asset",
        address: m.asset.address,
        linkKind: "token",
      },
      // The market token IS the market contract; its row links to the token view.
      { title: "Market Token", address: m.id, linkKind: "token" },
      {
        title: "Policy (Hook Instance) Address",
        address: m.hooks.id,
        linkKind: "address",
      },
    ] as const

    for (const c of cases) {
      await step(page, `${c.title}: copy + explorer link`, async () => {
        const row = page
          .getByTestId("parameters-item")
          .filter({ has: page.getByText(c.title, { exact: true }) })
        await expect(row).toHaveCount(1)

        await row.getByTestId("copy-button").click()
        const copied = await page.evaluate(() => navigator.clipboard.readText())
        expect(copied.toLowerCase(), `${c.title} copied value`).toBe(
          c.address.toLowerCase(),
        )

        const href = await row.getByTestId("link-button").getAttribute("href")
        expect(href?.toLowerCase(), `${c.title} explorer href`).toBe(
          `https://sepolia.etherscan.io/${c.linkKind}/${c.address}`.toLowerCase(),
        )
        attachAgreement(`LEN-11 ${c.title}`, {
          copied,
          href,
          expected: c.address,
        })
      })
    }

    // The runsheet's 'add market token' / 'add wrapped token' MetaMask flows
    // cannot run against the Local Anvil connector (no wallet UI); recorded as
    // out of scope for this automated case.
    attachAgreement("LEN-11 coverage note", {
      notAutomated: [
        "add market token to MetaMask",
        "add wrapped token to MetaMask",
      ],
      reason:
        "harness wallet is the Local Anvil connector; wallet_watchAsset UI does not exist",
    })
  })
})

test("LEN-12: profile entry matches the toggled side", async ({ page }) => {
  test.setTimeout(300_000)
  await gotoAligned(page, "/lender")
  await ensureConnected(page, account)

  const shortAddress = /0xf39F.*2266/i
  const chip = page.getByRole("button", { name: shortAddress })
  const walletDialog = page
    .getByRole("dialog")
    .filter({ hasText: "Connected Via" })
  const readWalletDialog = async () => {
    // An auto-opened modal aria-hides the header, so the chip's role query is blind while one
    // is up and a bare click hangs for the whole test (the LEN-12 board failure: the borrower
    // ToU prompt opened ~0.3 s after the toggle, right after the dismiss probe ran). Clear
    // whatever is up, click, and retry — the prompt can re-open between the two.
    await expect(async () => {
      await dismissBlockingDialogs(page, walletDialog)
      if (!(await walletDialog.isVisible().catch(() => false)))
        await chip.click({ timeout: 10_000 })
      await expect(walletDialog).toBeVisible({ timeout: 10_000 })
    }).toPass({ timeout: 120_000 })
    const text = await walletDialog.innerText()
    await page.keyboard.press("Escape")
    await expect(walletDialog).toBeHidden()
    return text
  }

  const lenderDialog = await step(
    page,
    "lender side: wallet dialog",
    async () => {
      const text = await readWalletDialog()
      // Never the other side's entry while toggled to lender.
      expect(text).not.toContain("View Borrower Profile")
      return text
    },
  )

  await step(page, "toggle to the borrower side", async () => {
    await page.locator(".MuiSwitch-root input").first().click()
    await page.waitForURL(/\/borrower/, { timeout: 30_000 })
    await dismissTouDialogIfPresent(page)
  })

  const borrowerDialog = await step(
    page,
    "borrower side: wallet dialog",
    async () => {
      const text = await readWalletDialog()
      // Never the other side's entry while toggled to borrower.
      expect(text).not.toContain("View Lender Profile")
      return text
    },
  )

  await step(page, "toggle back to the lender side", async () => {
    await page.locator(".MuiSwitch-root input").first().click()
    await page.waitForURL(/\/lender/, { timeout: 30_000 })
  })

  attachAgreement("LEN-12 observed profile entries", {
    lenderDialog,
    borrowerDialog,
    note: "On this build+env the dialog shows no profile entry on either side for anvil #0: the lender entry is gated behind NEXT_PUBLIC_ENABLE_ANALYTICS_UI (unset in the fork env) and the borrower entry requires a registered borrower. The assertions above pin the invariant that the wrong side's entry never appears.",
  })
})
