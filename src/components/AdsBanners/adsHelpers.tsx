import React, { ReactNode } from "react"

import { Box } from "@mui/material"

import { getAdsConfig } from "@/components/AdsBanners/adsConfig"
import { AprTooltip } from "@/components/AdsBanners/Common/AprTooltip"
import { ProposalMarketParameter } from "@/components/AdsBanners/Common/ProposalMarketParameter"
import { AdsBanner } from "@/components/AdsBanners/components/AdsBanner"
import { AdsProposalChip } from "@/components/AdsBanners/components/AdsProposalChip"

/**
 * Returns the full AprTooltip component for the given market, or undefined
 * if the market has no active ad campaign.
 */
export function getAdsTooltipComponent(
  marketId: string,
  baseAPR: string,
): ReactNode | undefined {
  const config = getAdsConfig(marketId)
  if (!config) return undefined

  return (
    <AprTooltip
      baseAPR={baseAPR}
      aprProposal={<AdsProposalChip config={config} isTooltip />}
      banner={<AdsBanner config={config} />}
      withdrawalAnyTime={config.withdrawalAnyTime}
    />
  )
}

/**
 * Returns props for AprChip (isBonus + icons), or undefined
 * if the market has no active ad campaign.
 */
export function getAdsCellProps(
  marketId: string,
): { isBonus: true; icons: JSX.Element[] } | undefined {
  const config = getAdsConfig(marketId)
  if (!config) return undefined

  return {
    isBonus: true,
    icons: config.cellIcons,
  }
}

/**
 * Returns the mobile ads content component, or undefined
 * if the market has no active ad campaign.
 */
export function getAdsMobileContent(marketId: string): ReactNode | undefined {
  const config = getAdsConfig(marketId)
  if (!config) return undefined

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <AdsProposalChip config={config} isTooltip={false} />

      <AdsBanner config={config} maxWidth="100%" />
    </Box>
  )
}

/**
 * Returns the ProposalMarketParameter component for MarketParameters section,
 * or null if the market has no active ad campaign.
 */
export function getAdsMarketParameterComponent(
  marketId: string,
): ReactNode | null {
  const config = getAdsConfig(marketId)
  if (!config) return null

  return (
    <ProposalMarketParameter
      proposal={<AdsProposalChip config={config} isTooltip={false} />}
      banner={<AdsBanner config={config} maxWidth="100%" />}
    />
  )
}
