import { Box } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useBorrowerAggregateStats } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerAggregateStats"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { Footer } from "@/components/Footer"
import { ProfileTabBar } from "@/components/Profile/shared/ProfileTabBar"
import {
  BORROWER_PROFILE_TABS,
  useProfileTab,
} from "@/components/Profile/shared/profileTabs"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isHinterlightSupported } from "@/lib/hinterlight"
import { pageCalcHeights } from "@/utils/constants"

import { BorrowerChartsTab } from "./components/BorrowerChartsTab"
import { LegalInfoTab } from "./components/LegalInfoTab"
import { OverviewTab } from "./components/OverviewTab"
import { ProfilePageSkeleton } from "./components/PageSkeleton"
import { WithdrawalsDelinquencyTab } from "./components/WithdrawalsDelinquencyTab"
import { ProfilePageProps } from "./interface"

export const ProfilePage = ({
  type,
  profileAddress,
  chainId: profileChainId,
}: ProfilePageProps) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = profileChainId ?? selectedChainId
  const analyticsAvailable = isHinterlightSupported(chainId)

  const { isLoading: isProfileLoading } = useGetBorrowerProfile(
    profileAddress,
    chainId,
  )
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(profileAddress, chainId)
  const borrowerAnalyticsQuery = useBorrowerAggregateStats(
    profileAddress,
    chainId,
  )

  const isMobile = useMobileResolution()
  const { currentTab } = useProfileTab(BORROWER_PROFILE_TABS, "overview")

  if (isProfileLoading || isMarketsLoading) {
    return (
      <ProfilePageSkeleton
        isExternal={type === "external"}
        isMobile={isMobile}
      />
    )
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: isMobile ? "auto" : `calc(100vh - ${pageCalcHeights.page})`,
        overflowY: isMobile ? "visible" : "auto",
        padding: isMobile ? "0" : "32px 16px",
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
        <ProfileTabBar tabs={BORROWER_PROFILE_TABS} defaultTab="overview" />
      )}

      {currentTab === "overview" && (
        <OverviewTab
          profileAddress={profileAddress}
          chainId={chainId}
          markets={borrowerMarkets ?? []}
          analytics={borrowerAnalyticsQuery.data}
          isAnalyticsLoading={
            analyticsAvailable && borrowerAnalyticsQuery.isLoading
          }
          analyticsAvailable={analyticsAvailable}
          isMobile={isMobile}
        />
      )}

      {currentTab === "delinquency" && (
        <WithdrawalsDelinquencyTab
          borrowerAddress={profileAddress}
          chainId={chainId}
          analytics={borrowerAnalyticsQuery.data}
          isAnalyticsLoading={
            analyticsAvailable && borrowerAnalyticsQuery.isLoading
          }
          analyticsAvailable={analyticsAvailable}
        />
      )}

      {currentTab === "borrower-charts" && (
        <BorrowerChartsTab
          borrowerAddress={profileAddress}
          chainId={chainId}
          analytics={borrowerAnalyticsQuery.data}
          isAnalyticsLoading={
            analyticsAvailable && borrowerAnalyticsQuery.isLoading
          }
          analyticsAvailable={analyticsAvailable}
        />
      )}

      {currentTab === "description" && (
        <LegalInfoTab
          profileAddress={profileAddress}
          chainId={chainId}
          type={type}
          markets={borrowerMarkets ?? []}
          isMobile={isMobile}
        />
      )}

      <Box sx={{ marginTop: "auto" }}>
        <Footer showFooter={false} showDivider={false} />
      </Box>
    </Box>
  )
}
