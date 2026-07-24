"use client"

import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useBorrowerBatches } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerBatches"
import {
  LenderProfilePageContainer,
  LenderProfilePageSection,
  LenderProfilePageTitleContainer,
} from "@/app/[locale]/lender/profile/components/style"
import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import {
  BORROWER_PROFILE_TABS,
  useProfileTab,
} from "@/components/Profile/shared/profileTabs"

import { BorrowerMarketHealthTable } from "./BorrowerMarketHealthTable"
import { BorrowerOverviewSummary } from "./BorrowerOverviewSummary"
import { ExportBorrowerCsvModal } from "./ExportBorrowerCsvModal"
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
  const [exportOpen, setExportOpen] = React.useState(false)

  const { data: batches } = useBorrowerBatches(
    profileAddress,
    analytics?.marketIds ?? [],
    analytics?.priceMap ?? {},
    chainId,
  )

  const totalCount = markets.length
  const activeCount = markets.filter((market) => !market.isClosed).length

  const exportMarkets = React.useMemo(
    () =>
      markets.map((market) => ({
        marketId: market.address,
        marketName: market.name,
      })),
    [markets],
  )
  const canExport = !!profileAddress && markets.length > 0

  return (
    <Box sx={LenderProfilePageContainer}>
      <Box sx={LenderProfilePageSection}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
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

          <Button
            variant="outlined"
            color="secondary"
            size="small"
            disabled={!canExport}
            onClick={() => setExportOpen(true)}
            sx={{ flexShrink: 0, gap: "2px", paddingLeft: "9px" }}
          >
            <SvgIcon sx={{ transform: "rotate(-90deg)", fontSize: "14px" }}>
              <Arrow />
            </SvgIcon>
            CSV
          </Button>
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

      {profileAddress && (
        <ExportBorrowerCsvModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          borrowerAddress={profileAddress}
          markets={exportMarkets}
        />
      )}
    </Box>
  )
}
