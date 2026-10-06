import { Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

import {
  getSubgraphMarketOnboardingMode,
  MarketOnboardingMode,
} from "./marketOnboarding"

const makeGatedMarket = (
  roleProviders: Array<{
    isApproved: boolean
    isPullProvider: boolean
    pullProviderIndex: number
  }>,
  canSelfOnboard: boolean,
) =>
  ({
    version: MarketVersion.V2,
    hooksConfig: {
      flags: { useOnDeposit: true },
      depositRequiresAccess: true,
    },
    hooksInstance: { roleProviders },
    // Deliberately model the SDK getter separately from the provider index.
    // Subgraph data can make these disagree for borrower-only push providers.
    canSelfOnboard,
  }) as unknown as Market

describe("getSubgraphMarketOnboardingMode", () => {
  it("treats a borrower-only provider as manual despite the SDK getter", () => {
    const market = makeGatedMarket(
      [
        {
          isApproved: true,
          isPullProvider: true,
          pullProviderIndex: -1,
        },
      ],
      true,
    )

    expect(getSubgraphMarketOnboardingMode(market)).toBe(
      MarketOnboardingMode.BorrowerApproval,
    )
  })

  it("treats an approved provider with a pull slot as self-onboarding", () => {
    const market = makeGatedMarket(
      [
        {
          isApproved: true,
          isPullProvider: false,
          pullProviderIndex: 0,
        },
      ],
      false,
    )

    expect(getSubgraphMarketOnboardingMode(market)).toBe(
      MarketOnboardingMode.SelfOnboard,
    )
  })
})
