/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { parseUnits } from "viem"

import {
  absDiff,
  account0,
  ensureTouSigned,
  openSection,
  pinnedMarkets,
  selfCleanWithdrawals,
  simulateDepositAccess,
  wrapperConvertToAssets,
  wrapperMaxWithdraw,
  wrapperShares,
} from "./lib"
import {
  factoryV1,
  findWrapperDeployTx,
  indexedWrapperForMarket,
  indexedWrapperFactories,
  marketClosedAtBlock,
  marketGeneration,
  marketScaleFactor,
  scaleAmountDown,
  scaledBalanceOf,
  simulateCreateWrapper,
  wrapperDeployedAtCreation,
  wrapperForMarket,
  wrapperMaxRedeem,
  wrapperRedeemAll,
  wrapperSharesAt,
  wrapperTotalSupply,
  WRAPPER_FACTORY,
} from "./wrapperLib"
import {
  BORROWER,
  accessListProviders,
  borrowerMarkets,
  closeDialog,
  ensureBorrowerTouSigned,
  ensureMarketClosed,
  gotoBorrowerMarket,
  latestWithdrawalBatchExpiry,
  marketClosedRecords,
  marketIsClosed,
  waitBorrowerTxSuccess,
  type BorrowerMarketRow,
} from "../borrowerflows/lib"
import * as chain from "../lib/chain"
import {
  advanceTime,
  faucet,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import {
  connectAs,
  ensureConnected,
  gotoMarket,
  readWithdrawalsStatus,
} from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test, type Locator, type Page } from "../lib/test"

/**
 * UAT 6 Wrappers — the cases sheet 5 does not reach:
 *   WRP-01 post-hoc wrapper deployment by the BORROWER, then a lender wrap on it
 *   WRP-02 post-hoc wrapper deployment by a LENDER (the design says anyone may deploy)
 *   WRP-03 one canonical wrapper per market — a second deployment is rejected, both generations
 *   WRP-04 V2.5-generation lifecycle on MKT-22's at-creation wrapper (wrap → accrue → auto-unwrap
 *          withdraw → claim the underlying → zero shares)
 *   WRP-05 termination while wrapped supply exists — the holder can still unwrap and exit
 *
 * COVERAGE-SUGGESTIONS-2026-09-08 §3 asks for exactly these: an ACTUAL post-hoc deployment
 * (MKT-23 only proves the offer is rendered and explicitly defers the deployment to this sheet),
 * duplicate/canonical behaviour per generation, a lifecycle per SUPPORTED generation, and a
 * closure-with-wrapped-supply scenario. LEN-28…31 cover the same lifecycle on the LEGACY
 * generation (./wrappers-transfers.spec.ts); the generation semantics both suites assert are
 * documented and cited in ./wrapperLib.ts.
 *
 * COMPARISON NOTE: these are UAT sheet-6 rows with no counterpart in the `main` worktree, so
 * the report's main column shows `absent` for them. That is correct — the
 * WRP-* ids never existed there. LEN-28…31 deliberately stay in wrappers-transfers.spec.ts so
 * they keep pairing (the report keys on the UAT id, `e2e/lib/compare.ts`).
 *
 * ---------------------------------------------------------------------------------------------
 * FIXTURE SELECTION — this suite CLOSES a market, so it must not take one another suite picks.
 * Every consumer of borrower-#3 markets selects dynamically; their predicates are:
 *   - borrower-ops primary + BOP-22/BOP-23 close targets, and lenderflows/allowlist-closure:
 *     OPEN-TERM, NON-REVOLVING only (borrower-ops.spec.ts:135-190, allowlist-closure.spec.ts:71-75)
 *   - apr-rcf-operations (BOP-16/33, LEN-26): REVOLVING with periodDuration === 0
 *     (apr-rcf-operations.spec.ts:391-396)
 *   - apr-periodic (BOP-17): periodDuration > 0 and NOT revolving (apr-periodic.spec.ts:225-229)
 *   - edge-regression: non-revolving, no fixed term, no period (edge-regression.spec.ts:406-413)
 * A REVOLVING market that ALSO has a withdrawal window (marketKind REVOLVING && periodDuration > 0)
 * is invisible to all four — that is MKT-07's fixture, and it is the ONLY market this suite
 * closes. Deploying a wrapper is additive and destroys nothing, so WRP-02's lender-side
 * deployment may use any other wrapper-less spare.
 */
