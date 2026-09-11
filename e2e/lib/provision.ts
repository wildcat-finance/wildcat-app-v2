/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import {
  gql,
  pins,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "./env"
import {
  borrower,
  ensureBorrowerRegistered,
  seedBorrowerProfile,
} from "../borrowerflows/helpers"
import { deployMarket, type DeployedFixture } from "../mainflows/lib"

/**
 * Fast fixture-provisioning for the MAIN (live v2/v2.1) board.
 *
 * Replaces the create-market WIZARD replay (borrowerflows/market-creation.spec.ts run as the
 * "fixtures" Playwright project) with direct chain-side factory provisioning, reusing the SAME SDK
 * deploy path mainflows/v2-protocol.spec.ts already exercises (mainflows/lib.ts deployMarket →
 * HooksFactory.deployMarketAndHooks). market-creation.spec.ts still runs — as coverage — inside the
 * "board" project.
 *
 * WHY THIS IS SMALL ON MAIN (see e2e/FIXTURE-MANIFEST.md):
 *   - main's borrower/edge suites discover their fixtures from the IMPERSONATED pre-fork borrower
 *     (pins.borrower.address), NOT anvil #3, so no downstream main suite consumes a #3 wizard
 *     market;
 *   - the fixed-term fixture resolves to the PINNED pins.markets.fixedTerm on main (the v2.1.8 fork
 *     subgraph does not index the v2.5 fork markets, and #3 owns none there at board start);
 *   - periodic/revolving/allowlist/wrapper market shapes either do not exist on main or are not
 *     consumed; v2-protocol.spec.ts self-provisions everything it needs.
 *
 * So this provisioner only needs to (a) register borrower #3 and seed its profile — which
 * market-creation coverage and MKT-M01 rely on — and (b) deploy a small open-term set under #3 for
 * parity with what the wizard-as-fixtures stage produced. It deliberately deploys NO fixed-term
 * market (that would divert resolveFixedTermFixture away from its pinned fallback) and reuses the
 * pinned openTerm asset rather than minting a fresh mock.
 *
 * Idempotent: a market whose deterministic name prefix is already indexed under #3 is skipped.
 */

const OPEN_TERM_FIXTURES: { namePrefix: string; symbolPrefix: string }[] = [
  { namePrefix: "E2E MC1", symbolPrefix: "E2EA" },
  { namePrefix: "E2E MC2", symbolPrefix: "E2EB" },
]

export type ProvisionResult = {
  namePrefix: string
  market: string
  hooks: string
  reused: boolean
}

/** Existing borrower-#3 market names on the fork subgraph, lowercased, for idempotency. */
const existingMarketNames = async (): Promise<string[]> => {
  const { markets } = await gql<{ markets: { name: string }[] }>(
    `{ markets(first: 200, where: { borrower: "${borrower.toLowerCase()}" }) { name } }`,
  )
  return markets.map((m) => m.name.toLowerCase())
}

/** The mock underlying pinned as the openTerm market's asset. */
const resolveAssetAddress = async (): Promise<Address> => {
  const { market } = await gql<{
    market: { asset: { address: string } } | null
  }>(
    `{ market(id: "${pins.markets.openTerm.toLowerCase()}") { asset { address } } }`,
  )
  if (!market)
    throw new Error("pinned openTerm market not indexed on the fork subgraph")
  return market.asset.address as Address
}

/**
 * Provision the MAIN fixture set for borrower #3. Idempotent (already-present markets skipped) and
 * safe to re-run against the same fork.
 */
export const provisionFixtures = async (): Promise<ProvisionResult[]> => {
  await syncChainTimeToWallClock()
  await ensureBorrowerRegistered()
  seedBorrowerProfile()
  await syncSubgraph()

  const assetAddress = await resolveAssetAddress()

  const results: ProvisionResult[] = []
  for (const spec of OPEN_TERM_FIXTURES) {
    const names = await existingMarketNames()
    const prefix = `${spec.namePrefix} `.toLowerCase()
    if (names.some((n) => n.startsWith(prefix))) {
      results.push({
        namePrefix: spec.namePrefix,
        market: "",
        hooks: "",
        reused: true,
      })
    } else {
      const fixture: DeployedFixture = await deployMarket({
        namePrefix: `${spec.namePrefix} `,
        symbolPrefix: spec.symbolPrefix,
        assetAddress,
        template: "OpenTermHooks",
        annualInterestBips: 1000,
        delinquencyFeeBips: 1000,
        reserveRatioBips: 2000,
        delinquencyGracePeriod: 3600,
        withdrawalBatchDuration: 3600,
        maxTotalSupplyUnits: "1000000",
        minimumDepositUnits: "0",
      })
      results.push({
        namePrefix: spec.namePrefix,
        market: fixture.market,
        hooks: fixture.hooks,
        reused: false,
      })
    }
  }
  return results
}
