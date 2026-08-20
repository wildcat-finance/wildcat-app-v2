"use client"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useLenderPositions } from "@/app/[locale]/lender/profile/hooks/useLenderPositions"
import { Footer } from "@/components/Footer"
import { ProfilePageSkeleton } from "@/components/Profile/ProfilePage/components/PageSkeleton"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import { ProfileTabBar } from "@/components/Profile/shared/ProfileTabBar"
import {
  LENDER_PROFILE_TABS,
  useProfileTab,
} from "@/components/Profile/shared/profileTabs"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isSubgraphPricingConfigured } from "@/lib/subgraphCapabilities"
import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"

import { ActivityCashFlowTab } from "./components/ActivityCashFlowTab"
import { LenderOverviewTab } from "./components/LenderOverviewTab"
import { MarketsInterestTab } from "./components/MarketsInterestTab"
import { TempTestChartsTab } from "./components/TempTestChartsTab"

type LenderProfilePageProps = {
  profileAddress: `0x${string}` | undefined
  type: "external" | "internal"
}

export const LenderProfilePage = ({
  profileAddress,
  type,
}: LenderProfilePageProps) => {
  const { t } = useTranslation()

  const { chainId } = useSelectedNetwork()
  const analyticsAvailable = isSubgraphPricingConfigured(chainId)

  const isMobile = useMobileResolution()
  const positionsQuery = useLenderPositions(profileAddress)
  const { currentTab } = useProfileTab(LENDER_PROFILE_TABS, "overview")

  if (analyticsAvailable && positionsQuery.isLoading) {
    return (
      <ProfilePageSkeleton
        isExternal={type === "external"}
        isMobile={isMobile}
      />
    )
  }

  if (analyticsAvailable && positionsQuery.isError) {
    return (
      <Box
        sx={{
          width: "100%",
          padding: isMobile ? "4px" : "44px",
        }}
      >
        <Box
          sx={{
            border: `1px solid ${COLORS.athensGrey}`,
            borderRadius: "16px",
            backgroundColor: COLORS.white,
            padding: "24px",
          }}
        >
          {t("profile.lender.failedLoadLenderProfileAnalytics")}
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: isMobile ? "auto" : `calc(100vh - ${pageCalcHeights.page})`,
        overflowY: isMobile ? "visible" : "auto",
        padding: isMobile ? "0" : "44px 44px 24px 44px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        ...(isMobile && {
          gap: "2px",
          padding: "2px",
        }),
      }}
    >
      {isMobile && (
        <ProfileTabBar tabs={LENDER_PROFILE_TABS} defaultTab="overview" />
      )}

      {analyticsAvailable ? (
        <>
          {currentTab === "overview" && (
            <LenderOverviewTab
              lenderAddress={profileAddress}
              data={positionsQuery.data}
              isLoading={positionsQuery.isLoading}
            />
          )}
          {currentTab === "activity" && (
            <ActivityCashFlowTab
              lenderAddress={profileAddress}
              positionsData={positionsQuery.data}
              isPositionsLoading={positionsQuery.isLoading}
            />
          )}
          {currentTab === "markets" && (
            <MarketsInterestTab
              data={positionsQuery.data}
              isLoading={positionsQuery.isLoading}
            />
          )}
          {currentTab === "lender-charts" && (
            <TempTestChartsTab
              lenderAddress={profileAddress}
              data={positionsQuery.data}
              isLoading={positionsQuery.isLoading}
            />
          )}
        </>
      ) : (
        <AnalyticsUnavailableNotice
          title={t("profile.lender.lenderAnalyticsUnavailableNetwork")}
          description={t("profile.lender.networkDoesNotProvideIndexed")}
        />
      )}

      <Box sx={{ marginTop: "auto" }}>
        <Footer showFooter={false} showDivider={false} />
      </Box>
    </Box>
  )
}
