import {
  fetchPositions,
  gotoAligned,
  readAccordionCount,
  readOtherMarketsCounts,
  rowsIn,
  searchField,
} from "./helpers"
import { ensureTouSigned } from "./lib"
import { ANVIL_ACCOUNTS, pins, type Address } from "../lib/env"
import { connectAs, ensureConnected } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * Lender portfolio UAT cases (LEN-32), read-only.
 * Oracle: the fork subgraph. No transactions, no time travel.
 */

const account = ANVIL_ACCOUNTS[0] as Address
const ALL_MARKETS = "/lender/all-markets"
const MY_MARKETS = "/lender/my-markets"

// After a harness reset the app DB snapshot holds NO ToU acceptance for our accounts, and every
// /lender page redirects to the agreement gate ("Are Loading..." forever from a test's viewpoint).
// Make the suite self-sufficient instead of depending on agreements.spec.ts having run first.
test("setup: current ToU acceptance for the reading account", async ({
  page,
}) => {
  await ensureTouSigned(page, account, pins.markets.openTerm)
})

test("LEN-32: positions vs explorer separation; withdrawal indicators", async ({
  page,
}) => {
  test.setTimeout(420_000)
  // KNOWN-ISSUES #1: on head the wallet-gated /lender/my-markets deep link
  // deterministically bounces to /lender while wagmi reconnects; pre-seed the
  // connector state so hydration starts connected (the documented workaround).
  await connectAs(page, 0)
  const positions = await fetchPositions(account)
  expect(
    positions.map((p) => p.marketId),
    "account #0 holds its pinned open-term position (seeded by the withdrawal specs)",
  ).toContain(pins.markets.openTerm.toLowerCase())
  const active = positions.filter((p) => !p.isClosed)
  const terminated = positions.filter((p) => p.isClosed)

  await step(
    page,
    "positions page lists exactly the subgraph positions",
    async () => {
      await gotoAligned(page, MY_MARKETS)
      await ensureConnected(page, account)
      await expect
        .poll(async () => readAccordionCount(page, "deposited"), {
          timeout: 90_000,
        })
        .toBe(active.length)
      const shownNames = (
        await rowsIn(page, "deposited")
          .locator('.MuiDataGrid-cell[data-field="name"]')
          .allInnerTexts()
      ).map((t) => t.split("\n")[0].trim())
      for (const p of active)
        expect(shownNames, "every active position is listed").toContainEqual(
          p.marketName,
        )
      expect(shownNames, "no extra rows beyond positions").toHaveLength(
        active.length,
      )
      attachAgreement("LEN-32 positions", { positions, shownNames })
    },
  )

  await step(page, "explorer excludes every position market", async () => {
    await gotoAligned(page, ALL_MARKETS)
    await ensureConnected(page, account)
    await readOtherMarketsCounts(page)
    for (const p of positions) {
      await searchField(page).fill(p.marketId)
      const counts = await readOtherMarketsCounts(page)
      expect(
        counts,
        `position market ${p.marketName} (${p.marketId}) must not appear in Other Markets`,
      ).toEqual({ self: 0, manual: 0, terminated: 0 })
    }
    await searchField(page).fill("")
  })

  await step(
    page,
    "open-withdrawal indicator on the position market",
    async () => {
      const market = pins.markets.openTerm.toLowerCase()
      const openExpiries = await subgraph.openWithdrawalExpiries(
        market,
        account,
      )
      await gotoAligned(page, `/lender/market/${market}`)
      await ensureConnected(page, account)

      const requestsButton = page.getByRole("button", {
        name: /^Withdrawal Requests/,
      })
      await expect(requestsButton).toBeVisible({ timeout: 60_000 })
      const badgeText = (await requestsButton.innerText()).replace(
        /Withdrawal Requests/,
        "",
      )
      const badge = Number(badgeText.match(/(\d+)/)?.[1] ?? "0")

      await requestsButton.click()
      await expect(page.getByTestId("withdrawals-ongoing")).toBeVisible({
        timeout: 60_000,
      })
      const body = await page.locator("body").innerText()
      const start = body.indexOf("Open Withdrawals")
      const sectionText = start >= 0 ? body.slice(start, start + 400) : ""

      test.skip(
        openExpiries.length === 0,
        "no open withdrawal batches at run time — indicator not exercisable (run after a queueing suite)",
      )
      if (openExpiries.length > 0) {
        expect(
          badge,
          `sidebar badge reflects ${openExpiries.length} open withdrawal batch(es)`,
        ).toBeGreaterThanOrEqual(1)
      }
      attachAgreement("LEN-32 withdrawal indicators (observed)", {
        market,
        openBatchExpiries: openExpiries,
        sidebarBadge: badge,
        sectionPreview: sectionText.slice(0, 400),
        note: "The market-list tables on this build carry no outstanding-withdrawal tag column; the only withdrawal indicator is the count badge on the market page's 'Withdrawal Requests' sidebar entry (ongoing+claimable+outstanding). Recorded per runsheet.",
      })
    },
  )

  await step(page, "terminated positions (observational)", async () => {
    attachAgreement("LEN-32 terminated positions", {
      terminated,
      note:
        terminated.length === 0
          ? "account #0 holds no terminated-market positions on this fork; the terminated bucket separation is covered by LEN-06."
          : "terminated positions exist; membership asserted via LEN-06 section counts.",
    })
  })
})
