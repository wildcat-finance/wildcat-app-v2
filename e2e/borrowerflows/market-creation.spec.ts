/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { parseUnits, zeroAddress } from "viem"

import {
  BORROWER_LEGAL_NAME,
  borrower,
  borrowerMarketIds,
  borrowerTouState,
  CHAIN_ID,
  chooseMla,
  clickNext,
  closeSuccessDialog,
  coLender,
  controlIn,
  deployAndAwait,
  deployButton,
  ensureBorrowerTouSigned,
  erc20Meta,
  fillBasicStep,
  fillField,
  fillFinancialStep,
  fillPolicyStep,
  fixedTermDateDigits,
  getCode,
  gotoConfirmation,
  gotoCreateMarket,
  hasOpenAccessProvider,
  hooksInstance,
  nextButton,
  readNewMarket,
  reviewValue,
  seedBorrowerProfile,
  selectField,
  signMlaRefusal,
  signMlaThroughModal,
  stranger,
  subgraphMarket,
  walkToConfirmation,
  wrapperForMarket,
  type CreateMarketConfig,
  type DeployOutcome,
  ensureBorrowerRegistered,
} from "./helpers"
import * as chain from "../lib/chain"
import {
  ALLOW_CHAIN_DRIFT,
  APP_URL,
  faucet,
  FORK_RPC,
  pins,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import { connectAs, ensureConnected } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * UAT 3 Market Creation (MKT-01…MKT-24) — borrower create-market flow on the local fork.
 * Runsheet: wildcat-uat/runsheet/uat_3 Market Creation.tsv.
 *
 * IMPORTANT — never run this suite concurrently with ANY other suite:
 *   - it deploys real markets/policies on the shared fork (global market counts change, and the
 *     lender discovery oracles recompute from the subgraph, which tolerates new markets but not
 *     mid-flight mutation);
 *   - it signs wall-clock ceremonies (ToU, MLA, MLA refusal) whose APIs bound timeSigned against
 *     the SERVER clock, so nothing here installs the chain-aligned browser clock;
 *   - the fixed-term/periodic deployments derive their dates from max(wall, chain) time, so run
 *     it BEFORE suites that time travel months ahead (or after dev:fork:reset).
 *
 * Borrower setup (discovered from src/app/[locale]/borrower + hooks):
 *   1. On-chain: anvil #3 is already registered as a borrower in the ArchController (pin-time
 *      fixture via MockArchControllerOwner) — asserted in setup.
 *   2. DB: a `Borrower` profile row must exist (borrower-party ToU signing reads the organization
 *      name from it; the MLA fill-in reads legal name / jurisdiction / entity kind) — seeded here.
 *   3. ToU: the create-market page hard-blocks until /api/sla?party=Borrower is signedCurrent;
 *      a registered borrower with NO pending invitation signs first acceptance on
 *      /borrower/agreement ("Sign Terms of Use") — done here for real (personal_sign via anvil).
 *   4. No BorrowerInvitation row is needed (HEAD /api/invite → 404 routes the agreement page to
 *      the first-acceptance path, not the invitation dead end).
 *
 * On testnet chains the deploy is staged: 1/N mock-token deploy (the chosen asset's name/symbol
 * are re-minted as a fresh mock token), then market, then optional wrapper, then the MLA upload.
 */

const stamp = Date.now().toString(36)

