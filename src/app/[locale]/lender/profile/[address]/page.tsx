"use client"

import * as React from "react"
import { useEffect } from "react"

import { Box, Divider } from "@mui/material"
import { redirect } from "next/navigation"
import { useAccount } from "wagmi"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { ContentContainer } from "@/app/[locale]/borrower/profile/style"
import { ROUTES } from "@/routes"
import { trimAddress } from "@/utils/formatters"

import { MarketsSection } from "./components/MarketsSection"
import { NameSection } from "./components/NameSection"
import { OverallSection } from "./components/OverallSection"
import { ProfileSkeleton } from "./components/ProfileSkeleton"

export default function OtherBorrowerProfile({
  params: { address },
}: {
  params: { address: `0x${string}` }
}) {
  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(address)
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(address)
  const { address: userAddress } = useAccount()

  const marketsAmount = borrowerMarkets?.filter((market) => !market.isClosed)
    .length

  const isLoading = isMarketsLoading || isProfileLoading

  useEffect(() => {
    if (address.toLowerCase() === userAddress?.toLowerCase()) {
      redirect(ROUTES.borrower.profile)
    }
  }, [address, userAddress])

  if (isLoading) return <ProfileSkeleton type="external" />

  return (
    <Box sx={ContentContainer}>
      <NameSection
        type="external"
        name={profileData?.name || trimAddress(address)}
        description={profileData?.description}
        website={profileData?.website}
        twitter={profileData?.twitter}
        linkedin={profileData?.linkedin}
        marketsAmount={marketsAmount}
      />

      <Divider sx={{ margin: "32px 0" }} />

      {marketsAmount !== 0 && <MarketsSection markets={borrowerMarkets} />}

      <OverallSection
        name={profileData?.name}
        alias={profileData?.alias}
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
