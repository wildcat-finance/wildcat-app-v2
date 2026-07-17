"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useBorrowerBatches } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerBatches"
import {
  LenderProfilePageContainer,
  LenderProfilePageSection,
  LenderProfilePageTitleContainer,
} from "@/app/[locale]/lender/profile/components/style"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import {
  BORROWER_PROFILE_TABS,
  useProfileTab,
} from "@/components/Profile/shared/profileTabs"
import { COLORS } from "@/theme/colors"

import { BorrowerMarketHealthTable } from "./BorrowerMarketHealthTable"
import { BorrowerOverviewSummary } from "./BorrowerOverviewSummary"
import { PendingWithdrawalBanner } from "./PendingWithdrawalBanner"

type OverviewTabProps = {
  profileAddress: `0x${string}` | undefined
  chainId?: number
  markets: Market[]
  analytics?: BorrowerProfileAnalytics
  isAnalyticsLoading: boolean
  analyticsAvailable: boolean
  isMobile: boolean
}

export const OverviewTab = ({
  profileAddress,
  chainId,
  markets,
  analytics,
  isAnalyticsLoading,
  analyticsAvailable,
  isMobile,
}: OverviewTabProps) => {
  const { setCurrentTab } = useProfileTab(BORROWER_PROFILE_TABS, "overview")

  const { data: batches } = useBorrowerBatches(
    profileAddress,
    analytics?.marketIds ?? [],
    analytics?.priceMap ?? {},
    chainId,
  )

  const totalCount = markets.length
  const activeCount = markets.filter((market) => !market.isClosed).length

  return (
    <Box sx={LenderProfilePageContainer}>
      <Box sx={LenderProfilePageSection}>
        <Box sx={LenderProfilePageTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Overview
          </Typography>

          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            Across all markets
          </Typography>
        </Box>

        {analyticsAvailable ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <BorrowerOverviewSummary
              analytics={analytics}
              isLoading={isAnalyticsLoading}
            />

            {batches && batches.pendingBatches > 0 && (
              <PendingWithdrawalBanner
                count={batches.pendingBatches}
                queuedValue={batches.totalQueued}
                nextExpiry={batches.nextExpiry}
                onViewQueue={() => setCurrentTab("delinquency")}
              />
            )}
          </Box>
        ) : (
          <AnalyticsUnavailableNotice
            title="Aggregate KPIs unavailable on this network"
            description="Analytics for this profile are sourced from the Hinterlight analytics subgraph (mainnet + Sepolia). Switch networks to view them."
          />
        )}
      </Box>

      <Box sx={LenderProfilePageSection}>
        <Box sx={LenderProfilePageTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Market health
          </Typography>

          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            {totalCount} total・{activeCount} active
          </Typography>
        </Box>

        <BorrowerMarketHealthTable markets={markets} />
      </Box>
    </Box>
  )
}