test.describe.serial("borrower flows: market creation (MKT-01…24)", () => {
  // ------------------------------------------------------------------------------------------
  // RUNS IN BOTH VARIANTS (2026-09-07). It used to be v2.5-only as a block, for two reasons that
  // no longer hold together:
  //
  //   * step shape — the policy step has ONE "Market Type" select and it carries the term
  //     itself (Open Term Loan / Fixed Term Loan); there is no separate implementation axis and
  //     no "Market Term" field. That shape is handled INSIDE the form helpers
  //     (helpers.fillPolicyStep); every label this suite addresses exists verbatim in the
  //     locale bundle.
  //   * the market page could not render what the fork deployed — `/api/market/get` asked the
  //     PRODUCTION subgraph (KNOWN-ISSUES M7). The route now goes through the env-aware
  //     `getServerSubgraphClient`, so a fork-created market resolves on the harness.
  //
  // Notable per-case differences from v2.5 are below; the rest run for real against main.
  // Revolving and periodic markets (formerly MKT-05/06/07/09) do not exist on main and were
  // removed (W1 task 5); they still run on v2.5 (feat/automated-tests-2.5).
  //   MKT-04  fixed-term deploy — main's wizard deploys fixed-term markets for real; M5's crash
  //           (`invalid BigNumber value`, an undefined `fixedTermEndTime`) needs a maturity that
  //           never reached form state, which only happens via M8's template latch (new policy +
  //           Open Term Loan). The probe at the bottom of this file reproduces that mechanism
  //           without a browser, mainflows/market-creation-order.spec.ts MKT-M01 drives the latch
  //           itself, and mainflows/v2-protocol.spec.ts V2P-01 mines the same fixed-term deploy
  //           through the SDK to prove the chain and the subgraph are not the problem.
  //   MKT-22/23        the market-side wrapper oracle is main's V2.1 wrapper factory
  //                    (`wrapperForMarket`), not v2.5's market-level accessor; MKT-23 asserts
  //                    what main actually renders — no borrower-side deploy CTA, since main
  //                    hardcodes `canCreateWrapper={false}` there.
  //
  // See e2e/COVERAGE.md.
  // Full-wizard tests (walk + wall-clock signing + deploy + chain/subgraph/UI oracles) proved to
  // need more than 300s on the fork (MKT-01 deployed successfully and then ran out of budget).
  test.setTimeout(540_000)

  let asset: { address: string; name: string; symbol: string }
  const financialDefaults = {
    capacity: "1000000",
    apr: "10",
    penalty: "10",
    reserve: "20",
    grace: "1",
    cycle: "1",
    minimumDeposit: "100",
  }

  const policyA = `E2E Pol A ${stamp}` // self-onboarding, open term (MKT-01/03)
  const policyC = `E2E Pol C ${stamp}` // allowlist (MKT-13)
  const policyD = `E2E Pol D ${stamp}` // access switcheroo (MKT-14)
  const policyE = `E2E Pol E ${stamp}` // MLA + wrapper (MKT-16)

  // Cross-test state (serial suite).
  let d1: DeployOutcome & { marketName: string; namePrefix: string }
  let d2: DeployOutcome & { marketName: string }
  const reviewD1: Record<string, string> = {}
  let fixedTermExpectedUnix = 0
  let d13: DeployOutcome
  let d16: DeployOutcome & { namePrefix: string; symbolPrefix: string }
  let d20: DeployOutcome & { marketName: string }
  const indexingLags: Record<string, number> = {}

  const baseCfg = (
    overrides: Partial<CreateMarketConfig> &
      Pick<CreateMarketConfig, "policy" | "namePrefix" | "symbolPrefix">,
  ): CreateMarketConfig => ({
    implementation: "Standard",
    term: "Open Term Loan",
    access: "Lender Self-Onboarding",
    asset,
    financial: { ...financialDefaults },
    ...overrides,
  })

  const revealPolicyRow = async (
    page: import("@playwright/test").Page,
    name: string,
  ) => {
    // The policies grid is virtualized and NOT creation-ordered, and its query can be served from
    // a cache that predates subgraph indexing — filter via the section's own "Search By Name"
    // input (deterministic regardless of accumulation), reloading between attempts.
    const row = page.getByRole("row").filter({ hasText: name })
    await expect(async () => {
      await page.goto("/borrower")
      await ensureConnected(page, borrower)
      await page.getByText("Policies", { exact: true }).first().click()
      await page.getByPlaceholder("Search By Name").fill(name)
      await expect(row).toBeVisible({ timeout: 10_000 })
    }).toPass({ timeout: 120_000 })
    return row
  }

  test("setup: fixtures — chain time, funds, borrower profile row, registration", async () => {
    // Rerun-accumulation ceiling: beyond this, virtualized lists and the paged subgraph queries
    // start missing this run's entities. Fail loudly instead of flaking (review finding 14).
    //
    // 40 is evidence-backed and was briefly (and wrongly) raised to 80 on 2026-09-07. The
    // reasoning for the raise was that `borrowerMarkets` pages at `first: 100`, so 40 looked
    // conservative — but the binding constraint is not the query, it is MKT-21: the borrower
    // OVERVIEW must show the market just deployed, and at 68 markets it no longer did (measured;
    // 120 s of polling with reloads). Restored, with the cause named rather than the symptom.
    //
    // What made this bite: borrower #3 is no longer this suite's alone. mainflows/
    // v2-protocol.spec.ts deploys 8 fixtures under the same borrower every run, so a board now
    // adds ~18 markets rather than ~10 and the ceiling arrives in two boards instead of four.
    // The durable fix is a separate borrower for the protocol suite; until then this guard is
    // doing its job when it fires, and the answer is `dev:fork:reset`.
    const existing = await borrowerMarketIds()
    expect(
      existing.length,
      `borrower #3 already owns ${existing.length} markets — run dev:fork:reset before this suite`,
    ).toBeLessThan(40)

    // Wall/chain divergence breaks the wall-clock signing + chain-time deploys pairing.
    await syncChainTimeToWallClock()
    const chainNow = await chain.blockTimestamp()
    const wallNow = Math.floor(Date.now() / 1000)
    expect(
      ALLOW_CHAIN_DRIFT || chainNow - wallNow < 30 * 86_400,
      `chain leads wall clock by ${
        chainNow - wallNow
      }s — run dev:fork:reset, ` +
        `then run this suite before long time-travel suites`,
    ).toBe(true)

    for (const account of [borrower, coLender, stranger]) {
      faucet(account, parseUnits("10", 18))
    }
    await ensureBorrowerRegistered()
    seedBorrowerProfile()

    // The mock asset that every market here uses (the openTerm pin's underlying "DAI").
    const pinned = await subgraph.market(pins.markets.openTerm)
    expect(pinned, "pinned openTerm market on the fork subgraph").not.toBeNull()
    asset = {
      address: pinned!.asset.address,
      name: "Dai Stablecoin",
      symbol: pinned!.asset.symbol,
    }

    // Profile row visible through the app API (needed by ToU + MLA ceremonies).
    const profile = await (
      await fetch(
        `${APP_URL}/api/profiles/${borrower.toLowerCase()}?chainId=${CHAIN_ID}`,
      )
    ).json()
    expect(profile?.profile?.name).toBe(BORROWER_LEGAL_NAME)
    attachAgreement("setup fixtures", {
      borrower,
      chainLeadSeconds: chainNow - wallNow,
      asset,
      touState: await borrowerTouState(),
    })
  })

  test("setup: borrower ToU acceptance (wall-clock personal_sign)", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await ensureBorrowerTouSigned(page)
  })

  test("MKT-01: new policy created through market creation; listed with its access type", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)

    const namePrefix = `E2E MC1 ${stamp}`
    const cfg = baseCfg({
      policy: { kind: "new", name: policyA },
      namePrefix,
      symbolPrefix: "E2EA",
    })

    const before = new Set(await borrowerMarketIds())
    await step(page, "walk the wizard to Confirmation", async () => {
      await walkToConfirmation(page, cfg, "refusal")
    })

    // Capture the review screen for MKT-03 (asserted there).
    // There is no "Market Term" review row: the wizard's single "Market Type" select carries the
    // term itself (Open Term Loan / Fixed Term Loan) and the confirmation screen renders no
    // separate term row — asking for one hangs the reader until the test times out.
    for (const label of [
      "Policy Name",
      "Market Type",
      "Access Control",
      "Market Token Name",
      "Maximum Borrowing Capacity",
      "Base APR",
      "Penalty APR",
      "Reserve Ratio",
      "Grace Period Duration",
      "Withdrawal Cycle Duration",
      "Minimum Deposit",
    ]) {
      reviewD1[label] = await reviewValue(page, label)
    }

    await step(
      page,
      "deploy is locked until the refusal is signed",
      async () => {
        await expect(deployButton(page)).toBeDisabled()
        await signMlaRefusal(page)
      },
    )

    const outcome = await step(page, "deploy the market", () =>
      deployAndAwait(page, before),
    )
    indexingLags["MKT-01"] = outcome.indexingLagMs
    d1 = { ...outcome, marketName: `${namePrefix} ${asset.name}`, namePrefix }
    await closeSuccessDialog(page)

    // Policy exists on the subgraph with the given name and self-onboarding access.
    const instance = (await hooksInstance(d1.hooks))!
    expect(instance, "hooks instance indexed").not.toBeNull()
    expect(instance.name.trim()).toBe(policyA)
    expect(instance.kind).toBe("OpenTerm")
    expect(hasOpenAccessProvider(instance), "self-onboarding provider").toBe(
      true,
    )

    await step(
      page,
      "policy appears on the borrower Policies page",
      async () => {
        await syncSubgraph()
        const row = await revealPolicyRow(page, policyA)
        // VERIFY: PoliciesSection renders "Self-Onboard" for open-access policies.
        await expect(row).toContainText("Self-Onboard")
      },
    )
    attachAgreement("MKT-01 policy", {
      market: d1.market,
      hooks: d1.hooks,
      providers: instance.providers,
    })
  })

  test("MKT-03: every open-term parameter settable; review units and formatting; on-chain agreement", async () => {
    // The parameters were all set through the UI in MKT-01 (same deploy); this test audits the
    // captured review screen plus the three-way page/chain/subgraph agreement.
    expect(Object.keys(reviewD1).length).toBeGreaterThan(0)

    // The review screen renders raw form values rather than localised ones, so the assertions
    // normalise PRESENTATION rather than gate on it:
    //   capacity   `${getValues("maxTotalSupply")} ${symbol}` -> "1000000 DAI", not "1,000,000".
    //   durations  `${getValues(...)} hours` -> "1 hours", not a humanized "1 hour".
    // Asserting the number and the unit (not the punctuation or the plural) keeps the case honest
    // without pinning copy; the exact on-chain values are asserted below and are the real oracle.
    const capacity = reviewD1["Maximum Borrowing Capacity"].replace(/,/g, "")
    expect(capacity).toContain("1000000")
    expect(capacity).toContain(asset.symbol)
    expect(reviewD1["Grace Period Duration"]).toMatch(/^1(\.0+)? hours?$/)
    expect(reviewD1["Withdrawal Cycle Duration"]).toMatch(/^1(\.0+)? hours?$/)
    expect(reviewD1["Base APR"]).toMatch(/^10(\.0+)?%$/)
    expect(reviewD1["Penalty APR"]).toMatch(/^10(\.0+)?%$/)
    expect(reviewD1["Reserve Ratio"]).toMatch(/^20(\.0+)?%$/)
    expect(reviewD1["Minimum Deposit"]).toContain("100")
    // The single "Market Type" row IS the term.
    expect(reviewD1["Market Type"]).toBe("Open Term Loan")
    expect(reviewD1["Access Control"]).toBe("Lender Self-Onboarding")
    expect(reviewD1["Policy Name"]).toBe(policyA)

    // Chain vs configured values (the mock asset re-deploys with 18 decimals on testnet).
    const onChain = await readNewMarket(d1.market)
    expect(onChain.borrower.toLowerCase()).toBe(borrower.toLowerCase())
    expect(onChain.annualInterestBips).toBe(1000n)
    expect(onChain.delinquencyFeeBips).toBe(1000n)
    expect(onChain.reserveRatioBips).toBe(2000n)
    expect(onChain.delinquencyGracePeriod).toBe(3600n)
    expect(onChain.withdrawalBatchDuration).toBe(3600n)
    expect(onChain.maxTotalSupply).toBe(parseUnits("1000000", 18))
    expect(onChain.name).toBe(d1.marketName)

    // Subgraph agreement.
    const row = (await subgraphMarket(d1.market))!
    expect(BigInt(row.annualInterestBips)).toBe(onChain.annualInterestBips)
    expect(BigInt(row.delinquencyFeeBips)).toBe(onChain.delinquencyFeeBips)
    expect(BigInt(row.reserveRatioBips)).toBe(onChain.reserveRatioBips)
    expect(Number(row.delinquencyGracePeriod)).toBe(3600)
    expect(Number(row.withdrawalBatchDuration)).toBe(3600)
    expect(BigInt(row.hooksConfig?.minimumDeposit ?? "0")).toBe(
      parseUnits("100", 18),
    )
    attachAgreement("MKT-03 parameters", {
      review: reviewD1,
      onChain,
      subgraph: row,
    })
  })

  test("MKT-02: existing policy selectable; second market deploys under it", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await syncSubgraph() // the policy dropdown reads the subgraph
    await gotoCreateMarket(page)

    const namePrefix = `E2E MC2 ${stamp}`
    const cfg = baseCfg({
      policy: { kind: "existing", name: new RegExp(policyA) },
      namePrefix,
      symbolPrefix: "E2EB",
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, "refusal")
    // NOTE: the runsheet also asks that pre-2.5/v2 policies of migrated borrowers appear here;
    // anvil #3 is a fresh v2.5 borrower with no legacy policies, so that half is not verifiable
    // on this fork fixture (covered implicitly by the dropdown listing ALL of the borrower's
    // deployable instances).
    await signMlaRefusal(page)
    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-02"] = outcome.indexingLagMs
    d2 = { ...outcome, marketName: `${namePrefix} ${asset.name}` }
    await closeSuccessDialog(page)

    expect(d2.hooks, "second market reuses the existing policy").toBe(d1.hooks)
    const instance = (await hooksInstance(d1.hooks))!
    const marketIds = instance.markets.map((m) => m.id)
    expect(marketIds).toContain(d1.market.toLowerCase())
    expect(marketIds).toContain(d2.market.toLowerCase())

    await step(page, "policy page lists both markets", async () => {
      await page.goto(`/borrower/policy?policy=${d1.hooks}`)
      await ensureConnected(page, borrower)
      // VERIFY: the policy page's Markets tab lists assigned market names (tab may need a click).
      const marketsTab = page.getByRole("tab", { name: /markets/i })
      if (await marketsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await marketsTab.click()
      }
      await expect(page.getByText(d1.marketName).first()).toBeVisible({
        timeout: 60_000,
      })
      await expect(page.getByText(d2.marketName).first()).toBeVisible({
        timeout: 60_000,
      })
    })
    attachAgreement("MKT-02 policy reuse", {
      policy: d1.hooks,
      markets: marketIds,
    })
  })

  test("MKT-04: fixed-term market with early termination + maturity reduction", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)

    const maturity = await fixedTermDateDigits(2)
    fixedTermExpectedUnix = maturity.expectedUnix
    const cfg = baseCfg({
      policy: { kind: "new", name: `E2E Pol B ${stamp}` },
      term: "Fixed Term Loan",
      fixedTerm: {
        dateDigits: maturity.digits,
        earlyTermination: true,
        maturityReduction: true,
      },
      namePrefix: `E2E MC4 ${stamp}`,
      symbolPrefix: "E2EC",
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, "refusal")

    await step(page, "both toggles shown on review", async () => {
      expect(await reviewValue(page, "Permit Early Termination")).toBe("Yes")
      expect(await reviewValue(page, "Permit Maturity Reduction")).toBe("Yes")
      expect(await reviewValue(page, "Market Type")).toBe("Fixed Term Loan")
    })

    await signMlaRefusal(page)
    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-04"] = outcome.indexingLagMs
    await closeSuccessDialog(page)

    const row = (await subgraphMarket(outcome.market))!
    expect(row.hooks?.kind).toBe("FixedTerm")
    expect(Number(row.hooksConfig?.fixedTermEndTime)).toBe(
      fixedTermExpectedUnix,
    )
    expect(row.hooksConfig?.allowClosureBeforeTerm).toBe(true)
    expect(row.hooksConfig?.allowTermReduction).toBe(true)
    // NOTE: the runsheet asks for a 2-3h maturity, but the date picker only offers calendar days
    // (00:00 UTC, earliest tomorrow) — a sub-day maturity is not reachable through the UI.
    attachAgreement("MKT-04 fixed term", {
      market: outcome.market,
      fixedTermEndTime: row.hooksConfig?.fixedTermEndTime,
      note: "UI minimum maturity is tomorrow 00:00 UTC; 2-3h maturity not configurable",
    })
  })

  test("MKT-08: invalid financial inputs cannot produce a deployable state", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)
    const cfg = baseCfg({
      policy: { kind: "new", name: `E2E Pol V8 ${stamp}` },
      namePrefix: `E2E MC8 ${stamp}`,
      symbolPrefix: "E2EV",
    })
    await fillPolicyStep(page, cfg)
    await clickNext(page)
    await fillBasicStep(page, cfg)
    await clickNext(page)

    await step(page, "blank form: Next disabled", async () => {
      await expect(nextButton(page)).toBeDisabled()
    })

    await step(page, "0 capacity is not accepted as valid", async () => {
      await fillField(page, "Maximum Borrowing Capacity", "0")
      await fillField(page, "Base APR", "10")
      await fillField(page, "Penalty APR", "10")
      await fillField(page, "Reserve Ratio", "20")
      await fillField(page, "Grace Period Duration", "1")
      await fillField(page, "Withdrawal Cycle Duration", "1")
      await expect(nextButton(page)).toBeDisabled()
    })

    await step(
      page,
      "APR above the allowed max is rejected at entry",
      async () => {
        const apr = controlIn(page, "Base APR", "textbox")
        await apr.fill("")
        await apr.pressSequentially("150")
        // The numeric field refuses keystrokes that would exceed the 100% cap.
        const value = (await apr.inputValue()).replace(/,/g, "")
        expect(Number(value)).toBeLessThanOrEqual(100)
        expect(value).not.toBe("150")
      },
    )

    await step(
      page,
      "reserve ratio above 100% is rejected at entry",
      async () => {
        const reserve = controlIn(page, "Reserve Ratio", "textbox")
        await reserve.fill("")
        await reserve.pressSequentially("120")
        expect(Number(await reserve.inputValue())).toBeLessThanOrEqual(100)
      },
    )

    await step(page, "negative values cannot be typed", async () => {
      const penalty = controlIn(page, "Penalty APR", "textbox")
      await penalty.fill("")
      await penalty.pressSequentially("-5")
      expect((await penalty.inputValue()).includes("-")).toBe(false)
    })

    await step(page, "minimum deposit is capped at the capacity", async () => {
      await fillField(page, "Maximum Borrowing Capacity", "1000")
      const minDeposit = controlIn(page, "Minimum Deposit", "textbox")
      await minDeposit.fill("")
      await minDeposit.pressSequentially("5000")
      const value = Number((await minDeposit.inputValue()).replace(/,/g, ""))
      expect(value).toBeLessThanOrEqual(1000)
    })

    await step(page, "valid values unlock Next", async () => {
      await fillField(page, "Maximum Borrowing Capacity", "1000000")
      await fillField(page, "Base APR", "10")
      await fillField(page, "Penalty APR", "10")
      await fillField(page, "Reserve Ratio", "20")
      await fillField(page, "Minimum Deposit", "100")
      await expect(nextButton(page)).toBeEnabled({ timeout: 15_000 })
    })
  })

  test("MKT-10: step navigation stays usable from the confirmation screen", async ({
    page,
  }) => {
    // The wizard gates every "Next" (and the sidebar steps) on per-step validity, so an invalid
    // configuration cannot be forced through to the confirmation screen in the current UI —
    // MKT-08/09 prove the at-entry rejection. What remains verifiable from this row: the
    // left-side step navigation is fully usable from Confirmation to go back and fix values,
    // and deploy stays locked without a fresh signature.
    await connectAs(page, 3)
    await gotoCreateMarket(page)
    const cfg = baseCfg({
      policy: { kind: "new", name: `E2E Pol V10 ${stamp}` },
      namePrefix: `E2E MC10 ${stamp}`,
      symbolPrefix: "E2EW",
    })
    await walkToConfirmation(page, cfg, "refusal")

    await step(
      page,
      "hop back to Basic Market Setup via the sidebar",
      async () => {
        await page
          .getByRole("button", { name: /Basic Market Setup/ })
          .first()
          .click()
        await expect(
          controlIn(page, "Market Token Name", "textbox"),
        ).toBeVisible({ timeout: 15_000 })
      },
    )

    await step(page, "and forward again to Confirmation", async () => {
      const confirmationTab = page
        .getByRole("button", { name: /Confirmation/ })
        .first()
      // The sidebar is a CHAIN, not a set of visited steps: each form enables only the step
      // after it, and stepping back to Basic Market Setup re-runs that form's effect, which
      // enables Financial and leaves Confirmation disabled (measured: the click hung on
      // "element is not enabled" until the test timeout). Going forward is Next, not a jump —
      // so assert the disabled entry and walk. The runsheet's intent (navigation stays usable
      // for fixing values, deploy stays locked unsigned) is unchanged.
      await expect(
        confirmationTab,
        "each sidebar step is gated on the previous one",
      ).toBeDisabled()
      for (
        let i = 0;
        i < 6 &&
        !(await deployButton(page)
          .isVisible()
          .catch(() => false));
        i += 1
      ) {
        await clickNext(page)
      }
      await expect(deployButton(page)).toBeVisible({ timeout: 15_000 })
      await expect(deployButton(page), "unsigned: deploy locked").toBeDisabled()
    })
    attachAgreement("MKT-10 partial coverage", {
      note:
        "Invalid configurations cannot reach the confirmation screen (per-step gating, " +
        "see MKT-08/09); verified left-nav usability and the unsigned deploy lock instead.",
    })
  })

  test("MKT-11: grace period shorter than withdrawal cycle raises the warning", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)
    const cfg = baseCfg({
      policy: { kind: "new", name: `E2E Pol V11 ${stamp}` },
      namePrefix: `E2E MC11 ${stamp}`,
      symbolPrefix: "E2EX",
      financial: { ...financialDefaults, grace: "0.5", cycle: "1" },
    })
    await fillPolicyStep(page, cfg)
    await clickNext(page)
    await fillBasicStep(page, cfg)
    await clickNext(page)
    await fillFinancialStep(page, cfg)

    const warning = page.getByText(
      /Grace Period is shorter than Withdrawal Cycle Duration/,
    )
    await expect(warning).toBeVisible({ timeout: 15_000 })
    await expect(warning).toContainText(
      "cannot be changed after market creation",
    )
    // Conscious proceed is possible…
    await expect(nextButton(page)).toBeEnabled()
    // …and correcting the value clears the warning.
    await fillField(page, "Grace Period Duration", "2")
    await expect(warning).toHaveCount(0)
  })

  test("MKT-12: self-onboarding market — a fresh address gains a credential and deposits", async () => {
    const row = (await subgraphMarket(d1.market))!
    expect(row.hooksConfig?.depositRequiresAccess).toBe(true)
    const instance = (await hooksInstance(d1.hooks))!
    expect(hasOpenAccessProvider(instance)).toBe(true)

    // The deposit hook pulls a credential from the open-access provider on the fly:
    // a brand-new lender deposits with no prior approval transaction.
    const token = row.asset.address as Address
    const amount = parseUnits("200", row.asset.decimals)
    faucet(coLender, amount, token)
    await chain.approve(coLender, token, d1.market as Address, amount)
    const before = await chain.marketBalance(d1.market as Address, coLender)
    await chain.depositUpTo(coLender, d1.market as Address, amount)
    const after = await chain.marketBalance(d1.market as Address, coLender)
    expect(after > before, "market tokens minted to the new lender").toBe(true)
    await syncSubgraph()
    attachAgreement("MKT-12 self-onboarding deposit", {
      market: d1.market,
      lender: coLender,
      minted: after - before,
    })
  })

  test("MKT-13: allowlist market — non-approved addresses cannot deposit", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)
    const cfg = baseCfg({
      policy: { kind: "new", name: policyC },
      access: "Borrower Operated Allowlist",
      namePrefix: `E2E MC13 ${stamp}`,
      symbolPrefix: "E2EG",
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, "refusal")
    await signMlaRefusal(page)
    d13 = await deployAndAwait(page, before)
    indexingLags["MKT-13"] = d13.indexingLagMs
    await closeSuccessDialog(page)

    const instance = (await hooksInstance(d13.hooks))!
    expect(instance.name.trim()).toBe(policyC)
    expect(
      hasOpenAccessProvider(instance),
      "no open-access (self-onboarding) provider on an allowlist policy",
    ).toBe(false)

    // A stranger's deposit reverts (no credential; borrower must add them via the policy).
    const row = (await subgraphMarket(d13.market))!
    const token = row.asset.address as Address
    const amount = parseUnits("200", row.asset.decimals)
    faucet(stranger, amount, token)
    await chain.approve(stranger, token, d13.market as Address, amount)
    let reverted = false
    try {
      await chain.publicClient.simulateContract({
        account: stranger,
        address: d13.market as Address,
        abi: chain.marketAbi,
        functionName: "depositUpTo",
        args: [amount],
      })
    } catch {
      reverted = true
    }
    expect(reverted, "non-approved deposit reverts").toBe(true)
    // NOTE: the approve-then-deposit half (borrower adds a lender via the policy) is exercised
    // by the lenders-list flows on sheet 4; here the policy shape + the block are the oracle.
    attachAgreement("MKT-13 allowlist", {
      market: d13.market,
      providers: instance.providers,
      strangerDepositReverted: reverted,
    })
  })

  test("MKT-14: access control switched after signing — final selection wins, no silent lock-in", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)
    const cfg = baseCfg({
      policy: { kind: "new", name: policyD },
      access: "Lender Self-Onboarding",
      namePrefix: `E2E MC14 ${stamp}`,
      symbolPrefix: "E2EH",
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, "refusal")
    await signMlaRefusal(page)

    await step(page, "go back and switch to the allowlist", async () => {
      await page.getByRole("button", { name: "Back", exact: true }).click()
      await page
        .getByRole("button", { name: /Market Policy/ })
        .first()
        .click()
      await selectField(page, "Access Control", "Borrower Operated Allowlist")
      await gotoConfirmation(page)
    })

    await step(
      page,
      "confirmation shows the FINAL selection; re-sign forced",
      async () => {
        expect(await reviewValue(page, "Access Control")).toBe(
          "Borrower Operated Allowlist",
        )
        // On head the refusal fingerprint no longer covers form fields (5ec10f25) — what forces
        // the re-sign here is the confirmation screen's own Back button, which deliberately
        // discards the signature (shared.tsx handleBackClick -> onDiscardSignature).
        await expect(deployButton(page)).toBeDisabled()
        await signMlaRefusal(page)
      },
    )

    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-14"] = outcome.indexingLagMs
    await closeSuccessDialog(page)
    const instance = (await hooksInstance(outcome.hooks))!
    expect(
      hasOpenAccessProvider(instance),
      "deployed policy matches the FINAL (allowlist) selection",
    ).toBe(false)

    await step(
      page,
      "opposite direction: allowlist → self-onboarding (no deploy)",
      async () => {
        await gotoCreateMarket(page)
        const cfg2 = baseCfg({
          policy: { kind: "new", name: `E2E Pol D2 ${stamp}` },
          access: "Borrower Operated Allowlist",
          namePrefix: `E2E MC14b ${stamp}`,
          symbolPrefix: "E2EJ",
        })
        await walkToConfirmation(page, cfg2, "refusal")
        await signMlaRefusal(page)
        await page.getByRole("button", { name: "Back", exact: true }).click()
        await page
          .getByRole("button", { name: /Market Policy/ })
          .first()
          .click()
        await selectField(page, "Access Control", "Lender Self-Onboarding")
        await gotoConfirmation(page)
        expect(await reviewValue(page, "Access Control")).toBe(
          "Lender Self-Onboarding",
        )
        // Back discarded the signature again (same mechanism as above).
        await expect(deployButton(page), "re-sign forced again").toBeDisabled()
      },
    )
    attachAgreement("MKT-14 access lock-in", {
      deployed: outcome.market,
      finalAccess: "Borrower Operated Allowlist",
      providers: instance.providers,
    })
  })

  test("MKT-15: policy labels match their true access type", async ({
    page,
  }) => {
    // Chain truth first.
    const selfOnboarding = (await hooksInstance(d1.hooks))!
    const allowlist = (await hooksInstance(d13.hooks))!
    expect(hasOpenAccessProvider(selfOnboarding)).toBe(true)
    expect(hasOpenAccessProvider(allowlist)).toBe(false)

    await connectAs(page, 3)
    const rowA = await revealPolicyRow(page, policyA)
    await expect(rowA).toContainText("Self-Onboard")

    const rowC = await revealPolicyRow(page, policyC)
    // Manual-approval policies must NOT be labeled self-onboarding.
    await expect(rowC).toContainText("Manual Approval")
    await expect(rowC).not.toContainText("Self-Onboard")
    attachAgreement("MKT-15 labels", {
      [policyA]: "Self-Onboard",
      [policyC]: "Manual Approval",
    })
  })

  test("MKT-16: Wildcat template MLA — pre-signed by the borrower; full document readable", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)
    const namePrefix = `E2E MC16 ${stamp}`
    const symbolPrefix = "E2EK"
    const cfg = baseCfg({
      policy: { kind: "new", name: policyE },
      namePrefix,
      symbolPrefix,
      deployWrapper: true, // also feeds MKT-19 (staged deploy) and MKT-22 (wrapper link)
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, { template: "Wildcat MLA" })

    await step(page, "View MLA renders the full document", async () => {
      await expect(deployButton(page), "unsigned: deploy locked").toBeDisabled()
      await page.getByRole("button", { name: "View MLA" }).click()
      // The MLA renders in an iframe (srcDoc) inside the modal.
      const doc = page.frameLocator("iframe").last().locator("body")
      await expect(doc).toContainText(BORROWER_LEGAL_NAME, { timeout: 60_000 })
      // The template's execution block reads "Signed by" (no "signature" wording).
      await expect(doc).toContainText(/signed by/i, { timeout: 15_000 })
      const { length } = await doc.innerText()
      expect(length, "document has substance").toBeGreaterThan(2_000)
      await page.keyboard.press("Escape")
    })

    await step(page, "borrower must sign before deployment", async () => {
      await expect(deployButton(page)).toBeDisabled()
      await signMlaThroughModal(page)
    })

    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-16"] = outcome.indexingLagMs
    d16 = { ...outcome, namePrefix, symbolPrefix }
    await closeSuccessDialog(page)

    // Executed MLA stored and served.
    const mla = await fetch(
      `${APP_URL}/api/mla/${d16.market.toLowerCase()}?chainId=${CHAIN_ID}`,
    )
    expect(mla.status, "market MLA retrievable").toBe(200)
    attachAgreement("MKT-16 MLA market", {
      market: d16.market,
      mlaStatus: mla.status,
      toasts: d16.toasts.filter((t) => /Step \d\/\d|MLA/.test(t)),
    })
  })

  test("MKT-17: refusal wording references market identity; MLA <-> refusal switch forces re-sign", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)
    const cfg = baseCfg({
      policy: { kind: "new", name: `E2E Pol F ${stamp}` },
      namePrefix: `E2E MC17 ${stamp}`,
      symbolPrefix: "E2EL",
    })
    await walkToConfirmation(page, cfg, "refusal")

    // Observe the personal_sign ceremony (the Local Anvil connector forwards it to the fork RPC).
    const signedMessages: string[] = []
    await page.route(/127\.0\.0\.1:18545/, async (route) => {
      const body = route.request().postData()
      if (body) {
        try {
          const parsed = JSON.parse(body) as
            | { method?: string; params?: unknown[] }
            | { method?: string; params?: unknown[] }[]
          const requests = Array.isArray(parsed) ? parsed : [parsed]
          for (const request of requests) {
            if (request.method === "personal_sign") {
              const hex = String(request.params?.[0] ?? "")
              signedMessages.push(
                Buffer.from(hex.replace(/^0x/, ""), "hex").toString("utf8"),
              )
            }
          }
        } catch {
          // non-JSON bodies are not RPC calls
        }
      }
      await route.continue()
    })

    await step(
      page,
      "sign the refusal; wording is a refusal, not an MLA",
      async () => {
        await signMlaRefusal(page)
        expect(signedMessages.length).toBeGreaterThanOrEqual(1)
        const message = signedMessages[signedMessages.length - 1]
        expect(message).toMatch(
          /^Decline to assign a Master Loan Agreement for market 0x[0-9a-f]{40}\./,
        )
        expect(message).not.toMatch(/^Sign/i)
        attachAgreement("MKT-17 refusal message", { message })
      },
    )
    await page.unroute(/127\.0\.0\.1:18545/)

    await step(
      page,
      "what a parameter change does to a signed refusal",
      async () => {
        // The two apps genuinely differ here, and the difference is dated. Upstream 5ec10f25
        // (validation/deployFingerprint.ts) made the signature fingerprint MODE-aware: an MLA
        // covers the market terms, so any form change forces a re-sign, but a REFUSAL only covers
        // the predicted market + signing time (both re-validated server-side in handleClickDeploy
        // right before deployment) — which is what the refusal wording asserted above says.
        //
        // main predates that change: its fingerprint covers the form fields in BOTH modes, so
        // editing the APR invalidates a signed refusal and the app says so. Measured, not assumed.
        await page
          .getByRole("button", { name: /Basic Market Terms/ })
          .first()
          .click()
        await fillField(page, "Base APR", "11")
        await gotoConfirmation(page)
        const staleWarning = page.getByText(
          /Market settings changed after you signed/,
        )
        await expect(
          staleWarning,
          "the refusal fingerprint covers the form fields",
        ).toHaveCount(1)
        await expect(
          deployButton(page),
          "…so the deploy is locked until the refusal is re-signed",
        ).toBeDisabled()
      },
    )

    await step(
      page,
      "switching refusal -> MLA forces a fresh signature",
      async () => {
        await page
          .getByRole("button", { name: /Loan Agreement/ })
          .first()
          .click()
        await chooseMla(page, { template: "Wildcat MLA" })
        await clickNext(page)
        // Fresh signature required: the MLA "Sign" opener is live, deploy locked.
        await expect(deployButton(page)).toBeDisabled()
        await expect(
          page.getByRole("button", { name: "Sign", exact: true }),
        ).toBeEnabled({ timeout: 30_000 })
      },
    )
    // Abandoned on purpose — no deploy in this case.
  })

  test.fixme("MKT-18: Safe + MLA deployment", async () => {
    // Requires a Safe (Gnosis) wallet + the Safe Apps SDK transport; the harness only drives the
    // Local Anvil EOA connector. The Safe draft/resume plumbing exists in the app
    // (createMarketSigningDraftsSlice, pendingSafeMessagesSlice) but cannot be exercised without
    // a Safe signer set + the Safe UI. Infrastructure gap — manual test.
  })

  test("MKT-19: staged deploy (1/3 token, 2/3 market, 3/3 wrapper) + exact token identity + MLA upload", async () => {
    // Observations recorded during the MKT-16 deploy (same staged pipeline).
    const stepToasts = d16.toasts.filter((t) => /Step \d\/3/.test(t))
    expect(
      stepToasts.some((t) => /Step 1\/3/.test(t) && /Mock Token/i.test(t)),
      `mock-token stage announced (saw: ${JSON.stringify(stepToasts)})`,
    ).toBe(true)
    expect(
      stepToasts.some((t) => /Step 2\/3/.test(t) && /Market/i.test(t)),
      "market stage announced",
    ).toBe(true)
    expect(
      stepToasts.some((t) => /Step 3\/3/.test(t) && /Wrapper/i.test(t)),
      "wrapper stage announced",
    ).toBe(true)
    expect(
      d16.toasts.some((t) => /MLA selection/i.test(t)),
      "MLA upload step announced",
    ).toBe(true)

    // Token name and symbol deploy exactly as entered (no auto-suffix), on both the freshly
    // deployed mock asset and the market token derived from it.
    const onChain = await readNewMarket(d16.market)
    const assetMeta = await erc20Meta(onChain.asset)
    expect(assetMeta.name).toBe(asset.name)
    expect(assetMeta.symbol).toBe(asset.symbol)
    expect(onChain.name).toBe(`${d16.namePrefix} ${asset.name}`)
    expect(onChain.symbol).toBe(`${d16.symbolPrefix}${asset.symbol}`)
    attachAgreement("MKT-19 staged deploy", {
      toasts: d16.toasts.filter((t) => /Step \d\/3|MLA/i.test(t)),
      assetMeta,
      marketName: onChain.name,
      marketSymbol: onChain.symbol,
    })
  })

  test("MKT-20: completion modal — Close is the only exit; no re-signable state behind it", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await syncSubgraph()
    await gotoCreateMarket(page)
    const namePrefix = `E2E MC20 ${stamp}`
    const cfg = baseCfg({
      policy: { kind: "existing", name: new RegExp(policyA) },
      namePrefix,
      symbolPrefix: "E2EN",
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, "refusal")
    await signMlaRefusal(page)
    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-20"] = outcome.indexingLagMs
    d20 = { ...outcome, marketName: `${namePrefix} ${asset.name}` }

    const successTitle = page.getByText("Market created!")
    await step(page, "what dismisses the completion dialog", async () => {
      // A deterministic backdrop click: MUI's Dialog treats a click on its own
      // `.MuiDialog-container` (which spans the backdrop) as a backdrop-click, whereas a raw
      // viewport coordinate like (5, 5) can land on whatever overlay happens to be there.
      // Click the completion dialog's own container, outside its centred paper, so this closes
      // it for a reason the test controls rather than by luck.
      //
      // Measured (main, fresh-fork board): a backdrop click on this container CLOSES the
      // completion dialog — the runsheet's "Close is the only exit" does not hold on main. This
      // is a plain MUI Dialog with default dismissal, so Escape closes it too (KNOWN-ISSUES M9,
      // widened: the modal dismisses on Escape AND on a backdrop click).
      const completion = page
        .getByRole("dialog")
        .filter({ hasText: "Market created!" })
      await expect(completion).toBeVisible()
      await expect(
        page.getByRole("dialog"),
        "only the completion dialog is open",
      ).toHaveCount(1)
      const container = completion
        .locator('xpath=ancestor::div[contains(@class,"MuiDialog-root")]')
        .locator(".MuiDialog-container")
      await container.click({ position: { x: 5, y: 5 } }) // outside the centred paper = backdrop click
      await expect(
        successTitle,
        "a backdrop click dismisses the completion dialog (KNOWN-ISSUES M9)",
      ).toHaveCount(0, { timeout: 15_000 })
    })

    await step(page, "no path back to a re-signable review state", async () => {
      if (await successTitle.isVisible().catch(() => false)) {
        // Refusal flow: the only exit is the overview button (no MLA download button).
        await expect(
          page.getByRole("button", { name: "View/Download MLA" }),
        ).toHaveCount(0)
        await closeSuccessDialog(page)
      }
      // Regression (re-prompt bug): landing page must not ask for another signature.
      await expect(page.getByText("Market created!")).toHaveCount(0)
      await expect(
        page.getByRole("button", { name: "Sign MLA Refusal" }),
      ).toHaveCount(0)
    })
  })

  test("MKT-21: new markets appear on the borrower overview; indexing lag recorded", async ({
    page,
  }) => {
    await connectAs(page, 3)
    await page.goto("/borrower")
    await ensureConnected(page, borrower)
    // The overview reads the subgraph; deployAndAwait already proved indexing. Here: the UI
    // lists the newest market (deployed in MKT-20 moments ago) — a reload is permitted by the
    // runsheet within an agreed threshold, so poll with periodic reloads.
    //
    // Each attempt has to DWELL before it judges the page. The overview needs a
    // getMarketsWithEvents round trip plus the SDK's per-market lens RPCs before MarketsTables
    // renders a row, and isVisible() ignores its timeout option (CONVENTIONS), so the old
    // predicate judged the page the instant `load` fired and reloaded on the miss — a reload
    // loop that starved the app of the seconds it needed. In the failing run that was 186
    // reloads in 120 s: the trace shows exactly one getMarketsWithEvents per load, whose
    // response DID carry the market (name + deployedEvent, isClosed false), and the final frame
    // is a connected /borrower with an empty "Your Markets" table.
    const newest = page.getByText(d20.marketName).first()
    await expect
      .poll(
        async () => {
          const seen = await newest
            .waitFor({ state: "visible", timeout: 20_000 })
            .then(() => true)
            .catch(() => false)
          if (!seen) {
            await page.reload()
            await ensureConnected(page, borrower)
          }
          return seen
        },
        { timeout: 180_000, message: "newest market visible on the overview" },
      )
      .toBe(true)
    await expect(page.getByText(d1.marketName).first()).toBeVisible({
      timeout: 60_000,
    })
    attachAgreement("MKT-21 visibility", {
      subgraphIndexingLagMsByCase: indexingLags,
      note: "lag measured from deploy-success dialog to the market appearing in the fork subgraph",
    })
  })

  test("MKT-22: wrapper opted in at creation is deployed and linked", async ({
    page,
  }) => {
    const wrapper = await wrapperForMarket(d16.market)
    expect(wrapper, "market records its wrapper").not.toBe(zeroAddress)
    const code = await getCode(wrapper as Address)
    expect(code && code !== "0x", "wrapper has code").toBe(true)

    await connectAs(page, 3)
    await page.goto(`/borrower/market/${d16.market.toLowerCase()}`)
    await ensureConnected(page, borrower)
    await page
      .getByRole("button", { name: /Wrapped Debt Token/ })
      .first()
      .click()
    // VERIFY: with a wrapper present the section shows the wrapper UI, not the deploy CTA.
    await expect(page.getByText("No wrapper deployed")).toHaveCount(0)
    attachAgreement("MKT-22 wrapper", { market: d16.market, wrapper })
  })

  test("MKT-23: market without wrapper offers no post-hoc deployment on either side", async ({
    page,
  }) => {
    expect(await wrapperForMarket(d1.market)).toBe(zeroAddress)

    await connectAs(page, 3)
    await step(
      page,
      "borrower side shows no wrapper and offers no deployment",
      async () => {
        await expect(async () => {
          if (!page.url().includes(d1.market.toLowerCase())) {
            await page.goto(`/borrower/market/${d1.market.toLowerCase()}`)
            await ensureConnected(page, borrower)
          }
          await page
            .getByRole("button", { name: /Wrapped Debt Token/ })
            .first()
            .click()
          await expect(page.getByText("No wrapper deployed")).toBeVisible({
            timeout: 15_000,
          })
        }).toPass({ timeout: 120_000 })
        // main hardcodes canCreateWrapper={false} on the borrower side (WrapDebtToken/index.tsx:49,55).
        await expect(
          page.getByRole("button", { name: "Deploy Wrapper" }),
        ).toHaveCount(0)
      },
    )

    await step(
      page,
      "lender side also offers no wrapper deployment under the harness",
      async () => {
        // Retry through the late deep-link bounce (KNOWN-ISSUES #1).
        await expect(async () => {
          if (!page.url().includes(d1.market.toLowerCase())) {
            await page.goto(`/lender/market/${d1.market.toLowerCase()}`)
            await ensureConnected(page, borrower)
          }
          await page
            .getByRole("button", { name: /Wrapped Debt Token/ })
            .first()
            .click()
          await expect(page.getByText("No wrapper deployed")).toBeVisible({
            timeout: 15_000,
          })
        }).toPass({ timeout: 120_000 })
        // Lender-side deployment is gated on `isAuthorizedLender && hasFactory && an ethers
        // Signer && !isDifferentChain` (lender/market/[address]/components/WrapDebtToken/
        // index.tsx:111-116; KNOWN-ISSUES M12). The harness connects the market's BORROWER
        // account (anvil #3) on the lender page through the Local Anvil connector, and under
        // that connector the "Deploy Wrapper" control never renders here — asserting the
        // observed absence, not which of the four conditions produces it.
        await expect(
          page.getByRole("button", { name: "Deploy Wrapper" }),
        ).toHaveCount(0)
      },
    )
    attachAgreement("MKT-23 wrapper deploy controls", {
      market: d1.market,
      borrowerSide: "no deploy control (canCreateWrapper hardcoded false)",
      lenderSide: "no deploy control under the harness connector (M12)",
    })
  })

  test("MKT-24: market description — borrower login, edit, save; renders for lenders", async ({
    page,
  }) => {
    const description = `E2E market description ${stamp} — set by the automated borrower.`
    const summaryUrl = `${APP_URL}/api/market-summary/${d1.market.toLowerCase()}?chainId=${CHAIN_ID}`

    await connectAs(page, 3)
    await step(page, "lender view before: consistent empty state", async () => {
      await page.goto(`/lender/market/${d1.market.toLowerCase()}`)
      await ensureConnected(page, borrower)
      const descriptionTab = page
        .getByRole("button", { name: /Market Description/ })
        .first()
      // Tab visibility rules: with no description the lender either has no tab at all or an
      // explicit empty state — both are consistent; a broken/blank section is not.
      if (
        await descriptionTab.isVisible({ timeout: 10_000 }).catch(() => false)
      ) {
        await descriptionTab.click()
        await expect(
          page.getByText("No market description found."),
        ).toBeVisible({ timeout: 30_000 })
      }
    })

    await step(page, "borrower logs in and saves a description", async () => {
      await page.goto(`/borrower/market/${d1.market.toLowerCase()}`)
      await ensureConnected(page, borrower)
      await page
        .getByRole("button", { name: /Market Description/ })
        .first()
        .click()
      // AuthWrapper: description editing requires the signed API login (personal_sign).
      const login = page.getByRole("button", {
        name: "Log in to change the description",
      })
      if (await login.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await login.click()
      }
      const add = page.getByRole("button", { name: /^(Add|Edit)$/ }).first()
      await expect(add).toBeVisible({ timeout: 60_000 })
      await add.click()
      // VERIFY: MDXEditor edit surface is the contenteditable region.
      const editor = page.locator('[contenteditable="true"]').first()
      await expect(editor).toBeVisible({ timeout: 30_000 })
      await editor.click()
      await editor.pressSequentially(description)
      await page.getByRole("button", { name: "Save", exact: true }).click()
      await expect
        .poll(
          async () => {
            const res = await fetch(summaryUrl)
            if (!res.ok) return ""
            const json = (await res.json()) as { description?: string } | null
            return json?.description ?? ""
          },
          { timeout: 60_000 },
        )
        .toContain(`E2E market description ${stamp}`)
    })

    await step(page, "description renders on the lender side", async () => {
      await page.goto(`/lender/market/${d1.market.toLowerCase()}`)
      await ensureConnected(page, borrower)
      await page
        .getByRole("button", { name: /Market Description/ })
        .first()
        .click()
      await expect(
        page.getByText(`E2E market description ${stamp}`, { exact: false }),
      ).toBeVisible({ timeout: 60_000 })
    })
    attachAgreement("MKT-24 description", { market: d1.market, description })
  })

  test("teardown: suite left the shared fixtures intact", async () => {
    // This suite only adds markets/policies under borrower #3 (discovery oracles recompute);
    // assert we did not disturb the shared lender accounts' ToU/positions.
    expect(await borrowerTouState()).toBe("signedCurrent")
    const markets = await borrowerMarketIds()
    attachAgreement("market-creation end state", {
      borrower,
      marketsDeployed: markets,
      indexingLagsMs: indexingLags,
    })
  })
})

