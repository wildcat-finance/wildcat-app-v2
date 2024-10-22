"use client"

import { useEffect } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { MarketHeader } from "@/components/MarketHeader"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketSections,
  setIsLoading,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"

import { CapacityBarChart } from "./components/CapacityBarChart"
import { MarketActions } from "./components/MarketActions"
import { useGetLenderWithdrawals } from "./hooks/useGetLenderWithdrawals"
import { useLenderMarketAccount } from "./hooks/useLenderMarketAccount"
import { LenderStatus } from "./interface"
import { SkeletonContainer, SkeletonStyle } from "./style"
import { getEffectiveLenderRole } from "./utils"

export default function LenderMarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const dispatch = useAppDispatch()
  const { isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()
  const { data: market, isLoading: isMarketLoading } = useGetMarket({ address })
  const { data: marketAccount, isLoadingInitial: isMarketAccountLoading } =
    useLenderMarketAccount(market)
  const { data: withdrawals, isLoadingInitial: isWithdrawalsLoading } =
    useGetLenderWithdrawals(market)

  const isLoading =
    isMarketLoading || isMarketAccountLoading || isWithdrawalsLoading

  const authorizedInMarket =
    marketAccount &&
    isConnected &&
    !isWrongNetwork &&
    [LenderStatus.DepositAndWithdraw, LenderStatus.WithdrawOnly].includes(
      getEffectiveLenderRole(marketAccount),
    )

  const currentSection = useAppSelector(
    (state) => state.lenderMarketRouting.currentSection,
  )

  useEffect(() => {
    dispatch(setIsLoading(isLoading))
  }, [isLoading])

  if (isLoading)
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

  if (!marketAccount || !market)
    return (
      <Box sx={{ padding: "52px 20px 0 44px" }}>
        <Box sx={{ width: "69%" }}>
          <Typography variant="text2">No data available</Typography>
        </Box>
      </Box>
    )

  return (
    <Box sx={{ padding: "52px 20px 0 44px" }}>
      <Box width="69%">
        <MarketHeader marketAccount={marketAccount} />

        <Box
          sx={{
            width: "100%",
            overflow: "hidden",
            overflowY: "visible",
            height: "calc(100vh - 43px - 43px - 52px - 60px - 52px)",
          }}
        >
          {authorizedInMarket &&
            currentSection === LenderMarketSections.TRANSACTIONS && (
              <MarketActions
                marketAccount={marketAccount}
                withdrawals={withdrawals}
              />
            )}

          <CapacityBarChart marketAccount={marketAccount} />
        </Box>
      </Box>
    </Box>
  )
}
