"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { LenderAnalyticsSummary } from "@/app/[locale]/lender/market/[address]/components/LenderAnalyticsSummary"
import { ServiceAgreementStatusResponse } from "@/app/api/service-agreement/interface"
import { ToUStatusBlock } from "@/components/Profile/components/ToUStatusBlock"
import { BorrowerProfileVerificationDisclosure } from "@/components/Profile/components/VerificationDisclosure"
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
  defaults: number | undefined
  borrowerMarkets: Parameters<typeof MarketsBlock>[0]["markets"]
  analytics?: BorrowerProfileAnalytics
  isAnalyticsLoading: boolean
  analyticsAvailable: boolean
  isMobile: boolean
  touStatus: ServiceAgreementStatusResponse | undefined
  isTouStatusLoading: boolean
}

export const OverviewTab = ({
  profileAddress,
  chainId,
  type,
  accountName,
  marketsAmount,
  defaults,
  borrowerMarkets,
  analytics,
  isAnalyticsLoading,
  analyticsAvailable,
  isMobile,
  touStatus,
  isTouStatusLoading,
}: OverviewTabProps) => {
  const { t } = useTranslation()

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
          title={t("common.labels.aggregateKpisUnavailableNetwork")}
          description={t("profile.borrower.networkDoesNotProvideIndexed")}
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
          defaults={defaults}
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
                    title: t("profile.borrower.stats.firstMarketCreated"),
                    value: analytics?.firstMarketCreated,
                  },
                  {
                    title: t("profile.borrower.stats.timeOnProtocol"),
                    value: analytics?.timeOnProtocol,
                  },
                  {
                    title: t("common.labels.activeMarkets"),
                    value: analytics?.activeMarkets,
                  },
                  {
                    title: t("common.fields.assetsUsed"),
                    value: analytics?.assetsUsed.join(", "),
                  },
                ]
              : []
          }
        />
      </Box>

      <Box sx={{ "& > aside": { marginTop: 0 } }}>
        <BorrowerProfileVerificationDisclosure
          variant="inline"
          showModal={false}
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
        <ToUStatusBlock
          address={profileAddress}
          status={touStatus}
          isLoading={isTouStatusLoading}
          externalChainId={chainId}
          isPage
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
          {t("common.labels.activeMarkets")}
        </Typography>
        {activeBorrowerMarkets.length > 0 ? (
          <MarketsBlock markets={activeBorrowerMarkets} isLoading={false} />
        ) : (
          <Typography variant="text2" color={COLORS.santasGrey}>
            {t("profile.borrower.noActiveMarketsFoundBorrower")}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
