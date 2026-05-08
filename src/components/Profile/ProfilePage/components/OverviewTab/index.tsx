"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { LenderAnalyticsSummary } from "@/app/[locale]/lender/market/[address]/components/LenderAnalyticsSummary"
import { formatUsd } from "@/components/Profile/shared/analytics"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import { buildBorrowerSummaryItems } from "@/components/Profile/shared/borrowerSummaryItems"
import { COLORS } from "@/theme/colors"

import { OverallBlock } from "../../../components/OverallBlock"
import { MarketsBlock } from "../MarketsBlock"
import { ProfileNamePageBlock } from "../ProfileNamePageBlock"

type OverviewTabProps = {
  profileAddress: `0x${string}` | undefined
  chainId?: number
  type: "external" | "internal"
  accountName: string
  marketsAmount: number
  borrowerMarkets: Parameters<typeof MarketsBlock>[0]["markets"]
  analytics?: BorrowerProfileAnalytics
  isAnalyticsLoading: boolean
  analyticsAvailable: boolean
  isMobile: boolean
}

export const OverviewTab = ({
  profileAddress,
  chainId,
  type,
  accountName,
  marketsAmount,
  borrowerMarkets,
  analytics,
  isAnalyticsLoading,
  analyticsAvailable,
  isMobile,
}: OverviewTabProps) => {
  const { data: profileData } = useGetBorrowerProfile(profileAddress, chainId)
  const activeBorrowerMarkets = borrowerMarkets ?? []

  const summaryItems = buildBorrowerSummaryItems(analytics)

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: "2px", md: "24px" },
      }}
    >
      <Box
        sx={{
          border: `1px solid ${COLORS.athensGrey}`,
          borderRadius: "16px",
          backgroundColor: COLORS.white,
          padding: isMobile ? "16px" : "24px",
        }}
      >
        <ProfileNamePageBlock
          {...profileData}
          name={accountName}
          marketsAmount={marketsAmount}
          isExternal={type === "external"}
          isMobile={isMobile}
        />
      </Box>

      {analyticsAvailable ? (
        <LenderAnalyticsSummary
          items={summaryItems}
          isLoading={isAnalyticsLoading}
        />
      ) : (
        <AnalyticsUnavailableNotice
          title="Aggregate KPIs unavailable on this network"
          description="Analytics for this profile are sourced from the Hinterlight analytics subgraph (mainnet + Sepolia). Switch networks to view them."
        />
      )}

      <Box
        sx={{
          border: `1px solid ${COLORS.athensGrey}`,
          borderRadius: "16px",
          backgroundColor: COLORS.white,
          padding: isMobile ? "16px" : "24px",
        }}
      >
        <OverallBlock
          {...profileData}
          marketsAmount={marketsAmount}
          isPage
          borrowed={
            analyticsAvailable
              ? formatUsd(analytics?.totalBorrowed ?? 0)
              : undefined
          }
          extraItems={
            analyticsAvailable
              ? [
                  {
                    title: "First market created",
                    value: analytics?.firstMarketCreated,
                  },
                  {
                    title: "Time on protocol",
                    value: analytics?.timeOnProtocol,
                  },
                  {
                    title: "Active markets",
                    value: analytics?.activeMarkets,
                  },
                  {
                    title: "Assets used",
                    value: analytics?.assetsUsed.join(", "),
                  },
                ]
              : []
          }
        />
      </Box>

      <Box
        sx={{
          border: `1px solid ${COLORS.athensGrey}`,
          borderRadius: "16px",
          backgroundColor: COLORS.white,
          padding: isMobile ? "16px" : "24px",
        }}
      >
        <Typography
          variant="title2"
          display="block"
          sx={{ marginBottom: "16px" }}
        >
          Active markets
        </Typography>
        {activeBorrowerMarkets.length > 0 ? (
          <MarketsBlock markets={activeBorrowerMarkets} isLoading={false} />
        ) : (
          <Typography variant="text2" color={COLORS.santasGrey}>
            No active markets found for this borrower on the selected network.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
