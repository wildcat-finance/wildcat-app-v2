import { MarketVersion } from "@wildcatfi/wildcat-sdk"

import {
  getMarketImplementationVariant,
  getMarketImplementationVariantForType,
} from "."
import { RevolvingMarketCard } from "./RevolvingMarketCard"

jest.mock("@/components/Mobile/MobileMarketCard", () => ({
  MobileMarketCard: () => null,
}))
jest.mock("@/components/ParametersItem", () => ({
  ParametersItem: () => null,
}))

describe("market implementation variants", () => {
  it("resolves markets through their canonical implementation type", () => {
    expect(
      getMarketImplementationVariant({
        version: MarketVersion.V1,
        marketType: "revolving",
      }).key,
    ).toBe("legacy")

    expect(
      getMarketImplementationVariant({
        version: MarketVersion.V2,
        marketType: "revolving",
      }).key,
    ).toBe("revolving")
  })

  it("gives revolving markets their dedicated market card", () => {
    expect(getMarketImplementationVariantForType("revolving").MarketCard).toBe(
      RevolvingMarketCard,
    )
  })
})
