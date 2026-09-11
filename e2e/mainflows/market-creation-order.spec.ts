/* eslint-disable import/no-extraneous-dependencies */
import {
  captureDeployDiagnostics,
  chooseMla,
  clickNext,
  controlIn,
  deployButton,
  drainToasts,
  ensureBorrowerRegistered,
  ensureBorrowerTouSigned,
  fillBasicStep,
  fillField,
  fillFinancialStep,
  fillWrapperStep,
  gotoCreateMarket,
  seedBorrowerProfile,
  selectField,
  signMlaRefusal,
  type CreateMarketConfig,
} from "../borrowerflows/helpers"
import { pins } from "../lib/env"
import { connectAs } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * KNOWN-ISSUES [main-variant] M8 — the create-market wizard deploys a NEW-POLICY market through
 * the wrong hooks template, and M5 is the symptom.
 *
 * `useNewMarketHooksData` chooses the template in a `useEffect` that READS `marketType`:
 *
 *     const selectedHooksKind =
 *       marketType === "standard" ? HooksKind.OpenTerm : HooksKind.FixedTerm
 *     ...
 *     }, [hooksData, policyValue])          // <- marketType is NOT a dependency
 *
 * `defaultMarketForm.marketType` is `""`, so the effect fires when "Create New Policy" is picked,
 * evaluates `"" === "standard"` as false, and latches **FixedTermHooks**. Choosing "Open Term
 * Loan" afterwards never re-runs it. The deploy then calls
 * `FixedTermHooksTemplate.previewDeployMarket` with no maturity and throws
 * `invalid BigNumber value (argument="value", value=undefined)` inside ethers, before any RPC.
 *
 * That is M5 — but M5 was recorded as a FIXED-TERM problem. It is not: on main it fires for every
 * market created under a new policy, open-term included, which is why the whole wizard looked
 * unusable. It also answers M5's open question ("why does main's form state lose the maturity the
 * user picked?"): it never did. The maturity is absent because the market is open-term; the
 * TEMPLATE is the thing that is wrong.
 *
 * Because the type select is enabled while no policy is chosen, the suite works around it by
 * setting Market Type BEFORE the policy (`helpers.fillPolicyStep`), which makes the effect read
 * the right value when it does fire. This test drives the NATURAL order — the order a user
 * follows, top to bottom down the form — so the workaround can never quietly hide a regression,
 * and so the defect has an owner when someone fixes the dependency array upstream.
 *
 * It is a RACE, not a constant. The effect also re-runs whenever `hooksData` changes, so a
 * react-query refetch landing between the policy pick and the deploy heals the latch by accident
 * (measured on a full-board run). The case therefore asserts the latch when it is observable and
 * SKIPS with that reason when it is not — never a false green, never a flake.
 *
 * Usually deploy-neutral: when the latch holds the throw precedes any RPC and nothing is mined.
 * When it heals, one open-term market is deployed.
 */
test.describe.serial("main flows: template latch (MKT-M01)", () => {
  test.setTimeout(420_000)

  const stamp = Date.now().toString(36)

  test("MKT-M01: choosing the market type AFTER the policy deploys through the wrong template", async ({
    page,
  }) => {
    await ensureBorrowerRegistered()
    seedBorrowerProfile()
    await connectAs(page, 3)
    await ensureBorrowerTouSigned(page)

    const pinned = await subgraph.market(pins.markets.openTerm)
    expect(pinned, "pinned openTerm market on the fork subgraph").not.toBeNull()
    const asset = {
      address: pinned!.asset.address,
      name: "Dai Stablecoin",
      symbol: pinned!.asset.symbol,
    }

    const cfg: CreateMarketConfig = {
      policy: { kind: "new", name: `E2E M8 Pol ${stamp}` },
      implementation: "Standard",
      term: "Open Term Loan",
      access: "Lender Self-Onboarding",
      asset,
      namePrefix: `E2E M8 ${stamp}`,
      symbolPrefix: "E2EM8",
      financial: {
        capacity: "1000000",
        apr: "10",
        penalty: "10",
        reserve: "20",
        grace: "1",
        cycle: "1",
        minimumDeposit: "100",
      },
    }

    await gotoCreateMarket(page)

    await step(page, "fill the policy step top to bottom", async () => {
      // The NATURAL order — exactly what the form asks for, reading downwards. This is the order
      // helpers.fillPolicyStep deliberately does NOT use on main.
      await selectField(page, "Market Policy", "Create New Policy")
      await fillField(page, "Policy Name", cfg.policy.name as string)
      await selectField(page, "Market Type", "Open Term Loan")
      await selectField(page, "Access Control", "Lender Self-Onboarding")
    })

    await step(
      page,
      "walk the rest of the wizard to Confirmation",
      async () => {
        await clickNext(page)
        await fillBasicStep(page, cfg)
        await clickNext(page)
        await fillFinancialStep(page, cfg)
        await clickNext(page)
        await expect(
          controlIn(page, "Restrict Withdrawals", "checkbox"),
        ).toBeVisible({ timeout: 30_000 })
        await clickNext(page)
        await fillWrapperStep(page, cfg)
        await clickNext(page)
        await chooseMla(page, "refusal")
        await clickNext(page)
        await expect(deployButton(page)).toBeVisible({ timeout: 30_000 })
      },
    )

    await signMlaRefusal(page)

    const capture = captureDeployDiagnostics(page)
    await drainToasts(page)
    await deployButton(page).click()

    // The app's only user-visible surface is the generic modal; the diagnostic is the console.
    const failed = await page
      .getByText("Oops! Something went wrong!")
      .isVisible({ timeout: 120_000 })
      .catch(() => false)
    const diagnostics = await capture.stop()
    const consoleText = diagnostics.consoleErrors.join("\n")
    attachAgreement("MKT-M01 template latch", {
      marketTypeChosen: "Open Term Loan",
      errorModalShown: failed,
      m5Signature: /invalid BigNumber value.*value=undefined/.test(consoleText),
      fixedTermTemplateInStack:
        /FixedTermHooksTemplate\.previewDeployMarket/.test(consoleText),
      consoleErrors: diagnostics.consoleErrors.slice(0, 6),
    })

    // M8 is a RACE, not a constant, and this run is where that was measured. The effect also
    // re-runs whenever `hooksData` changes, so if react-query happens to refetch it between the
    // policy pick and the deploy, the latch heals by accident and an OpenTerm market deploys
    // normally (observed on a full-board run: "E2E M8 … Dai Stablecoin" indexed as OpenTerm,
    // console clean). That does not make the defect benign — the workaround in
    // `helpers.fillPolicyStep` is unconditional precisely because the timing cannot be relied on —
    // but it does mean this case must not fail when it cannot observe the latch.
    const latched = /FixedTermHooksTemplate/.test(consoleText)
    test.skip(
      !latched && !failed,
      "hooksData refetched between the policy pick and the deploy, which re-runs the template " +
        "effect and heals the latch by accident — M8 is timing-dependent. See KNOWN-ISSUES M8.",
    )

    expect(
      consoleText,
      "an OPEN TERM market deployed after the policy still throws M5's error",
    ).toMatch(/invalid BigNumber value.*value=undefined/)
    // The decisive half: the throw comes from the FIXED-TERM template, for a market the user
    // configured as open term. That is the latch, and it is what makes this M8 and not M5.
    expect(
      consoleText,
      "the throw comes from FixedTermHooksTemplate — the wrong template for this market",
    ).toMatch(/FixedTermHooksTemplate\.previewDeployMarket/)
    expect(failed, "the app surfaces only its generic error modal").toBe(true)
  })
})
