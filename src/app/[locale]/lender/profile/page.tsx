"use client"

import * as React from "react"

import { Box, Divider } from "@mui/material"
import { useAccount } from "wagmi"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { NameSection } from "@/app/[locale]/borrower/profile/components/NameSection"
import { OverallSection } from "@/app/[locale]/borrower/profile/components/OverallSection"
import { ProfileSkeleton } from "@/app/[locale]/borrower/profile/components/ProfileSkeleton"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { MarketsSection } from "@/app/[locale]/lender/profile/components/MarketsSection"
import { useMobileResolution } from "@/hooks/useMobileResolution"

import { ContentContainer, MainContainer } from "./style"

export default function UserBorrowerProfile() {
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets()

  const { address: accountAddress } = useAccount()
  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(accountAddress)

  const marketsAmount = borrowerMarkets?.filter((market) => !market.isClosed)
    .length

  const isLoading = isMarketsLoading || isProfileLoading

  if (isLoading)
    return <ProfileSkeleton type="user" rootSx={ContentContainer} />

  return (
    <Box sx={ContentContainer}>
      <Box sx={MainContainer}>
        <NameSection type="user" {...profileData} />

        <OverallSection
          {...profileData}
          marketsAmount={marketsAmount}
          totalBorrowedAmount="0"
          defaults="0"
        />

        <Divider sx={{ margin: "32px 0", borderColor: "transparent" }} />

        {marketsAmount !== 0 && <MarketsSection markets={borrowerMarkets} />}
      </Box>
    </Box>
  )
}
