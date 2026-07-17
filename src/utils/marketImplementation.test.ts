import { MarketKind, MarketVersion } from "@wildcatfi/wildcat-sdk"

import {
  getMarketImplementationConfig,
  getMarketImplementationType,
  isStandardMarket,
  isRevolvingMarket,
} from "./marketImplementation"

describe("marketImplementation", () => {
  it("treats V1 markets as standard", () => {
    const market = {
      version: MarketVersion.V1,
      marketKind: "unknown" as const,
    }

    expect(getMarketImplementationType(market)).toBe<MarketKind>("standard")
    expect(isStandardMarket(market)).toBe(true)
    expect(isRevolvingMarket(market)).toBe(false)
  })

  it("preserves unknown V2 implementation data", () => {
    const market = {
      version: MarketVersion.V2,
      marketKind: "unknown" as const,
    }

    expect(getMarketImplementationType(market)).toBe<MarketKind>("unknown")
    expect(isStandardMarket(market)).toBe(false)
  })

  it("preserves explicit revolving implementation data", () => {
    const market = {
      version: MarketVersion.V2,
      marketKind: "revolving" as const,
    }

    expect(getMarketImplementationType(market)).toBe<MarketKind>("revolving")
    expect(isRevolvingMarket(market)).toBe(true)
    expect(isStandardMarket(market)).toBe(false)
  })

  it("returns stable display config for every implementation kind", () => {
    expect(getMarketImplementationConfig("standard")).toMatchObject({
      label: "Standard",
    })
    expect(getMarketImplementationConfig("revolving")).toMatchObject({
      label: "Revolving",
    })
    expect(getMarketImplementationConfig("unknown")).toMatchObject({
      label: "Unknown",
    })
  })
})
