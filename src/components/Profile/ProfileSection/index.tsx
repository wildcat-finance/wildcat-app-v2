import * as React from "react"

import { Box, Button } from "@mui/material"
import Link from "next/link"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useBorrowerAggregateStats } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerAggregateStats"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { LenderAnalyticsSummary } from "@/app/[locale]/lender/market/[address]/components/LenderAnalyticsSummary"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import { buildBorrowerSummaryItems } from "@/components/Profile/shared/borrowerSummaryItems"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isHinterlightSupported } from "@/lib/hinterlight"
import { buildBorrowerProfileHref } from "@/utils/formatters"

import { BorrowerMarketsTreemap } from "./components/BorrowerMarketsTreemap"
import { ProfileSectionNameBlock } from "./components/ProfileSectionNameBlock"
import { ProfileSectionProps } from "./interface"
import { OverallBlock } from "../components/OverallBlock"

export const ProfileSection = ({
  profileAddress,
  externalChainId,
}: ProfileSectionProps) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const analyticsAvailable = isHinterlightSupported(chainId)
  const { data: profileData } = useGetBorrowerProfile(profileAddress, chainId)
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(profileAddress, chainId)
  const borrowerAnalyticsQuery = useBorrowerAggregateStats(
    profileAddress,
    chainId,
  )

  const activeMarkets = borrowerMarkets?.filter((market) => !market.isClosed)
  const marketsAmount = (activeMarkets ?? []).length
  const summaryItems = buildBorrowerSummaryItems(borrowerAnalyticsQuery.data)
  const profileHref = profileAddress
    ? buildBorrowerProfileHref(profileAddress, chainId)
    : undefined
  const isTreemapLoading =
    isMarketsLoading || (analyticsAvailable && borrowerAnalyticsQuery.isLoading)

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <ProfileSectionNameBlock {...profileData} />

      {profileHref && (
        <Box>
          <Link href={profileHref}>
            <Button size="small" variant="contained" color="primary">
              View full borrower profile
            </Button>
          </Link>
        </Box>
      )}

      {analyticsAvailable ? (
        <LenderAnalyticsSummary
          items={summaryItems}
          isLoading={borrowerAnalyticsQuery.isLoading}
        />
      ) : (
        <AnalyticsUnavailableNotice
          title="Aggregate KPIs unavailable on this network"
          description="Borrower analytics are sourced from the Hinterlight analytics subgraph on Ethereum mainnet and Sepolia."
        />
      )}

      <OverallBlock
        {...profileData}
        marketsAmount={marketsAmount}
        externalChainId={chainId}
        borrowed={
          analyticsAvailable
            ? summaryItems.find((item) => item.label === "Total borrowed")
                ?.fullPrecisionValue
            : undefined
        }
      />

      <BorrowerMarketsTreemap
        markets={borrowerMarkets ?? []}
        priceMap={borrowerAnalyticsQuery.data?.priceMap ?? {}}
        isLoading={isTreemapLoading}
      />
    </Box>
  )
}