test.describe.serial("lender flows: wrapper deployment & closure (WRP-01…05)", () => {
  const legacyMarket = pinnedMarkets.wrapperMarket.toLowerCase() as Address

  /** MKT-07's fixture shape: revolving AND periodic — claimed by no other suite (see header). */
  const isUnclaimedSpare = (m: BorrowerMarketRow) =>
    m.marketKind === "REVOLVING" && (m.hooksConfig?.periodDuration ?? 0) > 0

  let closeTarget: BorrowerMarketRow | undefined
  let borrowerDeployTarget: BorrowerMarketRow | undefined
  let lenderDeployTarget: BorrowerMarketRow | undefined
  let v25Fixture: BorrowerMarketRow | undefined
  let v25Wrapper: Address
  let deployedWrapper: Address

  const requireCloseTarget = () =>
    test.skip(
      !closeTarget,
      "no open revolving+periodic borrower-#3 market — MKT-07 deploys it; closing any other #3 market would destroy another suite's fixture (see the fixture-selection note)",
    )
  const requireBorrowerDeployTarget = () =>
    test.skip(
      !borrowerDeployTarget,
      "no open borrower-#3 market still WITHOUT a wrapper — wrapper registration is write-once, so a re-run on the same board has nothing left to deploy",
    )

  const openWrapperSection = async (page: Page) => {
    const section = page.getByTestId("wrap-debt-token-section")
    await openSection(page, /wrapped debt token/i, section)
    await expect(section).toBeVisible({ timeout: 30_000 })
    return section
  }

  /** Borrower pages carry no section testid; retry through the deep-link bounce (KNOWN-ISSUES #1). */
  const openBorrowerWrapperSection = async (page: Page, market: string) => {
    await expect(async () => {
      if (!page.url().includes(market.toLowerCase())) {
        await gotoBorrowerMarket(page, market)
        await ensureConnected(page, BORROWER)
      }
      await page
        .getByRole("button", { name: /Wrapped Debt Token/ })
        .first()
        .click()
      await expect(
        page
          .getByText("No wrapper deployed")
          .or(page.getByText(/wrapper contract/i))
          .first(),
      ).toBeVisible({ timeout: 15_000 })
    }).toPass({ timeout: 120_000 })
  }

  /** See wrappers-transfers.spec.ts — never auto-wait for an ABSENT element inside a poll. */
  const awaitOnChain = async (
    page: Page,
    what: string,
    done: () => Promise<boolean>,
    timeout = 120_000,
  ) => {
    try {
      await expect.poll(done, { timeout, message: what }).toBe(true)
    } catch (error) {
      const appError = await page
        .getByText(
          /oops|something goes wrong|something went wrong|failed to deploy|try again|reverted|transaction failed/i,
        )
        .first()
        .innerText({ timeout: 2_000 })
        .catch(() => null)
      throw new Error(
        `${what}: no on-chain effect${
          appError ? ` — the app rendered: "${appError.trim()}"` : ""
        }\n${(error as Error).message}`,
      )
    }
  }

  const approveWrapIfNeeded = async (section: Locator) => {
    const approve = section.getByRole("button", { name: /^approve$/i })
    const approved = section.getByRole("button", { name: /^approved$/i })
    await expect(approve.or(approved).first()).toBeVisible({ timeout: 30_000 })
    if (await approve.count()) {
      await expect(approve).toBeEnabled({ timeout: 60_000 })
      await approve.click()
      await expect(approved).toBeVisible({ timeout: 120_000 })
    }
  }

  /** Wrap `units` of market tokens through the lender UI; returns the shares minted. */
  const wrapThroughUi = async (
    page: Page,
    market: Address,
    wrapper: Address,
    units: string,
  ) => {
    const section = await openWrapperSection(page)
    const shares0 = await wrapperShares(wrapper, account0)
    await expect(section.getByRole("tab", { name: /^wrap$/i })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await section.getByRole("textbox").first().fill(units)
    await approveWrapIfNeeded(section)
    // The receive-quote debounces; submitting early can send a zero-value deposit.
    await expect(section.getByText(/~\s*[1-9]/).first()).toBeVisible({
      timeout: 30_000,
    })
    const wrapButton = section.getByRole("button", { name: /^wrap tokens$/i })
    await expect(wrapButton).toBeEnabled({ timeout: 60_000 })
    await wrapButton.click()
    await awaitOnChain(
      page,
      `wrap ${units} on ${market}`,
      async () => (await wrapperShares(wrapper, account0)) > shares0,
    )
    return (await wrapperShares(wrapper, account0)) - shares0
  }

  /**
   * Redeem every wrapper position anvil #0 holds across the borrower's markets. Setup hygiene:
   * a crashed run can leave wrapped balances behind, and WRP-04/05 assert zero-share end states.
   */
  const sweepWrapperPositions = async (markets: BorrowerMarketRow[]) => {
    const redeemed: Record<string, string> = {}
    for (const m of markets) {
      const w = await wrapperForMarket(m.id as Address)
      if (!w) continue
      const shares = await wrapperRedeemAll(account0, w)
      if (shares > 0n) redeemed[m.name] = shares.toString()
    }
    return redeemed
  }

  /** Fund + deposit chain-side. UI deposits are covered elsewhere and some fixtures are MLA-gated. */
  const seedLenderPosition = async (m: BorrowerMarketRow, units: bigint) => {
    const market = m.id as Address
    const token = m.asset.address as Address
    const decimals = m.asset.decimals
    const amount = parseUnits(units.toString(), decimals)
    if ((await chain.marketBalance(market, account0)) >= amount) return
    // Fund FIRST: WildcatMarket._depositUpTo runs the access hook BEFORE
    // `asset.safeTransferFrom`, so simulating on an unfunded wallet reverts in the transfer
    // (Solady TransferFromFailed, 0x7939f424) and says nothing about access.
    faucet(account0, amount * 2n, token)
    await chain.approve(account0, token, market, amount * 2n)
    const access = await simulateDepositAccess({
      account: account0,
      market,
      amount,
    })
    expect(
      access.reverted ? access.errorName ?? access.message : "ok",
      `lender can deposit into ${m.name}`,
    ).toBe("ok")
    await chain.depositUpTo(account0, market, amount)
    await syncSubgraph()
  }

  test("setup: fixtures, agreements and wrapper hygiene", async ({ page }) => {
    await syncChainTimeToWallClock()
    const all = await borrowerMarkets()
    const open = all.filter((m) => !m.isClosed)
    test.skip(
      open.length === 0,
      "no open market owned by borrower #3 — run the page-3 market-creation suite first",
    )

    // Which markets already carry a wrapper (generation-agnostic factory discovery). Closed
    // markets are included: WRP-05 can resume on one, and a missing entry must never read as
    // "no wrapper" for the deployment targets.
    const wrapperOf = new Map<string, Address | null>()
    for (const m of all) {
      wrapperOf.set(m.id, await wrapperForMarket(m.id as Address))
    }

    // The market WRP-05 terminates. Chosen by SHAPE, not by wrapper state: wrapper registration
    // is write-once, so requiring "no wrapper yet" here would make the closure case unrunnable
    // on any board this suite has already touched. An ALREADY-CLOSED spare is still a valid
    // subject when its exit is unfinished — termination is irreversible and there is only ever
    // one such market, so WRP-05 has to be able to resume (see the case itself).
    const spares = all.filter(isUnclaimedSpare)
    closeTarget = spares.find((m) => !m.isClosed) ?? spares[0]

    // Deployment targets: markets that still have NO wrapper. Deploying one is ADDITIVE — it
    // closes nothing and changes no market parameter — but still skip the markets the allowlist /
    // RCF / periodic suites identify by shape, so their discovery keeps landing where they expect.
    let primary: string | undefined
    for (const m of open) {
      if ((m.hooksConfig?.fixedTermEndTime ?? 0) > 0) continue
      if ((m.hooksConfig?.periodDuration ?? 0) > 0) continue
      if (m.marketKind === "REVOLVING") continue
      const provs = await accessListProviders(m.hooks!.id)
      if (provs.length > 0) {
        primary = m.id
        break
      }
    }
    const spare = (m: BorrowerMarketRow) =>
      !m.isClosed &&
      !wrapperOf.get(m.id) &&
      m.id !== primary &&
      !(
        m.marketKind === "REVOLVING" &&
        (m.hooksConfig?.periodDuration ?? 0) === 0
      ) &&
      !(
        m.marketKind !== "REVOLVING" && (m.hooksConfig?.periodDuration ?? 0) > 0
      )
    // Prefer the close target so a fresh board tells one story on one market: deploy → wrap →
    // terminate → exit. Otherwise take any other wrapper-less spare (non-fixed-term first).
    const deployable = open.filter(spare)
    borrowerDeployTarget =
      (closeTarget && spare(closeTarget) ? closeTarget : undefined) ??
      deployable.find((m) => (m.hooksConfig?.fixedTermEndTime ?? 0) === 0) ??
      deployable[0]
    const remaining = deployable.filter((m) => m !== borrowerDeployTarget)
    lenderDeployTarget =
      remaining.find((m) => (m.hooksConfig?.fixedTermEndTime ?? 0) === 0) ??
      remaining[0]

    // WRP-04's fixture: the market MKT-22 opted into a wrapper AT CREATION. "Has a wrapper" is
    // NOT enough — after a previous run of this suite, WRP-01/02's post-hoc wrappers look
    // identical on chain — so the indexed deployment block decides. It must also be an
    // ordinary open-term market: WRP-04 completes the request/claim path, which a pre-maturity
    // FIXED-TERM market locks by design (the Withdraw button renders "Fixed Term") and a
    // PERIODIC market gates to its window.
    for (const m of open) {
      if (!wrapperOf.get(m.id)) continue
      if (m === closeTarget) continue
      if ((m.hooksConfig?.fixedTermEndTime ?? 0) > 0) continue
      if ((m.hooksConfig?.periodDuration ?? 0) > 0) continue
      if (!(await wrapperDeployedAtCreation(m.id as Address))) continue
      v25Fixture = m
      break
    }

    faucet(account0, parseUnits("1", 18))
    faucet(BORROWER, parseUnits("1", 18))
    // Signature ceremonies run on the WALL clock (the APIs bound timeSigned to the server).
    await ensureTouSigned(page, account0, pinnedMarkets.noMla)
    await connectAs(page, 3)
    await ensureBorrowerTouSigned(page)

    // Self-clean: no wrapper shares and no open withdrawal batches anywhere this suite asserts a
    // zero end state. selfCleanWithdrawals advances chain time to a leftover batch's expiry, so
    // it is scoped to the fixture that needs it.
    const swept = await sweepWrapperPositions(open)
    if (v25Fixture) {
      v25Wrapper = wrapperOf.get(v25Fixture.id)!
      await selfCleanWithdrawals(account0, v25Fixture.id as Address)
    }
    // Only while the close target is still OPEN: once it is terminated, a leftover batch is
    // exactly the state WRP-05 resumes from, and claiming it here would erase the case.
    if (closeTarget && !closeTarget.isClosed) {
      await selfCleanWithdrawals(account0, closeTarget.id as Address)
    }

    attachAgreement("WRP fixtures", {
      openMarkets: open.length,
      leftoverSharesRedeemed: swept,
      closeTarget: closeTarget
        ? {
            id: closeTarget.id,
            name: closeTarget.name,
            marketKind: closeTarget.marketKind,
            periodDuration: closeTarget.hooksConfig?.periodDuration,
            wrapper: wrapperOf.get(closeTarget.id) ?? null,
            note: "revolving AND periodic — matched by no other suite's fixture predicate",
          }
        : null,
      borrowerDeployTarget: borrowerDeployTarget
        ? { id: borrowerDeployTarget.id, name: borrowerDeployTarget.name }
        : null,
      lenderDeployTarget: lenderDeployTarget
        ? { id: lenderDeployTarget.id, name: lenderDeployTarget.name }
        : null,
      v25Fixture: v25Fixture
        ? { id: v25Fixture.id, name: v25Fixture.name, wrapper: v25Wrapper }
        : null,
      indexedWrapperFactories: await indexedWrapperFactories(),
      configuredFactory: WRAPPER_FACTORY,
      facadeV1Factory: await factoryV1(),
    })
  })

  test("WRP-01: borrower deploys a wrapper post-hoc; a lender can then wrap", async ({
    page,
  }) => {
    requireBorrowerDeployTarget()
    test.setTimeout(600_000)
    const market = borrowerDeployTarget!.id as Address
    const decimals = borrowerDeployTarget!.asset.decimals
    const fromBlock = await chain.publicClient.getBlockNumber()

    await step(page, "the market starts with no wrapper", async () => {
      // Generation first: only a V2.5 market answers registeredWrapper() at all.
      const gen = await marketGeneration(market)
      expect(gen.label, "close target generation").toBe("v2.5")
      expect(gen.roundsFloor, "declares scaleAmountDown rounding").toBe(true)
      expect(gen.registeredWrapper, "no wrapper registered yet").toBeNull()
      expect(await wrapperForMarket(market), "factory resolves nothing").toBeNull()
    })

    await connectAs(page, 3)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)
    await openBorrowerWrapperSection(page, market)

    await step(page, "deploy the wrapper from the borrower page", async () => {
      await expect(page.getByText("No wrapper deployed")).toBeVisible({
        timeout: 30_000,
      })
      const deploy = page.getByRole("button", { name: "Deploy Wrapper" })
      await expect(deploy).toBeEnabled({ timeout: 30_000 })
      await deploy.click()
      await awaitOnChain(
        page,
        "post-hoc wrapper deployment",
        async () => (await wrapperForMarket(market)) !== null,
      )
    })

    deployedWrapper = (await wrapperForMarket(market))!
    const deployTx = await findWrapperDeployTx(fromBlock)

    await step(page, "the deployed wrapper is real and canonical", async () => {
      const code = await chain.publicClient.getBytecode({
        address: deployedWrapper,
      })
      expect(code && code !== "0x", "wrapper has code").toBe(true)
      const gen = await marketGeneration(market)
      // V2.5 markets record their own wrapper (Wildcat4626WrapperFactory.sol:158).
      expect(
        gen.registeredWrapper,
        "the market records the deployed wrapper",
      ).toBe(deployedWrapper)
      expect(
        deployTx?.from,
        "the deployment was signed by the borrower",
      ).toBe(BORROWER.toLowerCase())
      await syncSubgraph()
      const indexed = await indexedWrapperForMarket(market)
      expect(indexed, "the wrapper is indexed").not.toBeNull()
      // The V2.5 target factory owns V2.5 markets; a legacy forward would show generation "v1".
      expect(indexed!.id.toLowerCase()).toBe(deployedWrapper)
      expect(indexed!.factory.id.toLowerCase()).toBe(WRAPPER_FACTORY)
    })

    await step(page, "the borrower page now shows the wrapper", async () => {
      await expect
        .poll(
          async () => {
            await page.reload()
            await ensureConnected(page, BORROWER)
            await page
              .getByRole("button", { name: /Wrapped Debt Token/ })
              .first()
              .click()
            return page.getByText("No wrapper deployed").count()
          },
          { timeout: 180_000, message: "deploy CTA replaced by the wrapper UI" },
        )
        .toBe(0)
    })

    // "Lenders can wrap" — the deployed wrapper's controls actually work.
    await seedLenderPosition(borrowerDeployTarget!, 300n)
    await connectAs(page, 0)
    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    const scaled0 = await scaledBalanceOf(market, account0)
    const minted = await step(page, "a lender wraps on the new wrapper", () =>
      wrapThroughUi(page, market, deployedWrapper, "150"),
    )
    const scaled1 = await scaledBalanceOf(market, account0)
    const scaleFactor = await marketScaleFactor(market)
    const wrapAmount = parseUnits("150", decimals)

    expect(
      scaled0 - scaled1,
      "the lender's scaled position fell by exactly the shares minted",
    ).toBe(minted)
    // V2.5 generation: the market declares floor scaling, so this is exact — not a tolerance.
    expect(minted, "shares minted are the floor-scaled wrap amount").toBe(
      scaleAmountDown(wrapAmount, scaleFactor),
    )
    attachAgreement("WRP-01 post-hoc deployment", {
      market,
      wrapper: deployedWrapper,
      deployedBy: deployTx?.from,
      deployTx: deployTx?.hash,
      registeredWrapper: (await marketGeneration(market)).registeredWrapper,
      wrapped: wrapAmount,
      sharesMinted: minted,
      scaleFactor,
      wrapperTotalSupply: await wrapperTotalSupply(deployedWrapper),
    })
  })

  test("WRP-02: a lender wallet can deploy the wrapper too", async ({
    page,
  }) => {
    test.skip(
      !lenderDeployTarget,
      "no second wrapper-less borrower-#3 market to deploy from a lender wallet",
    )
    const market = lenderDeployTarget!.id as Address
    const fromBlock = await chain.publicClient.getBlockNumber()

    await connectAs(page, 0)
    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    const section = await openWrapperSection(page)

    await step(page, "the lender page offers deployment", async () => {
      await expect(section.getByText("No wrapper deployed")).toBeVisible({
        timeout: 30_000,
      })
      const deploy = section.getByRole("button", { name: "Deploy Wrapper" })
      await expect(deploy).toBeEnabled({ timeout: 30_000 })
      await deploy.click()
      await awaitOnChain(
        page,
        "lender-side wrapper deployment",
        async () => (await wrapperForMarket(market)) !== null,
      )
    })

    const wrapper = (await wrapperForMarket(market))!
    const deployTx = await findWrapperDeployTx(fromBlock)
    // The protocol says "callable by anyone" (Wildcat4626WrapperFactory.sol:134); this records
    // that the BUILD agrees rather than gating deployment to the borrower.
    expect(deployTx?.from, "deployment signed by the lender wallet").toBe(
      account0.toLowerCase(),
    )
    expect(
      (await marketGeneration(market)).registeredWrapper,
      "the market records the lender-deployed wrapper",
    ).toBe(wrapper)
    await syncSubgraph()
    expect(
      (await indexedWrapperForMarket(market))?.id.toLowerCase(),
      "indexed",
    ).toBe(wrapper)
    attachAgreement("WRP-02 lender-side deployment", {
      market,
      name: lenderDeployTarget!.name,
      wrapper,
      deployedBy: deployTx?.from,
      deployTx: deployTx?.hash,
      outcome: "lender deployment permitted (not borrower-only in this build)",
    })
  })

  test("WRP-03: one canonical wrapper per market — a second deployment is rejected", async ({
    page,
  }) => {
    // Subject: any V2.5 market that already HAS its canonical wrapper — the one WRP-01 just
    // deployed when this board still had a wrapper-less spare, otherwise MKT-22's fixture.
    // (Wrapper registration is write-once, so WRP-01/02 can only run once per board; this case
    // does not depend on that.)
    const subject = borrowerDeployTarget ?? v25Fixture
    test.skip(!subject, "no V2.5 market with a wrapper to test uniqueness on")
    const market = subject!.id as Address
    expect(
      await wrapperForMarket(market),
      "the subject market has a wrapper",
    ).not.toBeNull()

    await step(page, "the UI no longer offers deployment", async () => {
      await connectAs(page, 0)
      await gotoMarket(page, market)
      await ensureConnected(page, account0)
      const section = await openWrapperSection(page)
      await expect(
        section.getByTestId("wrapper-share-balance"),
      ).toBeVisible({ timeout: 30_000 })
      expect(await section.getByText("No wrapper deployed").count()).toBe(0)
      expect(
        await section.getByRole("button", { name: "Deploy Wrapper" }).count(),
      ).toBe(0)
    })

    // V2.5 generation: the facade's own registry rejects the duplicate (…Factory.sol:141).
    const again = await simulateCreateWrapper({ account: account0, market })
    expect(again.reverted, "a second deployment reverts").toBe(true)
    expect(again.errorName, "canonical-wrapper guard").toBe(
      "WrapperAlreadyExists",
    )

    // LEGACY generation: the facade holds no local record, so the rejection can only come from
    // the forwarded v1 factory — which is the routing COMPATIBILITY.md describes.
    const legacyGen = await marketGeneration(legacyMarket)
    expect(legacyGen.label, "pinned market is legacy").toBe("legacy")
    const legacyAgain = await simulateCreateWrapper({
      account: account0,
      market: legacyMarket,
    })
    expect(legacyAgain.reverted, "legacy duplicate rejected too").toBe(true)
    expect(legacyAgain.errorName).toBe("WrapperAlreadyExists")

    const factories = await indexedWrapperFactories()
    const v1 = await factoryV1()
    expect(
      factories.some((f) => f.id.toLowerCase() === v1 && f.indexed),
      "the facade's v1 factory is an indexed generation (COMPATIBILITY.md: index EVERY generation)",
    ).toBe(true)
    attachAgreement("WRP-03 canonical wrapper", {
      v25Market: market,
      v25Error: again.errorName,
      legacyMarket,
      legacyError: legacyAgain.errorName,
      configuredFactory: WRAPPER_FACTORY,
      facadeV1Factory: v1,
      indexedFactories: factories.map((f) => ({
        id: f.id,
        generation: f.generation,
        deploymentTarget: f.deploymentTarget,
      })),
    })
  })

  test("WRP-04: V2.5 generation lifecycle on the at-creation wrapper (MKT-22)", async ({
    page,
  }) => {
    test.skip(
      !v25Fixture,
      "no borrower-#3 market with a wrapper deployed at creation — MKT-22 builds it",
    )
    test.setTimeout(900_000)
    const market = v25Fixture!.id as Address
    const token = v25Fixture!.asset.address as Address
    const decimals = v25Fixture!.asset.decimals
    const cycle = Number(v25Fixture!.withdrawalBatchDuration)
    const rateUnit = parseUnits("1", decimals)
    const WRAP = 200n
    const wrapAmount = parseUnits(WRAP.toString(), decimals)

    const gen = await marketGeneration(market)
    expect(gen.label, "MKT-22 fixture generation").toBe("v2.5")
    expect(gen.registeredWrapper, "registeredWrapper() matches discovery").toBe(
      v25Wrapper,
    )

    await seedLenderPosition(v25Fixture!, 400n)
    await connectAs(page, 0)
    await gotoMarket(page, market)
    await ensureConnected(page, account0)

    const scaled0 = await scaledBalanceOf(market, account0)
    const minted = await step(page, "wrap through the UI", () =>
      wrapThroughUi(page, market, v25Wrapper, WRAP.toString()),
    )
    const scaledAfterWrap = await scaledBalanceOf(market, account0)
    const sfAtWrap = await marketScaleFactor(market)
    expect(
      scaled0 - scaledAfterWrap,
      "the lender's scaled position fell by exactly the shares minted",
    ).toBe(minted)
    expect(minted, "V2.5 floor scaling — exact, not a tolerance").toBe(
      scaleAmountDown(wrapAmount, sfAtWrap),
    )
    const rateAtWrap = await wrapperConvertToAssets(v25Wrapper, rateUnit)

    await step(page, "shares do not rebase; redemption value grows", async () => {
      await advanceTime(1800)
      await chain.updateState(account0, market)
      expect(
        await wrapperShares(v25Wrapper, account0),
        "share COUNT is unchanged after interest accrual",
      ).toBe(minted)
      const rateNow = await wrapperConvertToAssets(v25Wrapper, rateUnit)
      expect(
        rateNow > rateAtWrap,
        `redemption value grew: ${rateNow} > ${rateAtWrap}`,
      ).toBe(true)
      expect(
        (await marketScaleFactor(market)) > sfAtWrap,
        "the market's scale factor grew",
      ).toBe(true)
    })

    const direct = await chain.marketBalance(market, account0)
    const wrapped = await wrapperMaxWithdraw(v25Wrapper, account0)
    let queued = 0n
    let expiry = 0

    await step(page, "auto-unwrap withdraw of the whole position", async () => {
      await gotoMarket(page, market)
      await ensureConnected(page, account0)
      // Bounded, with a message: a market whose withdrawals are locked renders "Fixed Term"
      // instead (WithdrawModal/index.tsx:452-461), and an unbounded click would just hang.
      const withdrawButton = page
        .getByRole("button", { name: /^withdraw$/i })
        .first()
      await expect(
        withdrawButton,
        "the lender page offers an unlocked Withdraw button",
      ).toBeEnabled({ timeout: 60_000 })
      await withdrawButton.click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      // The "All · <amount>" chip carries the exact combined TokenAmount and routes as a
      // full-share redeem (useWithdrawRouting.ts:180-233), so no share dust can remain.
      await dialog
        .getByRole("button", { name: /^All ·/ })
        .first()
        .click()
      await expect(dialog.getByText(/unwrapping/i).first()).toBeVisible({
        timeout: 30_000,
      })
      const confirm = dialog.getByRole("button", {
        name: /^withdraw .*2 steps$/i,
      })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      const leg1 = dialog.getByRole("button", { name: /confirm step 1 of 2/i })
      await expect(leg1).toBeEnabled({ timeout: 30_000 })
      await leg1.click()
      const leg2 = dialog.getByRole("button", { name: /confirm step 2 of 2/i })
      await expect(leg2).toBeEnabled({ timeout: 120_000 })
      await leg2.click()
      // The "Withdrawal Requested" view is NOT a usable oracle for a FULL exit: queueing the
      // whole balance takes the lender's market AND share balances to zero, and MarketActions —
      // which owns this dialog — unmounts in the window before the queued withdrawal is indexed
      // (CONVENTIONS "UI waits": assert the durable end state, not the transient modal).
      // Both legs' effects are on-chain and permanent, so assert those.
      await awaitOnChain(
        page,
        "both legs land: shares redeemed and the whole balance queued",
        async () =>
          (await wrapperShares(v25Wrapper, account0)) === 0n &&
          (await chain.marketBalance(market, account0)) <
            parseUnits("0.01", decimals),
      )
      await page.keyboard.press("Escape").catch(() => undefined)
    })

    expect(
      await wrapperShares(v25Wrapper, account0),
      "the unwrap leg redeemed every share",
    ).toBe(0n)
    expect(await wrapperMaxRedeem(v25Wrapper, account0), "nothing left").toBe(0n)
    await syncSubgraph()
    expiry = await latestWithdrawalBatchExpiry(market)
    const status = (await subgraph.lenderWithdrawalStatus(
      market,
      expiry,
      account0,
    ))!
    queued = BigInt(status.totalNormalizedRequests)
    expect(
      absDiff(queued, direct + wrapped) <= parseUnits("0.01", decimals),
      `queued the whole position: ${queued} vs direct ${direct} + wrapped ${wrapped}`,
    ).toBe(true)

    let claimed = 0n
    await step(page, "claim the underlying after the cycle", async () => {
      const now = await chain.blockTimestamp()
      if (now <= expiry) await advanceTime(expiry - now + 1)
      await chain.updateState(account0, market)
      await syncSubgraph()
      claimed = await chain.getAvailableWithdrawalAmount(
        market,
        account0,
        expiry,
      )
      expect(claimed > 0n, "batch paid").toBe(true)
      await gotoMarket(page, market)
      await ensureConnected(page, account0)
      const tokenBefore = await chain.erc20Balance(token, account0)
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
        (await chain.erc20Balance(token, account0)) - tokenBefore,
        "underlying asset received",
      ).toBe(claimed)
    })

    attachAgreement("WRP-04 V2.5 lifecycle", {
      market,
      wrapper: v25Wrapper,
      generation: gen.label,
      wrapped: wrapAmount,
      sharesMinted: minted,
      scaleFactorAtWrap: sfAtWrap,
      rateAtWrap,
      rateAtUnwrap: await wrapperConvertToAssets(v25Wrapper, rateUnit),
      directBefore: direct,
      wrappedBefore: wrapped,
      queued,
      claimedUnderlying: claimed,
      sharesAfter: await wrapperShares(v25Wrapper, account0),
      cycle,
    })
  })

  test("WRP-05: market terminated with wrapped supply — the holder unwraps and exits", async ({
    page,
  }) => {
    requireCloseTarget()
    test.setTimeout(900_000)
    const market = closeTarget!.id as Address
    const token = closeTarget!.asset.address as Address
    const decimals = closeTarget!.asset.decimals

    // The wrapper is usually the one WRP-01 just deployed; resolve it from the factory so this
    // case also runs on a board where the close target already carried one.
    const resolved = await wrapperForMarket(market)
    test.skip(
      !resolved,
      "the close target has no wrapper — WRP-01 deploys one when the board still has a wrapper-less spare",
    )
    const closeWrapper = resolved!

    // RESUMABLE. Termination is irreversible and there is exactly one market on the board this
    // suite may terminate (see the fixture-selection note), so a run interrupted after the
    // closure must be able to FINISH the exit rather than fail forever on an already-closed
    // market. Everything after the closure is idempotent, and the "supply was wrapped at
    // termination" evidence is read at the closing BLOCK, which is exact either way.
    const alreadyClosed = await marketIsClosed(market)
    if (alreadyClosed) {
      // Nothing left to prove if a previous run finished the exit: the market can only be
      // terminated once, so this is an honest "already covered on this board", not a pass.
      const open = await subgraph.openWithdrawalExpiries(market, account0)
      test.skip(
        (await wrapperShares(closeWrapper, account0)) === 0n &&
          (await chain.marketBalance(market, account0).catch(() => 0n)) <
            parseUnits("0.01", decimals) &&
          open.length === 0,
        "the only market this suite may terminate is already closed and its exit is finished — termination is irreversible and no other borrower-#3 market can be closed without destroying another suite's fixture, so this case is one-shot per board (run it on a fresh board, or after dev:fork:reset + the fixtures project)",
      )
    }

    if (!alreadyClosed) {
      // Wrapped supply must EXIST at termination — that is the whole point of the case.
      if ((await wrapperShares(closeWrapper, account0)) === 0n) {
        await seedLenderPosition(closeTarget!, 300n)
        await connectAs(page, 0)
        await gotoMarket(page, market)
        await ensureConnected(page, account0)
        await step(page, "wrap before termination", () =>
          wrapThroughUi(page, market, closeWrapper, "150"),
        )
      }
      expect(
        (await wrapperShares(closeWrapper, account0)) > 0n,
        "the holder holds wrapper shares going into the termination",
      ).toBe(true)
      expect(
        (await scaledBalanceOf(market, closeWrapper)) > 0n,
        "the wrapper holds market tokens",
      ).toBe(true)
    }

    await step(page, "the borrower terminates the market", async () => {
      if (alreadyClosed) return
      // Closing pulls the whole outstanding debt from the borrower's wallet.
      faucet(BORROWER, parseUnits("1000", decimals), token)
      await connectAs(page, 3)
      await gotoBorrowerMarket(page, market)
      await ensureConnected(page, BORROWER)
      await page
        .getByRole("button", { name: /terminate market/i })
        .first()
        .click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      // Either flow: a never-drawn market takes the simple confirmation, an indebted one the
      // repay-and-terminate path (same split BOP-22/BOP-23 handle).
      const approve = dialog.getByRole("button", { name: /^approve$/i })
      if (await approve.isEnabled({ timeout: 5_000 }).catch(() => false)) {
        await approve.click()
        await expect(
          dialog.getByRole("button", { name: /^approved$/i }),
        ).toBeVisible({ timeout: 90_000 })
      }
      const closeBtn = dialog
        .getByRole("button", { name: /repay and terminate|terminate market/i })
        .last()
      await expect(closeBtn).toBeEnabled({ timeout: 60_000 })
      await closeBtn.click()
      await waitBorrowerTxSuccess(page).catch(() => undefined)
      await closeDialog(page).catch(() => undefined)
      // Documented fallback for the OOG-behind-a-success-modal class (KNOWN-ISSUES #5); it
      // journals when it fires, so a chain-side close is never silently reported as a UI pass.
      await ensureMarketClosed(market, token, decimals)
      expect(await marketIsClosed(market), "market closed").toBe(true)
    })

    await syncSubgraph()
    expect(
      (await marketClosedRecords(market)).length,
      "closure indexed",
    ).toBeGreaterThan(0)

    // Wrapped supply EXISTED at termination — read AT the closing block, so the evidence is the
    // same whether this run closed the market or an interrupted earlier one did.
    const closedAt = await marketClosedAtBlock(market)
    expect(closedAt, "indexed closing block").not.toBeNull()
    const wrappedSupplyAtClose = await wrapperTotalSupply(closeWrapper, closedAt!)
    const sharesAtClose = await wrapperSharesAt(closeWrapper, account0, closedAt!)
    expect(
      wrappedSupplyAtClose > 0n,
      "there WAS wrapped supply outstanding at the termination block",
    ).toBe(true)
    expect(
      sharesAtClose > 0n,
      "the holder held wrapper shares at the termination block",
    ).toBe(true)
    // Termination does not touch the wrapper: nothing was force-unwound on the holder's behalf.
    expect(
      await wrapperTotalSupply(closeWrapper, closedAt! + 1n),
      "wrapped supply is unchanged by the closure itself",
    ).toBe(wrappedSupplyAtClose)

    const sharesHeld = await wrapperShares(closeWrapper, account0)
    const bal0 = await chain.marketBalance(market, account0)
    const scaled0 = await scaledBalanceOf(market, account0)

    await connectAs(page, 0)
    await gotoMarket(page, market)
    await ensureConnected(page, account0)

    let unwrappedThroughUi = false
    if (sharesHeld > 0n) {
      await step(page, "the holder unwraps everything after closure", async () => {
        const section = await openWrapperSection(page)
        await section.getByRole("tab", { name: /^unwrap$/i }).click()
        await section.getByRole("button", { name: /^max$/i }).click()
        await expect(section.getByRole("textbox").first()).not.toHaveValue("")
        const unwrapButton = section.getByRole("button", {
          name: /^unwrap tokens$/i,
        })
        await expect(unwrapButton).toBeEnabled({ timeout: 60_000 })
        await unwrapButton.click()
        await awaitOnChain(
          page,
          "unwrap on a terminated market",
          async () => (await wrapperShares(closeWrapper, account0)) === 0n,
        )
      })
      unwrappedThroughUi = true
      const scaled1 = await scaledBalanceOf(market, account0)
      expect(
        scaled1 - scaled0,
        "every share came back as market tokens",
      ).toBe(sharesHeld)
      expect(
        (await chain.marketBalance(market, account0)) - bal0 > 0n,
        "market tokens recovered",
      ).toBe(true)
    }
    // Either way the position is out of the wrapper — the closure left nothing stuck in it.
    expect(await wrapperShares(closeWrapper, account0), "no shares left").toBe(0n)
    expect(
      await wrapperMaxRedeem(closeWrapper, account0),
      "nothing left to redeem",
    ).toBe(0n)

    let claimed = 0n
    let queuedThroughUi = false
    const dust = parseUnits("0.01", decimals)

    await step(page, "and exits to the underlying — no cycle wait", async () => {
      // Reading a market view can revert transiently around a closed market's zero-duration
      // batch boundary (observed once as an arithmetic underflow in `balanceOf`); treat a
      // reverting read as "not settled yet" rather than as a failure.
      const liveBalance = async () =>
        chain.marketBalance(market, account0).catch(() => null)

      const before = await liveBalance()
      if (before === null || before > dust) {
        await gotoMarket(page, market)
        await ensureConnected(page, account0)
        // Bounded, with a message: a market whose withdrawals are locked renders "Fixed Term"
        // instead (WithdrawModal/index.tsx:452-461), and an unbounded click would just hang.
        const withdrawButton = page
          .getByRole("button", { name: /^withdraw$/i })
          .first()
        await expect(
          withdrawButton,
          "the lender page offers an unlocked Withdraw button",
        ).toBeEnabled({ timeout: 60_000 })
        await withdrawButton.click()
        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible({ timeout: 30_000 })
        await dialog
          .getByRole("button", { name: /^(All|Max) ·/ })
          .first()
          .click()
        const confirm = dialog.getByRole("button", { name: /^withdraw .*step/i })
        await expect(confirm).toBeEnabled({ timeout: 30_000 })
        await confirm.click()
        const sign = dialog.getByRole("button", {
          name: /confirm in wallet|confirm step 1 of/i,
        })
        if (await sign.isVisible({ timeout: 10_000 }).catch(() => false)) {
          await expect(sign).toBeEnabled({ timeout: 30_000 })
          await sign.click()
        }
        // Full exit — the success view unmounts with the position (see WRP-04). Durable oracle:
        // the market balance is queued away.
        await awaitOnChain(page, "the whole recovered balance is queued", async () => {
          const now = await liveBalance()
          return now !== null && now < dust
        })
        await page.keyboard.press("Escape").catch(() => undefined)
        queuedThroughUi = true
      }

      // A closed market queues into a ZERO-duration batch: claimable as soon as a block exists
      // whose timestamp is strictly past the expiry — no withdrawal cycle is imposed.
      await syncSubgraph()
      const expiry = await latestWithdrawalBatchExpiry(market)
      const now = await chain.blockTimestamp()
      expect(
        expiry <= now + 2,
        `closed market: zero-duration batch (expiry ${expiry} vs now ${now}, cycle ${closeTarget!.withdrawalBatchDuration}s)`,
      ).toBe(true)
      if (now <= expiry) await advanceTime(expiry - now + 2)
      await chain.updateState(account0, market)
      await syncSubgraph()
      claimed = await chain.getAvailableWithdrawalAmount(market, account0, expiry)
      expect(claimed > 0n, "the exit request is payable").toBe(true)

      await gotoMarket(page, market)
      await ensureConnected(page, account0)
      const tokenBefore = await chain.erc20Balance(token, account0)
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
        (await chain.erc20Balance(token, account0)) - tokenBefore,
        "underlying asset received through the app",
      ).toBe(claimed)
    })

    const leftover = await chain.marketBalance(market, account0)
    expect(
      leftover <= dust,
      `no stuck funds — market balance left: ${leftover}`,
    ).toBe(true)
    expect(await wrapperShares(closeWrapper, account0), "no shares left").toBe(0n)
    attachAgreement("WRP-05 termination with wrapped supply", {
      market,
      name: closeTarget!.name,
      wrapper: closeWrapper,
      closedAtBlock: Number(closedAt),
      terminatedByThisRun: !alreadyClosed,
      wrappedSupplyAtCloseBlock: wrappedSupplyAtClose,
      holderSharesAtCloseBlock: sharesAtClose,
      unwrappedThroughUi,
      queuedThroughUi,
      claimedUnderlying: claimed,
      residualMarketBalance: leftover,
      note: "market consumed by this suite — the revolving+periodic spare no other suite selects",
    })
  })

  test("teardown: board-state changes this suite made", async () => {
    // Leave no wrapped position behind on markets other suites still use (the terminated
    // WRP-05 market keeps its now-empty wrapper). Wrapper DEPLOYMENTS are write-once and stay.
    const redeemed: Record<string, string> = {}
    for (const m of [borrowerDeployTarget, lenderDeployTarget, v25Fixture]) {
      if (!m) continue
      const w = await wrapperForMarket(m.id as Address)
      if (!w) continue
      const shares = await wrapperRedeemAll(account0, w)
      if (shares > 0n) redeemed[m.name] = shares.toString()
      expect(await wrapperShares(w, account0), `no shares left on ${m.name}`).toBe(
        0n,
      )
    }
    await syncSubgraph()
    attachAgreement("WRP board-state delta", {
      wrappersDeployedByThisSuite: {
        borrower: borrowerDeployTarget
          ? {
              market: borrowerDeployTarget.id,
              name: borrowerDeployTarget.name,
              wrapper: await wrapperForMarket(borrowerDeployTarget.id as Address),
            }
          : null,
        lender: lenderDeployTarget
          ? {
              market: lenderDeployTarget.id,
              name: lenderDeployTarget.name,
              wrapper: await wrapperForMarket(lenderDeployTarget.id as Address),
            }
          : null,
      },
      marketTerminated: closeTarget
        ? { market: closeTarget.id, name: closeTarget.name }
        : null,
      leftoverSharesRedeemed: redeemed,
      chainTimestamp: await chain.blockTimestamp(),
    })
  })
})
