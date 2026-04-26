import { Box } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useBorrowerAggregateStats } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerAggregateStats"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { Footer } from "@/components/Footer"
import {
  BORROWER_PROFILE_TABS,
  useProfileTab,
} from "@/components/Profile/shared/profileTabs"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isHinterlightSupported } from "@/lib/hinterlight"
import { pageCalcHeights } from "@/utils/constants"
import { trimAddress } from "@/utils/formatters"

import { BorrowerChartsTab } from "./components/BorrowerChartsTab"
import { OverviewTab } from "./components/OverviewTab"
import { ProfilePageSkeleton } from "./components/PageSkeleton"
import { WithdrawalsDelinquencyTab } from "./components/WithdrawalsDelinquencyTab"
import { ProfilePageProps } from "./interface"

export const ProfilePage = ({ type, profileAddress }: ProfilePageProps) => {
  const { chainId } = useSelectedNetwork()
  const analyticsAvailable = isHinterlightSupported(chainId)

  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(profileAddress)
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(profileAddress)
  const borrowerAnalyticsQuery = useBorrowerAggregateStats(profileAddress)

  const isMobile = useMobileResolution()
  const { currentTab } = useProfileTab(BORROWER_PROFILE_TABS, "overview")

  const activeMarkets =
    borrowerMarkets?.filter((market) => !market.isClosed) ?? []
  const marketsAmount = borrowerMarkets?.length ?? 0
  const accountName = profileData?.name ?? trimAddress(profileAddress ?? "")

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
        padding: isMobile ? "0" : "44px 44px 24px 44px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {currentTab === "overview" && (
        <OverviewTab
          profileAddress={profileAddress}
          type={type}
          accountName={accountName}
          marketsAmount={marketsAmount}
          borrowerMarkets={activeMarkets}
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
          analytics={borrowerAnalyticsQuery.data}
          isAnalyticsLoading={
            analyticsAvailable && borrowerAnalyticsQuery.isLoading
          }
          analyticsAvailable={analyticsAvailable}
        />
      )}

      <Box sx={{ marginTop: "auto" }}>
        <Footer showFooter={false} showDivider={false} />
      </Box>
    </Box>
  )
}
