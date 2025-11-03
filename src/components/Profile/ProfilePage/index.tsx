import * as React from "react"
import { useState } from "react"

import { Box, Divider } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { Footer } from "@/components/Footer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { trimAddress } from "@/utils/formatters"

import { MarketsSection } from "./components/MarketsSection"
import { MobileNameSectionWrapper } from "./components/MobileNameSectionWrapper"
import { NameSection } from "./components/NameSection"
import { OverallSection } from "./components/OverallSection"
import { ProfilePageSkeleton } from "./components/PageSkeleton"
import { ProfilePageProps } from "./interface"
import { PageContentContainer, MobileContentContainer } from "./style"

export const ProfilePage = ({ type, profileAddress }: ProfilePageProps) => {
  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(profileAddress)

  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(profileAddress)

  const isMobile = useMobileResolution()

  const isExternal = type === "external"
  const isLoading = isMarketsLoading || isProfileLoading
  const activeMarkets = borrowerMarkets?.filter((market) => !market.isClosed)
  const marketsAmount = (activeMarkets ?? []).length

  // Mobile
  const [section, setSection] = useState<"markets" | "info">("markets")

  if (isLoading)
    return <ProfilePageSkeleton isExternal={isExternal} isMobile={isMobile} />

  if (isMobile)
    return (
      <Box sx={MobileContentContainer}>
        <MobileNameSectionWrapper
          section={section}
          setSection={setSection}
          marketsAmount={marketsAmount}
        >
          <NameSection
            {...profileData}
            name={profileData?.name || trimAddress(profileAddress as string)}
            marketsAmount={marketsAmount}
            isExternal={isExternal}
            isMobile={isMobile}
          />
        </MobileNameSectionWrapper>

        {section === "markets" && (
          <MarketsSection markets={borrowerMarkets} isLoading={isLoading} />
        )}

        {section === "info" && (
          <OverallSection {...profileData} marketsAmount={marketsAmount} />
        )}

        <Box sx={{ marginTop: "auto" }}>
          <Footer showFooter={false} showDivider={false} />
        </Box>
      </Box>
    )

  return (
    <Box sx={PageContentContainer}>
      <NameSection
        {...profileData}
        marketsAmount={marketsAmount}
        isExternal={isExternal}
        isMobile={isMobile}
      />

      <Divider sx={{ marginY: "32px" }} />

      <OverallSection {...profileData} marketsAmount={marketsAmount} />

      {marketsAmount !== 0 && (
        <MarketsSection markets={activeMarkets} isLoading={isLoading} />
      )}
    </Box>
  )
}
