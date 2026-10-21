import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getAdsConfig } from "@/components/AdsBanners/adsConfig"
import { proposalMarkets } from "@/utils/proposalMarkets"

jest.mock("@/assets/companies-icons/test-points_icon.svg", () => () => null)
jest.mock(
  "@/assets/companies-icons/test-points-white_icon.svg",
  () => () => null,
)

describe("getAdsConfig", () => {
  it("returns the neutral Test Points campaign for the configured Sepolia market", () => {
    expect(
      getAdsConfig(
        SupportedChainId.Sepolia,
        proposalMarkets.sepolia.testPoints,
      ),
    ).toMatchObject({
      proposalText: "1x Multiplier",
      proposalChipLabel: "Test Points",
      bannerChipLabel: "Test Points",
      bannerDescription:
        "Receive a pro-rata share of {tokenAmount} Sepolia test points",
      tokenAmount: "100k",
    })
  })

  it("scopes campaigns by chain ID", () => {
    expect(
      getAdsConfig(
        SupportedChainId.Mainnet,
        proposalMarkets.sepolia.testPoints,
      ),
    ).toBeUndefined()
  })

  it("matches market addresses case-insensitively", () => {
    const expected = getAdsConfig(
      SupportedChainId.Sepolia,
      proposalMarkets.sepolia.testPoints,
    )

    expect(
      getAdsConfig(
        SupportedChainId.Sepolia,
        proposalMarkets.sepolia.testPoints.toUpperCase(),
      ),
    ).toBe(expected)
  })

  it("returns undefined for unconfigured markets", () => {
    expect(
      getAdsConfig(
        SupportedChainId.Sepolia,
        "0x0000000000000000000000000000000000000001",
      ),
    ).toBeUndefined()
  })
})
