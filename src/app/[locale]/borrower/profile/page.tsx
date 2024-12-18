"use client"

import * as React from "react"

import { Box, Divider } from "@mui/material"
import { useAccount } from "wagmi"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { MarketsSection } from "@/app/[locale]/borrower/profile/components/MarketsSection"
import { NameSection } from "@/app/[locale]/borrower/profile/components/NameSection"
import { OverallSection } from "@/app/[locale]/borrower/profile/components/OverallSection"
import { ProfileSkeleton } from "@/app/[locale]/borrower/profile/components/ProfileSkeleton"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"

import { ContentContainer } from "./style"

export default function UserBorrowerProfile() {
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets()

  const { address: accountAddress } = useAccount()
  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(accountAddress)

  const marketsAmount = borrowerMarkets?.filter((market) => !market.isClosed)
    .length

  const isLoading = isMarketsLoading || isProfileLoading

  if (isLoading) return <ProfileSkeleton type="user" />

  return (
    <Box sx={ContentContainer}>
      <NameSection
        type="user"
        name={profileData?.name}
        description={profileData?.description}
        website={profileData?.website}
        twitter={profileData?.twitter}
        linkedin={profileData?.linkedin}
      />

      <Divider sx={{ margin: "32px 0" }} />

      {marketsAmount !== 0 && <MarketsSection markets={borrowerMarkets} />}

      <OverallSection
        name={profileData?.name}
        website={profileData?.website}
        headquarters={profileData?.headquarters}
        founded={profileData?.founded}
        marketsAmount={marketsAmount}
        totalBorrowedAmount="0"
        defaults="0"
      />
    </Box>
  )
}
