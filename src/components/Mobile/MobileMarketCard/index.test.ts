import { HooksKind } from "@wildcatfi/wildcat-sdk"

import { getMobileMarketTermLabel, MobileMarketItem } from "./index"

jest.mock("@/components/AdsBanners/adsConfig", () => ({
  getAdsConfig: jest.fn(),
}))

const marketWithTerm = (term: MobileMarketItem["term"]): MobileMarketItem =>
  ({
    term,
  }) as MobileMarketItem

describe("getMobileMarketTermLabel", () => {
  it("labels open-term markets", () => {
    expect(
      getMobileMarketTermLabel(marketWithTerm({ kind: HooksKind.OpenTerm })),
    ).toBe("Open Term")
  })

  it("keeps periodic-term markets distinct from fixed-term markets", () => {
    expect(
      getMobileMarketTermLabel(
        marketWithTerm({ kind: HooksKind.PeriodicTerm }),
      ),
    ).toBe("Periodic Term")
  })
})