/**
 * KNOWN-ISSUES [main-variant] M5 — where `invalid BigNumber value (value=undefined)` comes from.
 *
 * The suite above is variant-gated off on main, so M5 (the deploy dying inside the app with a
 * generic "Oops! Something went wrong!" modal) had no test that could re-verify it. This block
 * reproduces the failure WITHOUT a browser, straight through the same SDK call the wizard makes,
 * so the finding survives a fork reset and is not hostage to the UI.
 *
 * What the app does (src/app/[locale]/borrower/create-market):
 *   page.tsx#handleDeployMarket forwards `fixedTermEndTime: marketParams.fixedTermEndTime as any`
 *     — an explicit `as any` next to its own "@todo proper solution" — with no validation, and it
 *     is the ONLY numeric deploy parameter forwarded raw: every other one goes through `Number()`
 *     (which turns a missing field into NaN, a different error) or `!!`.
 *   useDeployV2Market then hands the object to `hooksTemplate.previewDeployMarket`.
 *   FixedTermHooksTemplate encodes `fixedTermEndTime` as a bare `uint32` in `hooksData`, with no
 *     `?? 0` — unlike `minimumDeposit`, `allowForceBuyBacks`, `allowClosureBeforeTerm` and
 *     `allowTermReduction`, which are all defaulted on the line above and below it.
 *
 * So a FIXED TERM deploy whose maturity never reached form state throws inside ethers, before any
 * RPC — which is exactly what M5 recorded, and why the chain looked innocent. Open Term is immune:
 * its template leaves `fixedTermEndTime` in `...otherParameters` and ethers v5's tuple packer
 * ignores keys the struct does not name.
 *
 * The probe is read-only: `previewDeployMarket` plus `callStatic`. Nothing is mined.
 */
