import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Divider } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { Footer } from "@/components/Footer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { trimAddress } from "@/utils/formatters"

import { MarketsBlock } from "./components/MarketsBlock"
import { MobileNamePageBlockWrapper } from "./components/MobileNamePageBlockWrapper"
import { ProfilePageSkeleton } from "./components/PageSkeleton"
import { ProfileNamePageBlock } from "./components/ProfileNamePageBlock"
import { ProfilePageProps } from "./interface"
import { PageContentContainer, MobileContentContainer } from "./style"
import { OverallBlock } from "../components/OverallBlock"

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
  const accountName = profileData?.name ?? trimAddress(profileAddress as string)

  // Mobile
  const [section, setSection] = useState<"markets" | "info">("markets")

  useEffect(() => {
    if (marketsAmount === 0) {
      setSection("info")
    } else {
      setSection("markets")
    }
  }, [marketsAmount])

  if (isLoading)
    return <ProfilePageSkeleton isExternal={isExternal} isMobile={isMobile} />

  console.log(accountName)

  if (isMobile)
    return (
      <Box sx={MobileContentContainer}>
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

        {section === "markets" && (
          <MarketsBlock markets={borrowerMarkets} isLoading={isLoading} />
        )}

        {section === "info" && (
          <OverallBlock {...profileData} marketsAmount={marketsAmount} />
        )}

        <Box sx={{ marginTop: "auto" }}>
          <Footer showFooter={false} showDivider={false} />
        </Box>
      </Box>
    )

  return (
    <Box sx={PageContentContainer}>
      <ProfileNamePageBlock
        {...profileData}
        name={accountName}
        marketsAmount={marketsAmount}
        isExternal={isExternal}
        isMobile={isMobile}
      />

      <Divider sx={{ marginY: "32px" }} />

      <OverallBlock {...profileData} marketsAmount={marketsAmount} isPage />

      {marketsAmount !== 0 && (
        <MarketsBlock markets={activeMarkets} isLoading={isLoading} />
      )}
    </Box>
  )
}
