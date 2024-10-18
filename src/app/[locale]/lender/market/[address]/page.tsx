"use client"

import { useEffect } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { LenderRole, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { useGetMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useGetMarket"
import {
  SkeletonContainer,
  SkeletonStyle,
} from "@/app/[locale]/borrower/market/[address]/style"
import { MarketActions } from "@/app/[locale]/lender/market/[address]/components/MarketActions"
import { LenderStatus } from "@/app/[locale]/lender/market/interface"
import { MarketHeader } from "@/components/MarketHeader"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketSections,
  setIsLoading,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"

import { useLenderMarketAccount } from "./hooks/useLenderMarketAccount"

// TODO: move to utils
const getEffectiveLenderRole = (account: MarketAccount): LenderStatus => {
  if (account.role === LenderRole.Null && account.isAuthorizedOnController)
    return LenderStatus.DepositAndWithdraw
  switch (account.role) {
    case LenderRole.DepositAndWithdraw:
      return LenderStatus.DepositAndWithdraw
    case LenderRole.WithdrawOnly:
      return LenderStatus.WithdrawOnly
    case LenderRole.Blocked:
      return LenderStatus.Blocked
    case LenderRole.Null:
    default:
      return LenderStatus.Null
  }
}

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

  const isLoading = isMarketLoading || isMarketAccountLoading

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
              <MarketActions marketAccount={marketAccount} />
            )}
        </Box>
      </Box>
    </Box>
  )
}
