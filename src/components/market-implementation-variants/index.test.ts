import { Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

import {
  getMarketAprCopy,
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
        marketKind: "revolving",
      }).key,
    ).toBe("standard")

    expect(
      getMarketImplementationVariant({
        version: MarketVersion.V2,
        marketKind: "revolving",
      }).key,
    ).toBe("revolving")
  })

  it("gives revolving markets their dedicated market card", () => {
    expect(getMarketImplementationVariantForType("revolving").MarketCard).toBe(
      RevolvingMarketCard,
    )
  })

  it("uses utilization copy when either market kind or APR data identifies RCF", () => {
    const byKind = {
      version: MarketVersion.V2,
      marketKind: "revolving",
      annualInterestBips: 1_000,
      protocolFeeBips: 0,
      isIncurringPenalties: false,
      delinquencyFeeBips: 0,
    } as unknown as Market
    const byAprData = {
      version: MarketVersion.V2,
      marketKind: "unknown",
      currentAprDisplayBips: {
        isRevolving: true,
        configuredAprKind: "utilization",
        configuredAprBips: 1_000,
        currentProtocolAprBips: 0,
        currentEffectiveLenderAprBips: 1_000,
      },
    } as unknown as Market

    expect(getMarketAprCopy(byKind).configuredAprLabelKey).toBe(
      "common.fields.utilizationApr",
    )
    expect(getMarketAprCopy(byAprData).configuredAprLabelKey).toBe(
      "common.fields.utilizationApr",
    )
  })
})
