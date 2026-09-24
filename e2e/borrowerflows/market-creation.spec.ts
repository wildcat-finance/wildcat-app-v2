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
  gotoCreateMarket,
  hasOpenAccessProvider,
  hooksInstance,
  nextButton,
  periodicStartDigits,
  readNewMarket,
  registeredWrapper,
  reviewValue,
  seedBorrowerProfile,
  selectField,
  signMlaRefusal,
  signMlaThroughModal,
  stranger,
  subgraphMarket,
  typeDateDigits,
  walkToConfirmation,
  type CreateMarketConfig,
  type DeployOutcome,
  ensureBorrowerRegistered,
} from "./helpers"
import * as chain from "../lib/chain"
import {
  APP_URL,
  faucet,
  pins,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import { connectAs, ensureConnected } from "../lib/page"
import { attachAgreement, infra, requirements, step } from "../lib/step"
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

  test("setup: fixtures — chain time, funds, borrower profile row, registration", infra("setup"), async () => {
    // Rerun-accumulation ceiling: beyond this, virtualized lists and first:50 subgraph queries
    // start missing this run's entities. Fail loudly instead of flaking (review finding 14).
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
      chainNow - wallNow < 30 * 86_400,
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

  test("setup: borrower ToU acceptance (wall-clock personal_sign)", infra("setup"), async ({
    page,
  }) => {
    await connectAs(page, 3)
    await ensureBorrowerTouSigned(page)
  })

  test("MKT-01: new policy created through market creation; listed with its access type", requirements(["REQ-BOP-037", "REQ-BOP-041", "REQ-PROTO-001", "REQ-PROTO-004"]), async ({
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
    for (const label of [
      "Policy Name",
      "Market Type",
      "Market Term",
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
      "the confirmation screen restates the market term that was picked",
      async () => {
        expect(reviewD1["Market Term"]).toBe("Open Term Loan")
      },
      { req: ["REQ-BOP-041"] },
    )

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

    // Both lines moved here from MKT-03: the implementation the wizard restated and the one the
    // subgraph recorded are the same claim, and `d1.market` only exists after the deploy. The
    // subgraph read is a DRIVER and stays outside the checkpoint. main has neither line — no
    // separate Market Type row, no MarketKind in SDK 3.1.17 (REQ-PROTO-004 is `missing` there).
    const d1Row = (await subgraphMarket(d1.market))!
    await step(
      page,
      "the confirmation screen names the standard market implementation",
      async () => {
        expect(reviewD1["Market Type"]).toBe("Standard")
        expect(d1Row.marketKind).toBe("STANDARD")
      },
      { req: ["REQ-PROTO-004"] },
    )

    // Policy exists on the subgraph with the given name and self-onboarding access.
    const instance = (await hooksInstance(d1.hooks))!
    await step(
      page,
      "the new policy is indexed with its name, kind and access",
      async () => {
        expect(instance, "hooks instance indexed").not.toBeNull()
        expect(instance.name.trim()).toBe(policyA)
        expect(instance.kind).toBe("OpenTerm")
        expect(hasOpenAccessProvider(instance), "self-onboarding provider").toBe(
          true,
        )
      },
      { req: ["REQ-BOP-037", "REQ-PROTO-001"] },
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
      { req: ["REQ-BOP-037"] },
    )
    attachAgreement("MKT-01 policy", {
      market: d1.market,
      hooks: d1.hooks,
      providers: instance.providers,
    })
  })

  test("MKT-03: every open-term parameter settable; review units and formatting; on-chain agreement", requirements(["REQ-BOP-053", "REQ-BOP-055", "REQ-BOP-056", "REQ-BOP-065", "REQ-PROTO-001"]), async ({
    page,
  }) => {
    // The parameters were all set through the UI in MKT-01 (same deploy); this test audits the
    // captured review screen plus the three-way page/chain/subgraph agreement.
    await step(
      page,
      "the confirmation screen produced review rows to audit",
      async () => {
        expect(Object.keys(reviewD1).length).toBeGreaterThan(0)
      },
      { req: ["REQ-BOP-065"] },
    )

    // Review formatting, UNIFIED on v2.5's display strings (plan 1.2, controller ruling on
    // blocker 5): the confirmation screen groups the capacity in thousands and humanises the
    // durations (head a5620443 "unify duration units on confirmation screen" + 3d68d06f "stop
    // rounding review durations": "1.00 hours" -> "1 hour"). main renders the raw form values
    // ("1000000 DAI", "1 hours") and is expected to fail the first line here — that failure is
    // the finding the board must show, never something to normalise away.
    await step(
      page,
      "the confirmation screen restates capacity and durations as a human reads them",
      async () => {
        expect(
          reviewD1["Maximum Borrowing Capacity"],
          "the confirmation screen groups the capacity in thousands",
        ).toContain("1,000,000")
        expect(reviewD1["Maximum Borrowing Capacity"]).toContain(asset.symbol)
        expect(
          reviewD1["Grace Period Duration"],
          "the confirmation screen humanises the grace period",
        ).toBe("1 hour")
        expect(
          reviewD1["Withdrawal Cycle Duration"],
          "the confirmation screen humanises the withdrawal cycle",
        ).toBe("1 hour")
      },
      { req: ["REQ-BOP-065"] },
    )

    await step(
      page,
      "the confirmation screen restates the rates and the reserve ratio",
      async () => {
        expect(reviewD1["Base APR"]).toMatch(/^10(\.0+)?%$/)
        expect(reviewD1["Penalty APR"]).toMatch(/^10(\.0+)?%$/)
        expect(reviewD1["Reserve Ratio"]).toMatch(/^20(\.0+)?%$/)
      },
      { req: ["REQ-BOP-055"] },
    )

    await step(
      page,
      "the confirmation screen restates the optional minimum deposit",
      async () => {
        expect(reviewD1["Minimum Deposit"]).toContain("100")
      },
      { req: ["REQ-BOP-056"] },
    )

    // The term, read where each app puts it: v2.5 splits the market type and the term into
    // two review rows; main renders one "Market Type" row that IS the term.
    await step(
      page,
      "the confirmation screen names the open-term loan",
      async () => {
        expect(reviewD1["Market Term"]).toBe("Open Term Loan")
      },
      { req: ["REQ-PROTO-001"] },
    )

    await step(
      page,
      "the confirmation screen restates the policy and its access control",
      async () => {
        expect(reviewD1["Access Control"]).toBe("Lender Self-Onboarding")
        expect(reviewD1["Policy Name"]).toBe(policyA)
      },
      { req: ["REQ-BOP-065"] },
    )

    // Chain vs configured values (the mock asset re-deploys with 18 decimals on testnet).
    const onChain = await readNewMarket(d1.market)
    expect(onChain.borrower.toLowerCase()).toBe(borrower.toLowerCase())
    await step(
      page,
      "the chain carries every financial parameter that was set",
      async () => {
        expect(onChain.annualInterestBips).toBe(1000n)
        expect(onChain.delinquencyFeeBips).toBe(1000n)
        expect(onChain.reserveRatioBips).toBe(2000n)
        expect(onChain.delinquencyGracePeriod).toBe(3600n)
        expect(onChain.withdrawalBatchDuration).toBe(3600n)
        expect(onChain.maxTotalSupply).toBe(parseUnits("1000000", 18))
      },
      { req: ["REQ-BOP-055"] },
    )

    await step(
      page,
      "the market deployed under the name entered on the basic setup step",
      async () => {
        expect(onChain.name).toBe(d1.marketName)
      },
      { req: ["REQ-BOP-053"] },
    )

    // Subgraph agreement.
    const row = (await subgraphMarket(d1.market))!
    await step(
      page,
      "the subgraph agrees with the chain on every financial parameter",
      async () => {
        expect(BigInt(row.annualInterestBips)).toBe(onChain.annualInterestBips)
        expect(BigInt(row.delinquencyFeeBips)).toBe(onChain.delinquencyFeeBips)
        expect(BigInt(row.reserveRatioBips)).toBe(onChain.reserveRatioBips)
        expect(Number(row.delinquencyGracePeriod)).toBe(3600)
        expect(Number(row.withdrawalBatchDuration)).toBe(3600)
      },
      { req: ["REQ-BOP-055"] },
    )

    await step(
      page,
      "the subgraph carries the minimum deposit that was set",
      async () => {
        expect(BigInt(row.hooksConfig?.minimumDeposit ?? "0")).toBe(
          parseUnits("100", 18),
        )
      },
      { req: ["REQ-BOP-056"] },
    )
    attachAgreement("MKT-03 parameters", {
      review: reviewD1,
      onChain,
      subgraph: row,
    })
  })

  test("MKT-02: existing policy selectable; second market deploys under it", requirements(["REQ-BOP-037"]), async ({
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

    await step(
      page,
      "policy page lists both markets",
      async () => {
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
      },
      { req: ["REQ-BOP-037"] },
    )
    attachAgreement("MKT-02 policy reuse", {
      policy: d1.hooks,
      markets: marketIds,
    })
  })

  test("MKT-04: fixed-term market with early termination + maturity reduction", requirements(["REQ-BOP-041", "REQ-BOP-043", "REQ-BOP-044", "REQ-PROTO-002"]), async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)

    // MATURITY RUNWAY. This case deploys the fixed-term fixtures every downstream fixed-term test
    // consumes, and each of them needs the term to still be OPEN when it runs:
    //   BOP-15  APR reduction is blocked only while `fixedTermEndTime > now`;
    //   BOP-18  shortens the maturity through the MaturityModal — whose picker is bounded by
    //           [today, current maturity], so there must be spare calendar days INSIDE the term to
    //           move it to, and the result must still read as a date (the market-list chip renders
    //           a relative "n days left" instead of a date under 7 days out);
    //   BOP-24  closes the OTHER fixture before its maturity;
    //   LEN-35  asserts the pre-maturity withdrawal lock and then travels past it, last of all.
    // 30/12 days give BOP-18 room to cut ~10 days off and still leave LEN-35 a >7-day term, while
    // keeping the final phase's one-way jump to weeks rather than months.
    const maturity = await fixedTermDateDigits(30)
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

    await step(
      page,
      "both toggles shown on review",
      async () => {
        expect(await reviewValue(page, "Permit Early Termination")).toBe("Yes")
        expect(await reviewValue(page, "Permit Maturity Reduction")).toBe("Yes")
        expect(await reviewValue(page, "Market Term")).toBe("Fixed Term Loan")
      },
      { req: ["REQ-BOP-041", "REQ-BOP-043", "REQ-BOP-044"] },
    )

    await signMlaRefusal(page)
    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-04"] = outcome.indexingLagMs
    await closeSuccessDialog(page)

    const row = (await subgraphMarket(outcome.market))!
    await step(
      page,
      "the fixed-term hooks template was deployed",
      async () => {
        expect(row.hooks?.kind).toBe("FixedTerm")
      },
      { req: ["REQ-PROTO-002"] },
    )
    expect(Number(row.hooksConfig?.fixedTermEndTime)).toBe(
      fixedTermExpectedUnix,
    )
    await step(
      page,
      "closure before maturity is permitted on chain",
      async () => {
        expect(row.hooksConfig?.allowClosureBeforeTerm).toBe(true)
      },
      { req: ["REQ-BOP-043"] },
    )
    await step(
      page,
      "maturity reduction is permitted on chain",
      async () => {
        expect(row.hooksConfig?.allowTermReduction).toBe(true)
      },
      { req: ["REQ-BOP-044"] },
    )

    // SECOND fixed-term market, same case. BOP-24 closes a permitted fixed-term market BEFORE its
    // maturity, which is destructive: doing it on the market above would leave BOP-15/BOP-18 (and
    // LEN-35's lock) nothing to assert on a re-run. Deploying a sibling here — rather than in the
    // borrower-ops suite — keeps every market this board consumes traceable to the creation
    // wizard, and it is the same UAT case: a fixed-term market with both permissions enabled.
    // Its own policy, because the wizard derives term/access from the policy and a second policy
    // costs one extra hooks deployment rather than a new code path.
    await gotoCreateMarket(page)
    const maturityB = await fixedTermDateDigits(12)
    const cfgB = baseCfg({
      policy: { kind: "new", name: `E2E Pol B2 ${stamp}` },
      term: "Fixed Term Loan",
      fixedTerm: {
        dateDigits: maturityB.digits,
        earlyTermination: true,
        maturityReduction: true,
      },
      namePrefix: `E2E MC4b ${stamp}`,
      symbolPrefix: "E2EK",
    })
    const beforeB = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfgB, "refusal")
    await signMlaRefusal(page)
    const outcomeB = await deployAndAwait(page, beforeB)
    indexingLags["MKT-04b"] = outcomeB.indexingLagMs
    await closeSuccessDialog(page)

    const rowB = (await subgraphMarket(outcomeB.market))!
    expect(rowB.hooks?.kind).toBe("FixedTerm")
    expect(Number(rowB.hooksConfig?.fixedTermEndTime)).toBe(
      maturityB.expectedUnix,
    )
    expect(rowB.hooksConfig?.allowClosureBeforeTerm).toBe(true)
    expect(rowB.hooksConfig?.allowTermReduction).toBe(true)
    // The two maturities must differ: borrower-ops picks the LATER one as the reduction/lock
    // fixture and the earlier one as the early-close target, and a tie would make that arbitrary.
    expect(
      maturityB.expectedUnix,
      "early-close fixture matures before the reduction fixture",
    ).toBeLessThan(fixedTermExpectedUnix)

    // NOTE: the runsheet asks for a 2-3h maturity, but the date picker only offers calendar days
    // (00:00 UTC, earliest tomorrow) — a sub-day maturity is not reachable through the UI.
    attachAgreement("MKT-04 fixed term", {
      market: outcome.market,
      fixedTermEndTime: row.hooksConfig?.fixedTermEndTime,
      earlyCloseSibling: outcomeB.market,
      earlyCloseFixedTermEndTime: rowB.hooksConfig?.fixedTermEndTime,
      consumedBy: {
        [outcome.market]: "BOP-15 / BOP-18 / LEN-35",
        [outcomeB.market]: "BOP-24 (closed before maturity)",
      },
      note: "UI minimum maturity is tomorrow 00:00 UTC; 2-3h maturity not configurable",
    })
  })

  test("MKT-05: revolving market — commitment fee + utilisation APR; 0% reserve ratio", requirements(["REQ-BOP-040", "REQ-BOP-058", "REQ-PROTO-005", "REQ-PROTO-007"]), async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)

    const cfg = baseCfg({
      policy: { kind: "new", name: `E2E Pol R ${stamp}` },
      implementation: "Revolving",
      namePrefix: `E2E MC5 ${stamp}`,
      symbolPrefix: "E2ED",
      financial: {
        ...financialDefaults,
        reserve: "0", // VERIFY: 0% must be accepted (runsheet: "reserve ratio (0% allowed)")
        commitmentFee: "2",
      },
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, "refusal")

    await step(
      page,
      "both pricing fields labeled on review",
      async () => {
        expect(await reviewValue(page, "Market Type")).toBe("Revolving")
        expect(await reviewValue(page, "Utilization APR")).toMatch(/^10(\.0+)?%$/)
        expect(await reviewValue(page, "Commitment Fee")).toMatch(/^2(\.0+)?%$/)
        expect(await reviewValue(page, "Reserve Ratio")).toMatch(/^0(\.0+)?%$/)
      },
      { req: ["REQ-BOP-040", "REQ-BOP-058"] },
    )

    await signMlaRefusal(page)
    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-05"] = outcome.indexingLagMs
    await closeSuccessDialog(page)

    const row = (await subgraphMarket(outcome.market))!
    await step(
      page,
      "the revolving implementation was deployed",
      async () => {
        expect(row.marketKind).toBe("REVOLVING")
      },
      { req: ["REQ-PROTO-005", "REQ-PROTO-007"] },
    )
    await step(
      page,
      "the commitment fee is recorded on chain",
      async () => {
        expect(Number(row.commitmentFeeBips)).toBe(200)
      },
      { req: ["REQ-BOP-058"] },
    )
    expect(Number(row.reserveRatioBips)).toBe(0)
    attachAgreement("MKT-05 revolving", {
      market: outcome.market,
      commitmentFeeBips: row.commitmentFeeBips,
      reserveRatioBips: row.reserveRatioBips,
    })
  })

  test("MKT-06: periodic-term market — schedule fields + unit toggle", requirements(["REQ-BOP-041", "REQ-BOP-045", "REQ-BOP-046", "REQ-BOP-047", "REQ-BOP-048", "REQ-PROTO-003", "REQ-PROTO-006"]), async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)

    const start = await periodicStartDigits(60)
    const cfg = baseCfg({
      policy: { kind: "new", name: `E2E Pol P ${stamp}` },
      term: "Periodic Term Loan",
      periodic: {
        unit: "Minutes",
        startDigits: start.digits,
        period: "30",
        window: "10",
      },
      namePrefix: `E2E MC6 ${stamp}`,
      symbolPrefix: "E2EE",
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, "refusal")

    await step(
      page,
      "review shows the schedule in the chosen unit",
      async () => {
        expect(await reviewValue(page, "Withdrawal Period")).toBe("30 minutes")
        expect(await reviewValue(page, "Withdrawal Window")).toBe("10 minutes")
        expect(
          await reviewValue(page, "First Withdrawal Window [UTC]"),
        ).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} UTC/)
      },
      { req: ["REQ-BOP-045", "REQ-BOP-046", "REQ-BOP-047", "REQ-BOP-048"] },
    )

    await signMlaRefusal(page)
    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-06"] = outcome.indexingLagMs
    await closeSuccessDialog(page)

    const row = (await subgraphMarket(outcome.market))!
    await step(
      page,
      "the periodic-term hooks template was deployed",
      async () => {
        expect(row.hooks?.kind).toBe("PeriodicTerm")
      },
      { req: ["REQ-BOP-041", "REQ-PROTO-003", "REQ-PROTO-006"] },
    )
    await step(
      page,
      "the schedule is recorded on chain exactly as entered",
      async () => {
        expect(Number(row.hooksConfig?.periodDuration)).toBe(30 * 60)
        expect(Number(row.hooksConfig?.withdrawalWindowDuration)).toBe(10 * 60)
        expect(Number(row.hooksConfig?.firstWithdrawalWindowStart)).toBe(
          start.expectedUnix,
        )
      },
      { req: ["REQ-BOP-045", "REQ-BOP-046", "REQ-BOP-047", "REQ-BOP-048"] },
    )
    attachAgreement("MKT-06 periodic", {
      market: outcome.market,
      hooksConfig: row.hooksConfig,
    })
  })

  test("MKT-07: revolving + periodic combined type deploys with both parameter sets", requirements(["REQ-PROTO-007"]), async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)

    const start = await periodicStartDigits(90)
    const cfg = baseCfg({
      policy: { kind: "new", name: `E2E Pol RP ${stamp}` },
      implementation: "Revolving",
      term: "Periodic Term Loan",
      periodic: {
        unit: "Hours",
        startDigits: start.digits,
        period: "1",
        window: "0.5",
      },
      namePrefix: `E2E MC7 ${stamp}`,
      symbolPrefix: "E2EF",
      financial: { ...financialDefaults, commitmentFee: "1.5" },
    })
    const before = new Set(await borrowerMarketIds())
    await walkToConfirmation(page, cfg, "refusal")

    expect(await reviewValue(page, "Commitment Fee")).toMatch(/^1\.5%$/)
    // Humanized durations on head (a5620443/3d68d06f): "1 hours" -> "1 hour",
    // "0.5 hours" -> "30 minutes" (stored as seconds, humanized without unit lock-in).
    expect(await reviewValue(page, "Withdrawal Period")).toBe("1 hour")
    expect(await reviewValue(page, "Withdrawal Window")).toBe("30 minutes")

    await signMlaRefusal(page)
    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-07"] = outcome.indexingLagMs
    await closeSuccessDialog(page)

    const row = (await subgraphMarket(outcome.market))!
    await step(
      page,
      "the deploy targeted the revolving factory with the periodic hooks template",
      async () => {
        expect(row.marketKind).toBe("REVOLVING")
        expect(row.hooks?.kind).toBe("PeriodicTerm")
      },
      { req: ["REQ-PROTO-007"] },
    )
    expect(Number(row.commitmentFeeBips)).toBe(150)
    expect(Number(row.hooksConfig?.periodDuration)).toBe(3600)
    expect(Number(row.hooksConfig?.withdrawalWindowDuration)).toBe(1800)
    attachAgreement("MKT-07 revolving periodic", {
      market: outcome.market,
      commitmentFeeBips: row.commitmentFeeBips,
      hooksConfig: row.hooksConfig,
    })
  })

  test("MKT-08: invalid financial inputs cannot produce a deployable state", requirements(["REQ-BOP-131", "REQ-PROTO-102"]), async ({
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

    await step(
      page,
      "blank form: Next disabled",
      async () => {
        await expect(nextButton(page)).toBeDisabled()
      },
      { req: ["REQ-BOP-131"] },
    )

    await step(
      page,
      "0 capacity is not accepted as valid",
      async () => {
        await fillField(page, "Maximum Borrowing Capacity", "0")
        await fillField(page, "Base APR", "10")
        await fillField(page, "Penalty APR", "10")
        await fillField(page, "Reserve Ratio", "20")
        await fillField(page, "Grace Period Duration", "1")
        await fillField(page, "Withdrawal Cycle Duration", "1")
        await expect(nextButton(page)).toBeDisabled()
      },
      { req: ["REQ-BOP-131"] },
    )

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
      { req: ["REQ-BOP-131", "REQ-PROTO-102"] },
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
      { req: ["REQ-BOP-131", "REQ-PROTO-102"] },
    )

    await step(
      page,
      "negative values cannot be typed",
      async () => {
        const penalty = controlIn(page, "Penalty APR", "textbox")
        await penalty.fill("")
        await penalty.pressSequentially("-5")
        expect((await penalty.inputValue()).includes("-")).toBe(false)
      },
      { req: ["REQ-BOP-131"] },
    )

    await step(
      page,
      "minimum deposit is capped at the capacity",
      async () => {
        await fillField(page, "Maximum Borrowing Capacity", "1000")
        const minDeposit = controlIn(page, "Minimum Deposit", "textbox")
        await minDeposit.fill("")
        await minDeposit.pressSequentially("5000")
        const value = Number((await minDeposit.inputValue()).replace(/,/g, ""))
        expect(value).toBeLessThanOrEqual(1000)
      },
      { req: ["REQ-BOP-131", "REQ-PROTO-102"] },
    )

    await step(
      page,
      "valid values unlock Next",
      async () => {
        await fillField(page, "Maximum Borrowing Capacity", "1000000")
        await fillField(page, "Base APR", "10")
        await fillField(page, "Penalty APR", "10")
        await fillField(page, "Reserve Ratio", "20")
        await fillField(page, "Minimum Deposit", "100")
        await expect(nextButton(page)).toBeEnabled({ timeout: 15_000 })
      },
      { req: ["REQ-BOP-131"] },
    )
  })

  test("MKT-09: periodic timing violations rejected at entry; Tab/Enter cannot bypass", requirements(["REQ-BOP-050", "REQ-BOP-051"]), async ({
    page,
  }) => {
    await connectAs(page, 3)
    await gotoCreateMarket(page)
    await selectField(page, "Market Policy", "Create New Policy")
    await fillField(page, "Policy Name", `E2E Pol V9 ${stamp}`)
    await selectField(page, "Market Type", "Standard")
    await selectField(page, "Market Term", "Periodic Term Loan")
    await selectField(page, "Access Control", "Lender Self-Onboarding")
    const start = await periodicStartDigits(60)
    await typeDateDigits(
      page.getByRole("textbox", { name: /e\.g\. 25\/12\/2024 14:30 UTC/ }),
      start.digits,
    )
    await page.getByRole("button", { name: "Minutes", exact: true }).click()

    await step(
      page,
      "period below the 6-minute floor errors inline",
      async () => {
        const period = controlIn(page, "Withdrawal Period", "textbox")
        await period.fill("5")
        await period.press("Enter")
        await expect(
          page.getByText("Withdrawal period must be at least 6 minutes"),
        ).toBeVisible({ timeout: 15_000 })
        await expect(nextButton(page)).toBeDisabled()
      },
      { req: ["REQ-BOP-050"] },
    )

    await step(
      page,
      "window >= period errors inline (Tab navigation)",
      async () => {
        const period = controlIn(page, "Withdrawal Period", "textbox")
        await period.fill("10")
        const window = controlIn(page, "Withdrawal Window", "textbox")
        await window.fill("10")
        await window.press("Tab")
        await expect(
          page.getByText(
            "Withdrawal window must be shorter than the withdrawal period",
          ),
        ).toBeVisible({ timeout: 15_000 })
        await expect(nextButton(page)).toBeDisabled()
      },
      { req: ["REQ-BOP-051"] },
    )

    await step(
      page,
      "correcting the values clears the errors",
      async () => {
        await controlIn(page, "Withdrawal Window", "textbox").fill("5")
        await expect(
          page.getByText(
            "Withdrawal window must be shorter than the withdrawal period",
          ),
        ).toHaveCount(0)
        await expect(nextButton(page)).toBeEnabled({ timeout: 15_000 })
      },
      { req: ["REQ-BOP-051"] },
    )
  })

  test("MKT-10: step navigation stays usable from the confirmation screen", requirements(["REQ-BOP-066"]), async ({
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

    // The sidebar is a CHAIN, not a set of visited steps: each form enables only the step
    // after it, and stepping back to Basic Market Setup re-runs that form's effect, which
    // enables Financial and leaves Confirmation disabled (measured on main: the click hung on
    // "element is not enabled" until the test timeout). Going forward is Next, not a jump —
    // so assert the disabled entry and walk. The runsheet's intent (navigation stays usable
    // for fixing values, deploy stays locked unsigned) is unchanged. UNIFIED on main's
    // assertion (plan 1.2, controller ruling on blocker 5): v2.5 used to click the Confirmation
    // tab straight through and asserted nothing here, so if v2.5 does not gate, the failure
    // this raises is the finding the board must show, not something to normalise away.
    const confirmationTab = page
      .getByRole("button", { name: /Confirmation/ })
      .first()
    await step(
      page,
      "the sidebar chain gates each step on the previous one",
      async () => {
        await expect(
          confirmationTab,
          "each sidebar step is gated on the previous one",
        ).toBeDisabled()
      },
      { req: ["REQ-BOP-066"] },
    )
    // DRIVER: going forward is Next, not a jump.
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
    await step(page, "and forward again to Confirmation", async () => {
      await expect(deployButton(page)).toBeVisible({ timeout: 15_000 })
      await expect(deployButton(page), "unsigned: deploy locked").toBeDisabled()
    })
    attachAgreement("MKT-10 partial coverage", {
      note:
        "Invalid configurations cannot reach the confirmation screen (per-step gating, " +
        "see MKT-08/09); verified left-nav usability and the unsigned deploy lock instead.",
    })
  })

  test("MKT-11: grace period shorter than withdrawal cycle raises the warning", requirements(["REQ-BOP-057"]), async ({
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
    await step(
      page,
      "a grace period shorter than the cycle raises the permanence warning",
      async () => {
        await expect(warning).toBeVisible({ timeout: 15_000 })
        await expect(warning).toContainText(
          "cannot be changed after market creation",
        )
        // Conscious proceed is possible…
        await expect(nextButton(page)).toBeEnabled()
      },
      { req: ["REQ-BOP-057"] },
    )
    // …and correcting the value clears the warning. DRIVER: the correction itself.
    await fillField(page, "Grace Period Duration", "2")
    await step(
      page,
      "correcting the grace period clears the warning",
      async () => {
        await expect(warning).toHaveCount(0)
      },
      { req: ["REQ-BOP-057"] },
    )
  })

  test("MKT-12: self-onboarding market — a fresh address gains a credential and deposits", requirements(["REQ-BOP-052", "REQ-LEN-110", "REQ-PROTO-011"]), async ({
    page,
  }) => {
    const row = (await subgraphMarket(d1.market))!
    const instance = (await hooksInstance(d1.hooks))!
    await step(
      page,
      "the deployed policy carries the self-onboarding selection",
      async () => {
        expect(row.hooksConfig?.depositRequiresAccess).toBe(true)
        expect(hasOpenAccessProvider(instance)).toBe(true)
      },
      { req: ["REQ-BOP-052", "REQ-PROTO-011"] },
    )

    // The deposit hook pulls a credential from the open-access provider on the fly:
    // a brand-new lender deposits with no prior approval transaction.
    const token = row.asset.address as Address
    const amount = parseUnits("200", row.asset.decimals)
    faucet(coLender, amount, token)
    await chain.approve(coLender, token, d1.market as Address, amount)
    const before = await chain.marketBalance(d1.market as Address, coLender)
    await chain.depositUpTo(coLender, d1.market as Address, amount)
    const after = await chain.marketBalance(d1.market as Address, coLender)
    await step(
      page,
      "a brand-new lender gains the credential and deposits",
      async () => {
        expect(after > before, "market tokens minted to the new lender").toBe(
          true,
        )
      },
      { req: ["REQ-LEN-110"] },
    )
    await syncSubgraph()
    attachAgreement("MKT-12 self-onboarding deposit", {
      market: d1.market,
      lender: coLender,
      minted: after - before,
    })
  })

  test("MKT-13: allowlist market — non-approved addresses cannot deposit", requirements(["REQ-BOP-052", "REQ-LEN-111", "REQ-PROTO-011", "REQ-PROTO-105"]), async ({
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
    await step(
      page,
      "the allowlist policy deploys with no self-onboarding provider",
      async () => {
        expect(instance.name.trim()).toBe(policyC)
        expect(
          hasOpenAccessProvider(instance),
          "no open-access (self-onboarding) provider on an allowlist policy",
        ).toBe(false)
      },
      { req: ["REQ-BOP-052", "REQ-PROTO-011"] },
    )

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
    await step(
      page,
      "an address the borrower has not allowlisted cannot deposit",
      async () => {
        expect(reverted, "non-approved deposit reverts").toBe(true)
      },
      { req: ["REQ-LEN-111", "REQ-PROTO-105"] },
    )
    // NOTE: the approve-then-deposit half (borrower adds a lender via the policy) is exercised
    // by the lenders-list flows on sheet 4; here the policy shape + the block are the oracle.
    attachAgreement("MKT-13 allowlist", {
      market: d13.market,
      providers: instance.providers,
      strangerDepositReverted: reverted,
    })
  })

  test("MKT-14: access control switched after signing — final selection wins, no silent lock-in", requirements(["REQ-BOP-052", "REQ-BOP-132"]), async ({
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
      await page
        .getByRole("button", { name: /Confirmation/ })
        .first()
        .click()
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
      { req: ["REQ-BOP-052"] },
    )

    const outcome = await deployAndAwait(page, before)
    indexingLags["MKT-14"] = outcome.indexingLagMs
    await closeSuccessDialog(page)
    const instance = (await hooksInstance(outcome.hooks))!
    await step(
      page,
      "the deployed policy carries the final access selection",
      async () => {
        expect(
          hasOpenAccessProvider(instance),
          "deployed policy matches the FINAL (allowlist) selection",
        ).toBe(false)
      },
      { req: ["REQ-BOP-132"] },
    )

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
        await page
          .getByRole("button", { name: /Confirmation/ })
          .first()
          .click()
        expect(await reviewValue(page, "Access Control")).toBe(
          "Lender Self-Onboarding",
        )
        // Back discarded the signature again (same mechanism as above).
        await expect(deployButton(page), "re-sign forced again").toBeDisabled()
      },
      { req: ["REQ-BOP-052"] },
    )
    attachAgreement("MKT-14 access lock-in", {
      deployed: outcome.market,
      finalAccess: "Borrower Operated Allowlist",
      providers: instance.providers,
    })
  })

  test("MKT-15: policy labels match their true access type", requirements(["REQ-BOP-133"]), async ({
    page,
  }) => {
    // Chain truth first.
    const selfOnboarding = (await hooksInstance(d1.hooks))!
    const allowlist = (await hooksInstance(d13.hooks))!
    await step(
      page,
      "the two policies differ on chain by their access provider",
      async () => {
        expect(hasOpenAccessProvider(selfOnboarding)).toBe(true)
        expect(hasOpenAccessProvider(allowlist)).toBe(false)
      },
      { req: ["REQ-BOP-133"] },
    )

    await connectAs(page, 3)
    const rowA = await revealPolicyRow(page, policyA)
    await step(
      page,
      "the self-onboarding policy is labelled Self-Onboard",
      async () => {
        await expect(rowA).toContainText("Self-Onboard")
      },
      { req: ["REQ-BOP-133"] },
    )

    const rowC = await revealPolicyRow(page, policyC)
    await step(
      page,
      "the allowlist policy is labelled Manual Approval and never Self-Onboard",
      async () => {
        // Manual-approval policies must NOT be labeled self-onboarding.
        await expect(rowC).toContainText("Manual Approval")
        await expect(rowC).not.toContainText("Self-Onboard")
      },
      { req: ["REQ-BOP-133"] },
    )
    attachAgreement("MKT-15 labels", {
      [policyA]: "Self-Onboard",
      [policyC]: "Manual Approval",
    })
  })

  test("MKT-16: Wildcat template MLA — pre-signed by the borrower; full document readable", requirements(["REQ-BOP-030", "REQ-BOP-064"]), async ({
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

    await step(
      page,
      "View MLA renders the full document",
      async () => {
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
      },
      { req: ["REQ-BOP-030"] },
    )

    await step(
      page,
      "borrower must sign before deployment",
      async () => {
        await expect(deployButton(page)).toBeDisabled()
        await signMlaThroughModal(page)
      },
      { req: ["REQ-BOP-064"] },
    )

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

  test("MKT-17: refusal wording references market identity; MLA <-> refusal switch forces re-sign", requirements(["REQ-BOP-030", "REQ-BOP-064", "REQ-BOP-071"]), async ({
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
      { req: ["REQ-BOP-030", "REQ-BOP-064"] },
    )
    await page.unroute(/127\.0\.0\.1:18545/)

    await step(
      page,
      "parameter changes do NOT invalidate a refusal (identity-scoped signature)",
      async () => {
        // Upstream change (5ec10f25, validation/deployFingerprint.ts): the signature
        // fingerprint is now MODE-aware. An MLA covers the market terms, so any form change
        // forces a re-sign; a REFUSAL only covers the predicted market + signing time (both
        // re-validated server-side in handleClickDeploy right before deployment). At the pin
        // every field change invalidated a refusal too; on head that is intentionally gone —
        // matching the refusal wording asserted above, which references market identity only.
        await page
          .getByRole("button", { name: /Basic Market Terms/ })
          .first()
          .click()
        await fillField(page, "Base APR", "11")
        await page
          .getByRole("button", { name: /Confirmation/ })
          .first()
          .click()
        await expect(
          page.getByText(/Market settings changed after you signed/),
        ).toHaveCount(0)
        await expect(deployButton(page)).toBeEnabled({ timeout: 15_000 })
      },
      { req: ["REQ-BOP-071"] },
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
      { req: ["REQ-BOP-030", "REQ-BOP-064"] },
    )
    // Abandoned on purpose — no deploy in this case.
  })

  test.fixme("MKT-18: Safe + MLA deployment", requirements(["REQ-BOP-068"]), async () => {
    // Requires a Safe (Gnosis) wallet + the Safe Apps SDK transport; the harness only drives the
    // Local Anvil EOA connector. The Safe draft/resume plumbing exists in the app
    // (createMarketSigningDraftsSlice, pendingSafeMessagesSlice) but cannot be exercised without
    // a Safe signer set + the Safe UI. Infrastructure gap — manual test.
  })

  test("MKT-19: staged deploy (1/3 token, 2/3 market, 3/3 wrapper) + exact token identity + MLA upload", requirements(["REQ-BOP-067", "REQ-BOP-137"]), async ({
    page,
  }) => {
    // Observations recorded during the MKT-16 deploy (same staged pipeline).
    const stepToasts = d16.toasts.filter((t) => /Step \d\/3/.test(t))
    await step(
      page,
      "the staged deploy announced each of its three stages and the MLA step",
      async () => {
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
      },
      { req: ["REQ-BOP-067"] },
    )

    // Token name and symbol deploy exactly as entered (no auto-suffix), on both the freshly
    // deployed mock asset and the market token derived from it.
    const onChain = await readNewMarket(d16.market)
    const assetMeta = await erc20Meta(onChain.asset)
    await step(
      page,
      "the token deployed with exactly the name and symbol entered",
      async () => {
        expect(assetMeta.name).toBe(asset.name)
        expect(assetMeta.symbol).toBe(asset.symbol)
        expect(onChain.name).toBe(`${d16.namePrefix} ${asset.name}`)
        expect(onChain.symbol).toBe(`${d16.symbolPrefix}${asset.symbol}`)
      },
      { req: ["REQ-BOP-137"] },
    )
    attachAgreement("MKT-19 staged deploy", {
      toasts: d16.toasts.filter((t) => /Step \d\/3|MLA/i.test(t)),
      assetMeta,
      marketName: onChain.name,
      marketSymbol: onChain.symbol,
    })
  })

  test("MKT-20: completion modal — Close is the only exit; no re-signable state behind it", requirements(["REQ-BOP-070"]), async ({
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
    await step(
      page,
      "clicking outside does not dismiss the dialog",
      async () => {
        // A deterministic backdrop click: MUI's Dialog treats a click on its own
        // `.MuiDialog-container` (which spans the backdrop) as a backdrop-click, whereas a raw
        // viewport coordinate like (5, 5) can land on whatever overlay happens to be there.
        // Click the completion dialog's own container, outside its centred paper, so this
        // leaves it open for a reason the test controls rather than by luck.
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
          "a backdrop click does not dismiss the completion dialog",
        ).toBeVisible()
        await page.keyboard.press("Escape")
        await expect(
          successTitle,
          "an Escape press does not dismiss the completion dialog",
        ).toBeVisible()
      },
      { req: ["REQ-BOP-070"] },
    )

    await step(
      page,
      "no path back to a re-signable review state",
      async () => {
        // Refusal flow: the only exit is the overview button (no MLA download button).
        await expect(
          page.getByRole("button", { name: "View/Download MLA" }),
        ).toHaveCount(0)
        await closeSuccessDialog(page)
        // Regression (re-prompt bug): landing page must not ask for another signature.
        await expect(page.getByText("Market created!")).toHaveCount(0)
        await expect(
          page.getByRole("button", { name: "Sign MLA Refusal" }),
        ).toHaveCount(0)
      },
      { req: ["REQ-BOP-070"] },
    )
  })

  test("MKT-21: new markets appear on the borrower overview; indexing lag recorded", requirements(["REQ-BOP-134"]), async ({
    page,
  }) => {
    await connectAs(page, 3)
    await page.goto("/borrower")
    await ensureConnected(page, borrower)
    // The overview reads the subgraph; deployAndAwait already proved indexing. Here: the UI
    // lists the newest market (deployed in MKT-20 moments ago) — a reload is permitted by the
    // runsheet within an agreed threshold, so poll with periodic reloads.
    await step(
      page,
      "the newest market appears on the borrower overview",
      async () => {
        await expect
          .poll(
            async () => {
              const visible = await page
                .getByText(d20.marketName)
                .first()
                .isVisible()
                .catch(() => false)
              if (!visible) await page.reload()
              return visible
            },
            {
              timeout: 120_000,
              message: "newest market visible on the overview",
            },
          )
          .toBe(true)
        await expect(page.getByText(d1.marketName).first()).toBeVisible({
          timeout: 60_000,
        })
      },
      { req: ["REQ-BOP-134"] },
    )
    attachAgreement("MKT-21 visibility", {
      subgraphIndexingLagMsByCase: indexingLags,
      note: "lag measured from deploy-success dialog to the market appearing in the fork subgraph",
    })
  })

  test("MKT-22: wrapper opted in at creation is deployed and linked", requirements(["REQ-BOP-063"]), async ({
    page,
  }) => {
    const wrapper = await registeredWrapper(d16.market)
    await step(
      page,
      "the market records a deployed wrapper",
      async () => {
        expect(wrapper, "market records its wrapper").not.toBe(zeroAddress)
      },
      { req: ["REQ-BOP-063"] },
    )
    const code = await getCode(wrapper as Address)
    await step(
      page,
      "the recorded wrapper address holds contract code",
      async () => {
        expect(code && code !== "0x", "wrapper has code").toBe(true)
      },
      { req: ["REQ-BOP-063"] },
    )

    await connectAs(page, 3)
    await page.goto(`/borrower/market/${d16.market.toLowerCase()}`)
    await ensureConnected(page, borrower)
    await page
      .getByRole("button", { name: /Wrapped Debt Token/ })
      .first()
      .click()
    await step(
      page,
      "the market page shows the wrapper instead of the deploy CTA",
      async () => {
        // VERIFY: with a wrapper present the section shows the wrapper UI, not
        // the deploy CTA.
        await expect(page.getByText("No wrapper deployed")).toHaveCount(0)
      },
      { req: ["REQ-BOP-063"] },
    )
    attachAgreement("MKT-22 wrapper", { market: d16.market, wrapper })
  })

  test("MKT-23: market without wrapper offers post-hoc deployment on both sides", requirements(["REQ-WRP-008", "REQ-WRP-009"]), async ({
    page,
  }) => {
    expect(await registeredWrapper(d1.market)).toBe(zeroAddress)

    await connectAs(page, 3)
    await step(page, "borrower side offers wrapper deployment", async () => {
      // Retry through the late deep-link bounce (KNOWN-ISSUES #1).
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
      await expect(
        page.getByRole("button", { name: "Deploy Wrapper" }),
      ).toBeVisible({ timeout: 30_000 })
    })

    await step(page, "lender side offers wrapper deployment too", async () => {
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
      await expect(
        page.getByRole("button", { name: "Deploy Wrapper" }),
      ).toBeVisible({ timeout: 30_000 })
    })
    // Actual post-hoc wrapper deployment is covered on sheet 6.
  })

  test("MKT-24: market description — borrower login, edit, save; renders for lenders", requirements(["REQ-BOP-032"]), async ({
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

    await step(
      page,
      "borrower logs in and saves a description",
      async () => {
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
      },
      { req: ["REQ-BOP-032"] },
    )

    await step(
      page,
      "description renders on the lender side",
      async () => {
        await page.goto(`/lender/market/${d1.market.toLowerCase()}`)
        await ensureConnected(page, borrower)
        await page
          .getByRole("button", { name: /Market Description/ })
          .first()
          .click()
        await expect(
          page.getByText(`E2E market description ${stamp}`, { exact: false }),
        ).toBeVisible({ timeout: 60_000 })
      },
      { req: ["REQ-BOP-032"] },
    )
    attachAgreement("MKT-24 description", { market: d1.market, description })
  })

  test("teardown: suite left the shared fixtures intact", infra("teardown"), async () => {
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
