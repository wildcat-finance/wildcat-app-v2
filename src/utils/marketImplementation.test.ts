import { MarketType, MarketVersion } from "@wildcatfi/wildcat-sdk"

import {
  getMarketImplementationConfig,
  getMarketImplementationType,
  isLegacyMarket,
  isRevolvingMarket,
} from "./marketImplementation"

describe("marketImplementation", () => {
  it("treats V1 markets as legacy", () => {
    const market = {
      version: MarketVersion.V1,
      marketType: undefined,
    }

    expect(getMarketImplementationType(market)).toBe<MarketType>("legacy")
    expect(isLegacyMarket(market)).toBe(true)
    expect(isRevolvingMarket(market)).toBe(false)
  })

  it("falls back to legacy for V2 markets without explicit implementation data", () => {
    const market = {
      version: MarketVersion.V2,
      marketType: undefined,
    }

    expect(getMarketImplementationType(market)).toBe<MarketType>("legacy")
    expect(isLegacyMarket(market)).toBe(true)
  })

  it("preserves explicit revolving implementation data", () => {
    const market = {
      version: MarketVersion.V2,
      marketType: "revolving" as const,
    }

    expect(getMarketImplementationType(market)).toBe<MarketType>("revolving")
    expect(isRevolvingMarket(market)).toBe(true)
    expect(isLegacyMarket(market)).toBe(false)
  })

  it("returns stable display config for legacy and revolving implementations", () => {
    expect(getMarketImplementationConfig("legacy")).toMatchObject({
      label: "Standard",
    })
    expect(getMarketImplementationConfig("revolving")).toMatchObject({
      label: "Revolving",
    })
  })
})
