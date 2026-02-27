import React from "react"

import Ethena from "@/assets/companies-icons/ethena_icon.svg"
import EtherealWhite from "@/assets/companies-icons/ethereal-white_icon.svg"
import Ethereal from "@/assets/companies-icons/ethereal_icon.svg"
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

// Shared base for all Ethena-family markets
const ETHENA_BASE_CONFIG: Omit<AdsConfig, "tokenAmount"> = {
  proposalText: "20x Multiplier",
  proposalChipLabel: "Ethena Points",
  ProposalIcon: Ethena,
  bannerHeadline: "1 million weekly of",
  bannerChipLabel: "Ethereal Points",
  BannerIcon: EtherealWhite,
  bannerDescription: "Receive pro-rate share of {tokenAmount} Ethereal points",
  cellIcons: [<Ethena key="ethena" />, <Ethereal key="ethereal" />],
  withdrawalAnyTime: true,
}

// Config of test Sepolia market
const ADDITIONAL_APR_CONFIG: AdsConfig = {
  ...ETHENA_BASE_CONFIG,
  tokenAmount: "100k",
}

// Per-market overrides
const AUROS_CONFIG: AdsConfig = {
  ...ETHENA_BASE_CONFIG,
  tokenAmount: "1 million",
}

const KAPPALAB_CONFIG: AdsConfig = {
  ...ETHENA_BASE_CONFIG,
  tokenAmount: "200k",
}

// Registry (marketAddress: config)
const ADS_REGISTRY: Record<string, AdsConfig> = {
  [proposalMarkets.sepolia.test.toLowerCase()]: ADDITIONAL_APR_CONFIG,
  [proposalMarkets.ethena.auros.toLowerCase()]: AUROS_CONFIG,
  [proposalMarkets.ethena.kappaLab.toLowerCase()]: KAPPALAB_CONFIG,
}

/**
 * Returns the ads configuration for a given market address,
 * or `undefined` if the market has no active ad campaign.
 */
export function getAdsConfig(marketAddress: string): AdsConfig | undefined {
  return ADS_REGISTRY[marketAddress.toLowerCase()]
}
