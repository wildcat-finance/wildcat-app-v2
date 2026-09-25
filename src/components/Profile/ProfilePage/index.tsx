import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Divider } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetServiceAgreementStatus } from "@/app/[locale]/borrower/hooks/useGetServiceAgreementStatus"
import { useBorrowerAggregateStats } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerAggregateStats"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { Footer } from "@/components/Footer"
import { MobileFilterButton } from "@/components/Mobile/MobileFilterButton"
import { ToUStatusBlock } from "@/components/Profile/components/ToUStatusBlock"
import { BorrowerProfileVerificationDisclosure } from "@/components/Profile/components/VerificationDisclosure"
import { ProfileTabBar } from "@/components/Profile/shared/ProfileTabBar"
import {
  BORROWER_PROFILE_TABS,
  useProfileTab,
} from "@/components/Profile/shared/profileTabs"
import { analyticsUiEnabled } from "@/config/featureFlags"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isSubgraphPricingConfigured } from "@/lib/subgraphCapabilities"
import { pageCalcHeights } from "@/utils/constants"
import { trimAddress } from "@/utils/formatters"
import { countMarketsInDefault } from "@/utils/marketStatus"

import { BorrowerChartsTab } from "./components/BorrowerChartsTab"
import { MarketsBlock } from "./components/MarketsBlock"
import { MobileMarketsFilterBar } from "./components/MobileMarketsFilterBar"
import { MobileNamePageBlockWrapper } from "./components/MobileNamePageBlockWrapper"
import { OverviewTab } from "./components/OverviewTab"
import { ProfilePageSkeleton } from "./components/PageSkeleton"
import { ProfileNamePageBlock } from "./components/ProfileNamePageBlock"
import { WithdrawalsDelinquencyTab } from "./components/WithdrawalsDelinquencyTab"
import { useMobileMarketFilters } from "./hooks/useMobileMarketFilters"
import { ProfilePageProps } from "./interface"
import {
  DesktopProfileGrid,
  MobileContentContainer,
  MobileVerificationCard,
  PageContentContainer,
} from "./style"
import { OverallBlock } from "../components/OverallBlock"

const AnalyticsProfilePage = ({
  type,
  profileAddress,
  chainId: profileChainId,
}: ProfilePageProps) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = profileChainId ?? selectedChainId
  const analyticsAvailable = isSubgraphPricingConfigured(chainId)

  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(profileAddress, chainId)
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(profileAddress, chainId)
  const { data: touStatus, isLoading: isTouStatusLoading } =
    useGetServiceAgreementStatus(profileAddress, chainId)
  const borrowerAnalyticsQuery = useBorrowerAggregateStats(
    profileAddress,
    chainId,
  )

  const isMobile = useMobileResolution()
  const { currentTab } = useProfileTab(BORROWER_PROFILE_TABS, "overview")

  const activeMarkets =
    borrowerMarkets?.filter((market) => !market.isClosed) ?? []
  const marketsAmount = borrowerMarkets?.length ?? 0
  const defaults = countMarketsInDefault(borrowerMarkets)
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
        ...(isMobile && {
          gap: "2px",
          padding: "2px",
        }),
      }}
    >
      <BorrowerProfileVerificationDisclosure showNote={false} />

      {isMobile && (
        <ProfileTabBar tabs={BORROWER_PROFILE_TABS} defaultTab="overview" />
      )}

      {currentTab === "overview" && (
        <OverviewTab
          profileAddress={profileAddress}
          chainId={chainId}
          type={type}
          accountName={accountName}
          marketsAmount={marketsAmount}
          defaults={defaults}
          borrowerMarkets={activeMarkets}
          analytics={borrowerAnalyticsQuery.data}
          isAnalyticsLoading={
            analyticsAvailable && borrowerAnalyticsQuery.isLoading
          }
          analyticsAvailable={analyticsAvailable}
          isMobile={isMobile}
          touStatus={touStatus}
          isTouStatusLoading={isTouStatusLoading}
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

      <Box sx={{ marginTop: "auto" }}>
        <Footer showFooter={false} showDivider={false} />
      </Box>
    </Box>
  )
}

