"use client"

import * as React from "react"

import { Box, Divider } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { MarketsSection } from "@/app/[locale]/borrower/profile/components/MarketsSection"
import { NameSection } from "@/app/[locale]/borrower/profile/components/NameSection"
import { OverallSection } from "@/app/[locale]/borrower/profile/components/OverallSection"
import { ProfileSkeleton } from "@/app/[locale]/borrower/profile/components/ProfileSkeleton"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { useGetTokenPrices } from "@/hooks/useGetTokenPrices"
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

  const { data: tokenPrices, isLoading: isLoadingTokenPrices } =
    useGetTokenPrices(
      borrowerMarkets?.map((market) => market.underlyingToken) ?? [],
    )

  const { totalDebtValue, sources } = React.useMemo(() => {
    if (!tokenPrices || !borrowerMarkets)
      return { totalDebtValue: 0, sources: [] }
    return borrowerMarkets.reduce(
      (acc, market) => {
        const totalDebt = +market.totalDebts.format()
        const priceData =
          tokenPrices[market.underlyingToken.address.toLowerCase()]
        if (!priceData) return acc
        const value = totalDebt * priceData.usdPrice
        if (!acc.sources.includes(priceData.source)) {
          acc.sources.push(priceData.source)
        }
        acc.totalDebtValue += value
        return acc
      },
      { totalDebtValue: 0, sources: [] as string[] },
    )
  }, [borrowerMarkets, tokenPrices])

  const isLoading = isMarketsLoading || isProfileLoading

  if (isLoading) return <ProfileSkeleton type="external" rootSx={sx} />

  return (
    <Box sx={sx}>
      <NameSection
        type="external"
        {...profileData}
        name={profileData?.name || trimAddress(address)}
        marketsAmount={marketsAmount}
      />

      <OverallSection
        {...profileData}
        marketsAmount={marketsAmount}
        isLoadingTotalValue={isLoadingTokenPrices}
        totalDebtValue={totalDebtValue}
        priceSources={sources}
      />

      <Divider sx={{ margin: "32px 0" }} />

      {!hideMarkets && marketsAmount !== 0 && (
        <MarketsSection markets={borrowerMarkets} />
      )}
    </Box>
  )
}
