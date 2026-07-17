import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import {
  getConfiguredSubgraphClient,
  isSubgraphAnalyticsConfigured,
  isSubgraphPricingConfigured,
} from "./subgraphCapabilities"

describe("subgraph capabilities", () => {
  it("distinguishes analytics support from USD-pricing support", () => {
    expect(isSubgraphAnalyticsConfigured(SupportedChainId.PlasmaMainnet)).toBe(
      true,
    )
    expect(isSubgraphPricingConfigured(SupportedChainId.PlasmaMainnet)).toBe(
      false,
    )
    expect(isSubgraphPricingConfigured(SupportedChainId.Sepolia)).toBe(true)
  })

  it("does not construct clients for unsupported chains", () => {
    expect(getConfiguredSubgraphClient(undefined)).toBeUndefined()
    expect(getConfiguredSubgraphClient(42)).toBeUndefined()
  })
})
