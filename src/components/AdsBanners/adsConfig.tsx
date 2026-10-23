import React from "react"

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import TestPointsWhite from "@/assets/companies-icons/test-points-white_icon.svg"
import TestPoints from "@/assets/companies-icons/test-points_icon.svg"
import { proposalMarkets } from "@/utils/proposalMarkets"

export type AdsConfig = {
  /** Text shown as the main proposal label */
  proposalText: string
  /** Label inside the proposal chip badge */
  proposalChipLabel: string
  /** Icon rendered inside the proposal chip badge */
  ProposalIcon: React.FC
  /** First line of the banner */
  bannerHeadline: string
  /** Label inside the banner chip */
  bannerChipLabel: string
  /** Icon rendered inside the banner chip */
  BannerIcon: React.FC
  /** Description template */
  bannerDescription: string
  /** Market-specific amount string */
  tokenAmount: string
  /** Icons displayed in the APR table cell */
  cellIcons: JSX.Element[]
  /** "Request withdrawal at any time" in the APR tooltip */
  withdrawalAnyTime: boolean
}

const SEPOLIA_TEST_POINTS_CONFIG: AdsConfig = {
  proposalText: "1x Multiplier",
  proposalChipLabel: "Test Points",
  ProposalIcon: TestPoints,
  bannerHeadline: "{tokenAmount} weekly of",
  bannerChipLabel: "Test Points",
  BannerIcon: TestPointsWhite,
  bannerDescription:
    "Receive a pro-rata share of {tokenAmount} Sepolia test points",
  tokenAmount: "100k",
  cellIcons: [<TestPoints key="test-points" />],
  withdrawalAnyTime: true,
}

// Registry (chainId -> marketAddress -> config)
const ADS_REGISTRY: Record<number, Record<string, AdsConfig>> = {
  [SupportedChainId.Sepolia]: {
    [proposalMarkets.sepolia.testPoints.toLowerCase()]:
      SEPOLIA_TEST_POINTS_CONFIG,
  },
}

/**
 * Returns the ads configuration for a market on a specific chain,
 * or `undefined` if the market has no active ad campaign.
 */
export function getAdsConfig(
  chainId: number,
  marketAddress: string,
): AdsConfig | undefined {
  return ADS_REGISTRY[chainId]?.[marketAddress.toLowerCase()]
}
