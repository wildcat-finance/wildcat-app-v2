/* eslint-disable no-restricted-syntax, import/no-extraneous-dependencies */
import { provisionFixtures } from "./lib/provision"
import { attachAgreement } from "./lib/step"
import { expect, test } from "./lib/test"

/**
 * The "fixtures" Playwright project (MAIN variant).
 *
 * Fast, chain-side replacement for the create-market WIZARD replay: it registers borrower #3, seeds
 * its profile, and deploys a small open-term set via the hooks factory (see e2e/lib/provision.ts),
 * instead of driving the create-market UI. The "board" project depends on this project.
 *
 * On main the downstream borrower/lender suites discover their fixtures from the impersonated
 * pre-fork borrower and the PINNED markets, so this stage is deliberately minimal — see
 * e2e/FIXTURE-MANIFEST.md. borrowerflows/market-creation.spec.ts still runs, as coverage, inside
 * the "board" project.
 *
 * Standalone validation against a FREE fork:
 *   npx playwright test --project=fixtures
 */
test("provision: register the borrower and deploy the open-term fixtures via the factory", async () => {
  test.setTimeout(300_000)

  const results = await provisionFixtures()
  const fresh = results.filter((r) => !r.reused)
  const reused = results.filter((r) => r.reused)

  for (const r of fresh) {
    expect(r.market, `${r.namePrefix}: market address resolved`).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    )
    expect(r.hooks, `${r.namePrefix}: hooks instance indexed`).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    )
  }

  attachAgreement("provisioned fixtures (main)", {
    total: results.length,
    fresh: fresh.map((r) => ({
      namePrefix: r.namePrefix,
      market: r.market,
      hooks: r.hooks,
    })),
    reusedNamePrefixes: reused.map((r) => r.namePrefix),
  })
})
