/* eslint-disable no-restricted-syntax, import/no-extraneous-dependencies */
import { provisionFixtures, FIXTURES } from "./lib/provision"
import { attachAgreement } from "./lib/step"
import { expect, test } from "./lib/test"

/**
 * The "fixtures" Playwright project.
 *
 * Fast, chain-side replacement for the ~20-minute market-creation WIZARD replay: it deploys the
 * board's shared borrower-#3 market/policy set by calling the hooks factories DIRECTLY (see
 * e2e/lib/provision.ts), instead of driving the create-market UI. The "board" project depends on
 * this project, so every downstream suite still finds the fixtures it discovers by shape — but no
 * longer waits out a full wizard run first.
 *
 * borrowerflows/market-creation.spec.ts (MKT-01…24) still runs, as coverage, inside the "board"
 * project; it deploys its OWN run-stamped scratch markets and asserts on them, and tolerates the
 * pre-provisioned markets (its `before`-set diffing excludes them). See e2e/FIXTURE-MANIFEST.md.
 *
 * Standalone validation against a FREE fork:
 *   npx playwright test --project=fixtures
 */
test("provision: deploy the board fixture set via the hooks factories", async () => {
  test.setTimeout(600_000)

  const results = await provisionFixtures()
  expect(results.length, "one result per declared fixture").toBe(
    FIXTURES.length,
  )

  const fresh = results.filter((r) => !r.reused)
  const reused = results.filter((r) => r.reused)

  // Everything freshly deployed must have landed on chain and indexed with a hooks instance.
  for (const r of fresh) {
    expect(r.market, `${r.namePrefix}: market address resolved`).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    )
    expect(r.hooks, `${r.namePrefix}: hooks instance indexed`).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    )
  }

  attachAgreement("provisioned fixtures", {
    total: results.length,
    fresh: fresh.map((r) => ({
      namePrefix: r.namePrefix,
      policy: r.policyName,
      market: r.market,
      hooks: r.hooks,
      wrapper: r.wrapper,
    })),
    reusedNamePrefixes: reused.map((r) => r.namePrefix),
  })
})
