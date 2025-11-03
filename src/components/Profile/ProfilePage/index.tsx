import * as React from "react"

import { Box, Divider } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { useMobileResolution } from "@/hooks/useMobileResolution"

import { NameSection } from "./components/NameSection"
import { OverallSection } from "./components/OverallSection"
import { ProfilePageProps } from "./interface"
import { PageContentContainer } from "./style"

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
    </Box>
  )
}
