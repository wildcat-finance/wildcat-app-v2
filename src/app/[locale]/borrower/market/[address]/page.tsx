"use client"

import * as React from "react"

import { Box, Divider, Skeleton } from "@mui/material"

import { MarketStatusChart } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart"
import { useGetMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useGetMarket"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { COLORS } from "@/theme/colors"

import { MarketHeader } from "./components/MarketHeader"
import { MarketParameters } from "./components/MarketParameters"
import { MarketTransactions } from "./components/MarketTransactions"
import { MarketWithdrawalRequests } from "./components/MarketWithdrawalRequests"
import { SkeletonContainer, SkeletonStyle } from "./style"

export default function MarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const { data: market } = useGetMarket({
    address,
  })
  const { data: marketAccount } = useGetMarketAccountForBorrowerLegacy(market)

  if (!market || !marketAccount)
    return (
      <Box sx={{ padding: "52px 20px 0 44px" }}>
        <Box sx={{ width: "69%" }}>
          <Box width="100%" height="90px">
            <Skeleton
              height="20px"
              width="132px"
              sx={{ bgcolor: COLORS.athensGrey }}
            />
          </Box>

          <Box sx={SkeletonContainer}>
            <Skeleton height="82px" width="395px" sx={SkeletonStyle} />

            <Skeleton height="82px" width="395px" sx={SkeletonStyle} />
          </Box>

          <Box
            sx={SkeletonContainer}
            marginTop="56px"
            flexDirection="column"
            gap="20px"
          >
            <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
            <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
            <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
          </Box>
        </Box>
      </Box>
    )

  return (
    <Box sx={{ padding: "52px 20px 0 44px" }}>
      <Box sx={{ width: "69%" }}>
        <MarketHeader market={market} />

        <Divider sx={{ margin: "32px 0" }} />

        <MarketTransactions market={market} marketAccount={marketAccount} />

        <Divider sx={{ margin: "32px 0 44px" }} />

        <MarketStatusChart market={market} />

        <Divider sx={{ margin: "32px 0 44px" }} />

        <MarketParameters market={market} />

        <Divider sx={{ margin: "32px 0 44px" }} />

        <MarketWithdrawalRequests />
      </Box>
    </Box>
  )
}
