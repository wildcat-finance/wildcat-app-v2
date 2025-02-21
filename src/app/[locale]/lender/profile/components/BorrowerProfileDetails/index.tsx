"use client"

import * as React from "react"
import { useEffect } from "react"

import { Box, Divider } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { MarketsSection } from "@/app/[locale]/borrower/profile/components/MarketsSection"
import { NameSection } from "@/app/[locale]/borrower/profile/components/NameSection"
import { OverallSection } from "@/app/[locale]/borrower/profile/components/OverallSection"
import { ProfileSkeleton } from "@/app/[locale]/borrower/profile/components/ProfileSkeleton"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { trimAddress } from "@/utils/formatters"

import { BorrowerProfileDetailsProps } from "./interface"

export function BorrowerProfileDetails({
  address,
  hideMarkets,
  sx,
}: BorrowerProfileDetailsProps) {
  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(address as `0x${string}`)
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(address as `0x${string}`)

  const marketsAmount = borrowerMarkets?.filter((market) => !market.isClosed)
    .length

  const isLoading = isMarketsLoading || isProfileLoading

  if (isLoading) return <ProfileSkeleton type="external" rootSx={sx} />

  return (
    <Box sx={sx}>
      <NameSection
        type="external"
        name={profileData?.name || trimAddress(address)}
        description={profileData?.description}
        website={profileData?.website}
        twitter={profileData?.twitter}
        linkedin={profileData?.linkedin}
        telegram={profileData?.telegram}
        marketsAmount={marketsAmount}
      />

      <OverallSection
        {...profileData}
        marketsAmount={marketsAmount}
        // totalBorrowedAmount="0"
        // defaults="0"
      />

      <Divider sx={{ margin: "32px 0" }} />

      {!hideMarkets && marketsAmount !== 0 && (
        <MarketsSection markets={borrowerMarkets} />
      )}
    </Box>
  )
}
