/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { parseUnits } from "viem"

import {
  account0,
  ensureTouSigned,
  resolveFixedTermFixture,
  type FixedTermFixture,
} from "./lib"
import * as chain from "../lib/chain"
import { faucet, syncSubgraph } from "../lib/env"
import { ensureConnected, gotoMarket } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import { expect, test } from "../lib/test"

/**
 * UAT 5 Lender Flows — the fixed-term lock BEFORE maturity (LEN-35).
 *
 * Fixed term is a V2 hooks template. The lender market page renders the pre-maturity state and
 * offers no withdraw action; it renders no explanation copy (KNOWN-ISSUES M10). The post-maturity
 * half — which advances chain time PAST the maturity, permanently for the fork lifetime — lives in
 * e2e/zz-final-phase/fixed-term-maturity.spec.ts so that it sorts last on the board.
 */
test.describe.serial("lender flows: fixed term (LEN-35)", () => {
  let fixed: FixedTermFixture | null = null

  test("LEN-35: before maturity, withdrawal requests are blocked with maturity messaging", async ({
    page,
  }) => {
    const now = await chain.blockTimestamp()
    // The fixture is CHOSEN, not pinned: `resolveFixedTermFixture` prefers a board-deployed
    // candidate (MKT-04, page-3 suite) and falls back to `pins.markets.fixedTerm` when this board
    // has not run one yet.
    fixed = await resolveFixedTermFixture(now)
    test.skip(
      !fixed,
      `no open fixed-term market maturing more than an hour from the chain head (${now}); pins.markets.fixedTerm has matured or closed`,
    )
    const end = fixed!.fixedTermEndTime
    expect(end, "market has a fixed term").toBeGreaterThan(now)

    // ToU gates every /lender page; wall-clock ceremony BEFORE gotoMarket installs the chain clock.
    await ensureTouSigned(page, account0, fixed!.market)

    const amount = fixed!.minimumDeposit + parseUnits("1", fixed!.decimals)
    if ((await chain.marketBalance(fixed!.market, account0)) === 0n) {
      faucet(account0, amount, fixed!.asset)
      await chain.approve(account0, fixed!.asset, fixed!.market, amount)
      await chain.depositUpTo(account0, fixed!.market, amount)
      await syncSubgraph()
    }
    expect(
      await chain.marketBalance(fixed!.market, account0),
      "lender holds a position, so the lock is the only thing blocking a request",
    ).toBeGreaterThan(0n)

    await gotoMarket(page, fixed!.market)
    await ensureConnected(page, account0)
    await step(page, "locked state offers no withdraw action", async () => {
      await expect(
        page.getByText("Available For Withdraw Requests").first(),
        "the withdraw surface rendered",
      ).toBeVisible({ timeout: 60_000 })
      await expect(
        page.getByRole("button", { name: /^withdraw$/i }),
        "no withdraw action before maturity",
      ).toHaveCount(0)
      // KNOWN-ISSUES M10: MarketActions mounts WithdrawModal only when withdrawalAvailability is
      // Ready, so the whole control is absent and nothing explains why. Asserted as the real
      // rendering; a fix that adds reason copy should update this expectation.
      await expect(
        page.getByText("Withdrawal requests open when the fixed term ends."),
        "main renders no pre-maturity reason copy (KNOWN-ISSUES M10)",
      ).toHaveCount(0)
    })
    attachAgreement("LEN-35 before maturity", {
      market: fixed!.market,
      name: fixed!.name,
      fixtureSource: fixed!.source,
      fixedTermEndTime: end,
      chainNow: now,
      hoursOfTermRemaining: Math.round(((end - now) / 3_600) * 10) / 10,
      withdrawActionOffered: false,
      reasonCopyRendered: false,
      transitionRunsIn: "e2e/zz-final-phase/fixed-term-maturity.spec.ts",
    })
  })
})