test.describe("borrower flows: market creation — M5 deploy-parameter probe", () => {
  test("M5: an undefined fixedTermEndTime reproduces the app's `invalid BigNumber value`", async () => {
    /* eslint-disable global-require, @typescript-eslint/no-var-requires */
    const { ethers, constants } = require("ethers")
    const sdkRoot = require("@wildcatfi/wildcat-sdk")
    const sdkAccess = require("@wildcatfi/wildcat-sdk/dist/access")
    /* eslint-enable global-require, @typescript-eslint/no-var-requires */

    await ensureBorrowerRegistered()
    const provider = new ethers.providers.JsonRpcProvider(FORK_RPC)
    const signer = provider.getSigner(borrower)
    const lens = sdkRoot.getLensV2Contract(CHAIN_ID, signer)
    const lensData = await lens.getHooksDataForBorrower(borrower)
    expect(
      lensData.isRegisteredBorrower,
      "the wizard's own precondition: an arch-controller-registered borrower",
    ).toBe(true)
    const templates = lensData.hooksTemplates.map((t: unknown) =>
      sdkAccess.hooksTemplateFromLens(
        CHAIN_ID,
        signer,
        t,
        borrower,
        lensData.isRegisteredBorrower,
      ),
    )
    const pinned = await subgraph.market(pins.markets.openTerm)
    const asset = await sdkRoot.Token.getTokenData(
      CHAIN_ID,
      pinned!.asset.address,
      signer,
    )
    const factory = sdkRoot.getHooksFactoryContract(CHAIN_ID, signer)

    /** The parameter object `useDeployV2Market` builds, for one template. */
    const paramsFor = (overrides: Record<string, unknown>) => ({
      namePrefix: "E2E M5 Probe ",
      symbolPrefix: "EM5",
      annualInterestBips: 1000,
      delinquencyFeeBips: 1000,
      reserveRatioBips: 2000,
      delinquencyGracePeriod: 3600,
      withdrawalBatchDuration: 3600,
      depositAccess: sdkRoot.DepositAccess.Open,
      withdrawalAccess: sdkRoot.WithdrawalAccess.Open,
      transferAccess: sdkRoot.TransferAccess.Open,
      hooksInstanceName: "E2E M5 Probe Policy",
      salt: ethers.utils.hexZeroPad(
        ethers.utils.hexlify(Math.floor(Math.random() * 1e9)),
        32,
      ),
      hooksAddress: undefined,
      existingProviders: [
        {
          providerAddress: sdkRoot.getDeploymentAddress(
            CHAIN_ID,
            "OpenAccessRoleProvider",
          ),
          timeToLive: 90 * 86_400,
        },
      ],
      allowClosureBeforeTerm: false,
      allowForceBuyBacks: false,
      // What page.tsx forwards for a market whose maturity is not in form state.
      fixedTermEndTime: undefined,
      allowTermReduction: undefined,
      newProviderInputs: [],
      roleProviderFactory: constants.AddressZero,
      maxTotalSupply: new sdkRoot.TokenAmount(
        ethers.utils.parseUnits("1000000", asset.decimals),
        asset,
      ),
      minimumDeposit: asset.parseAmount("100"),
      asset,
      ...overrides,
    })

    /** Run one deploy the way the app does, and report what it did. */
    const attempt = async (
      templateName: string,
      overrides: Record<string, unknown> = {},
    ) => {
      const template = templates.find(
        (t: { name: string }) => t.name === templateName,
      )
      if (!template) return { outcome: "no such template" }
      try {
        const preview = template.previewDeployMarket(paramsFor(overrides))
        if (preview.status !== sdkAccess.DeployMarketStatus.Ready)
          return { outcome: `not ready: ${preview.status}` }
        const result = await factory.callStatic[preview.fn](...preview.args)
        return { outcome: "deployed", market: result.market as string }
      } catch (error) {
        return {
          outcome: "threw",
          message: (error as Error).message.split("\n")[0],
        }
      }
    }

    const M5 = /invalid BigNumber value.*value=undefined/

    const openTerm = await attempt("OpenTermHooks")
    const fixedUndefined = await attempt("FixedTermHooks")
    const fixedSet = await attempt("FixedTermHooks", {
      fixedTermEndTime: (await chain.blockTimestamp()) + 90 * 86_400,
    })
    attachAgreement("M5 deploy-parameter probe", {
      openTerm,
      fixedTermEndTimeUndefined: fixedUndefined,
      fixedTermEndTimeSet: fixedSet,
    })

    // The chain is not the problem: the very same shape deploys once the value is present.
    expect(openTerm.outcome, "open-term deploy is unaffected").toBe("deployed")
    expect(fixedSet.outcome, "fixed-term deploy with a maturity").toBe(
      "deployed",
    )
    // …and the app's reported failure is reproduced, byte for byte, by one missing value.
    expect(fixedUndefined.outcome).toBe("threw")
    expect(fixedUndefined.message, "M5's exact error").toMatch(M5)
  })
})
