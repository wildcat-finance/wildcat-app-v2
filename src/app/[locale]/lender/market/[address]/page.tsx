"use client"

import * as React from "react"
import { useEffect } from "react"

import { Box, Divider, Skeleton, Typography } from "@mui/material"
import { redirect } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { BorrowerProfileDetails } from "@/app/[locale]/borrower/profile/components/BorrowerProfileDetails"
import { BarCharts } from "@/app/[locale]/lender/market/[address]/components/BarCharts"
import { WithdrawalRequests } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests"
import { CommonGlossarySidebar } from "@/components/CommonGlossarySidebar"
import { MarketCollateralContract } from "@/components/MarketCollateralContract"
import { MarketHeader } from "@/components/MarketHeader"
import { MarketParameters } from "@/components/MarketParameters"
import { PaginatedMarketRecordsTable } from "@/components/PaginatedMarketRecordsTable"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketSections,
  setIsLender,
  setIsLoading,
  setSection,
  resetPageState,
  setHasCollateralContract,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"

import { CapacityBarChart } from "./components/BarCharts/CapacityBarChart"
import { MarketActions } from "./components/MarketActions"
import { useGetLenderWithdrawals } from "./hooks/useGetLenderWithdrawals"
import { useLenderMarketAccount } from "./hooks/useLenderMarketAccount"
import { LenderStatus } from "./interface"
import { SectionContainer, SkeletonContainer, SkeletonStyle } from "./style"
import { getEffectiveLenderRole } from "./utils"

const BorrowerProfileRedirect = ({ address }: { address: string }) => {
  useEffect(() => {
    redirect(`/borrower/profile/${address}`)
  }, [])
  return null
}

export default function LenderMarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()
  const { data: market, isLoading: isMarketLoading } = useGetMarket({ address })
  const { data: marketAccount, isLoadingInitial: isMarketAccountLoading } =
    useLenderMarketAccount(market)
  const { data: withdrawals, isLoadingInitial: isWithdrawalsLoading } =
    useGetLenderWithdrawals(market)

  const authorizedInMarket =
    marketAccount &&
    isConnected &&
    !isWrongNetwork &&
    [LenderStatus.DepositAndWithdraw, LenderStatus.WithdrawOnly].includes(
      getEffectiveLenderRole(marketAccount),
    )

  const isLoading =
    isMarketLoading ||
    isMarketAccountLoading ||
    isWithdrawalsLoading ||
    authorizedInMarket === undefined

  const currentSection = useAppSelector(
    (state) => state.lenderMarketRouting.currentSection,
  )

  useEffect(() => {
    dispatch(setIsLoading(isLoading))
  }, [isLoading])

  useEffect(() => {
    dispatch(setHasCollateralContract((market?.numCollateralContracts ?? 0) > 0))
  }, [market])

  useEffect(() => {
    if (!authorizedInMarket) {
      dispatch(setIsLender(!!authorizedInMarket))
      dispatch(setSection(LenderMarketSections.STATUS))
    } else {
      dispatch(setIsLender(authorizedInMarket))
      dispatch(setSection(LenderMarketSections.TRANSACTIONS))
    }
  }, [authorizedInMarket])

  useEffect(
    () => () => {
      dispatch(resetPageState())
    },
    [],
  )

  const glossary = [
    {
      title: "Collateral Contract",
      description:
        "Contract holding secondary collateral assets which can be liquidated to repay debts when a market is in penalised delinquency.",
    },
    {
      title: "Reclaim",
      description:
        "Reclaim assets you have deposited to the collateral contract. This can only be accessed when the underlying market is terminated.",
    },
    {
      title: "Liquidate",
      description:
        "Liquidate assets in the collateral contract through Bebop. This can only be accessed when the underlying market is in penalised delinquency, and can only be triggered by approved liquidators.",
    },
  ]

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
          <Typography variant="text2">
            {t("borrowerMarketDetails.noDataAvailable")}
          </Typography>
        </Box>
      </Box>
    )

  return (
    <Box sx={{ width: "100%", display: "flex" }}>
      <Box sx={{ width: "100%" }}>
        <MarketHeader marketAccount={marketAccount} />

        <Box sx={SectionContainer}>
          {currentSection === LenderMarketSections.TRANSACTIONS && (
            <Box>
              {authorizedInMarket && (
                <MarketActions
                  marketAccount={marketAccount}
                  withdrawals={withdrawals}
                />
              )}
              <CapacityBarChart
                marketAccount={marketAccount}
                legendType="big"
                isLender={authorizedInMarket}
              />
            </Box>
          )}

          {currentSection === LenderMarketSections.STATUS && (
            <Box marginTop="12px">
              <BarCharts
                marketAccount={marketAccount}
                withdrawals={withdrawals}
                isLender={authorizedInMarket}
              />
              <Divider sx={{ margin: "40px 0 44px" }} />
              <MarketParameters market={market} />
            </Box>
          )}

          {currentSection === LenderMarketSections.BORROWER_PROFILE && (
            <BorrowerProfileDetails
              address={marketAccount.market.borrower}
              hideMarkets
            />
          )}

          {currentSection === LenderMarketSections.REQUESTS && (
            <Box marginTop="12px">
              <WithdrawalRequests withdrawals={withdrawals} />
            </Box>
          )}
          {currentSection === LenderMarketSections.MARKET_HISTORY && (
            <Box marginTop="12px">
              <PaginatedMarketRecordsTable market={market} />
            </Box>
          )}
          {currentSection === LenderMarketSections.COLLATERAL_CONTRACT && (
            <MarketCollateralContract marketAccount={marketAccount} />
          )}
        </Box>
      </Box>

      <CommonGlossarySidebar
        glossaryArray={glossary}
        hideGlossary={
          currentSection !== LenderMarketSections.COLLATERAL_CONTRACT
        }
      />
    </Box>
  )
}