const CoreProfilePage = ({
  type,
  profileAddress,
  chainId: profileChainId,
}: ProfilePageProps) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = profileChainId ?? selectedChainId
  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(profileAddress, chainId)
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(profileAddress, chainId)
  const { data: touStatus, isLoading: isTouStatusLoading } =
    useGetServiceAgreementStatus(profileAddress, chainId)
  const isMobile = useMobileResolution()

  const isExternal = type === "external"
  const isLoading = isMarketsLoading || isProfileLoading
  const activeMarkets = borrowerMarkets?.filter((market) => !market.isClosed)
  const marketsAmount = (activeMarkets ?? []).length
  const defaults = countMarketsInDefault(borrowerMarkets)
  const accountName = profileData?.name ?? trimAddress(profileAddress ?? "")

  const [section, setSection] = useState<"markets" | "info">("markets")
  const mobileMarketFilters = useMobileMarketFilters(activeMarkets ?? [])

  useEffect(() => {
    setSection(marketsAmount === 0 ? "info" : "markets")
  }, [marketsAmount])

  if (isLoading) {
    return <ProfilePageSkeleton isExternal={isExternal} isMobile={isMobile} />
  }

  if (isMobile) {
    return (
      <Box sx={MobileContentContainer}>
        <BorrowerProfileVerificationDisclosure showNote={false} />

        <MobileNamePageBlockWrapper
          section={section}
          setSection={setSection}
          marketsAmount={marketsAmount}
        >
          <ProfileNamePageBlock
            {...profileData}
            name={accountName}
            marketsAmount={marketsAmount}
            isExternal={isExternal}
            isMobile={isMobile}
          />
        </MobileNamePageBlockWrapper>

        {section === "markets" && marketsAmount !== 0 && (
          <MobileMarketsFilterBar
            tabs={mobileMarketFilters.statusTabs}
            tabsLabel={mobileMarketFilters.statusTabsLabel}
            activeTab={mobileMarketFilters.status}
            onTabChange={mobileMarketFilters.selectStatus}
            actions={
              <MobileFilterButton {...mobileMarketFilters.filterButtonProps} />
            }
          />
        )}

        {section === "markets" && (
          <MarketsBlock
            key={mobileMarketFilters.resetKey}
            markets={mobileMarketFilters.filteredMarkets}
            isLoading={isLoading}
            mobileSort={mobileMarketFilters.sort}
          />
        )}

        {section === "info" && (
          <>
            <OverallBlock
              {...profileData}
              marketsAmount={marketsAmount}
              defaults={defaults}
              externalChainId={chainId}
            />
            <Box sx={MobileVerificationCard}>
              <BorrowerProfileVerificationDisclosure
                variant="inline"
                showModal={false}
              />
            </Box>
            <ToUStatusBlock
              address={profileAddress}
              status={touStatus}
              isLoading={isTouStatusLoading}
              externalChainId={chainId}
            />
          </>
        )}

        <Box sx={{ marginTop: "auto" }}>
          <Footer showFooter={false} showDivider={false} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={PageContentContainer}>
      <Box sx={DesktopProfileGrid}>
        <Box sx={{ gridArea: "header", minWidth: 0 }}>
          <ProfileNamePageBlock
            {...profileData}
            name={accountName}
            marketsAmount={marketsAmount}
            isExternal={isExternal}
            isMobile={isMobile}
          />
          <Divider sx={{ marginTop: "32px" }} />
        </Box>

        <Box sx={{ gridArea: "overall", minWidth: 0, paddingTop: "32px" }}>
          <OverallBlock
            {...profileData}
            marketsAmount={marketsAmount}
            defaults={defaults}
            externalChainId={chainId}
            isPage
          />
        </Box>

        <Box sx={{ gridArea: "card", minWidth: 0 }}>
          <BorrowerProfileVerificationDisclosure />
        </Box>

        <Box sx={{ gridArea: "tou", minWidth: 0 }}>
          <Divider sx={{ marginY: "32px" }} />
          <ToUStatusBlock
            address={profileAddress}
            status={touStatus}
            isLoading={isTouStatusLoading}
            externalChainId={chainId}
            isPage
          />
        </Box>

        {marketsAmount !== 0 && (
          <Box sx={{ gridArea: "markets", minWidth: 0, marginTop: "32px" }}>
            <MarketsBlock markets={activeMarkets} isLoading={isLoading} />
          </Box>
        )}
      </Box>
    </Box>
  )
}

export const ProfilePage = (props: ProfilePageProps) =>
  analyticsUiEnabled ? (
    <AnalyticsProfilePage {...props} />
  ) : (
    <CoreProfilePage {...props} />
  )
