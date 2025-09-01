"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import {
  Box,
  Divider,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { redirect } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { BorrowerProfileDetails } from "@/app/[locale]/borrower/profile/components/BorrowerProfileDetails"
import { BarCharts } from "@/app/[locale]/lender/market/[address]/components/BarCharts"
import { MobileMarketActions } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMarketActions"
import { MobileMlaAlert } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMlaAlert"
import { MobileMlaModal } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMlaModal/MobileMlaModal"
import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { WithdrawalRequests } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests"
import { CommonGlossarySidebar } from "@/components/CommonGlossarySidebar"
import { Footer } from "@/components/Footer"
import { MarketCollateralContract } from "@/components/MarketCollateralContract"
import { MarketHeader } from "@/components/MarketHeader"
import { MarketParameters } from "@/components/MarketParameters"
import { PaginatedMarketRecordsTable } from "@/components/PaginatedMarketRecordsTable"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useMobileResolution } from "@/hooks/useMobileResolution"
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
  const theme = useTheme()
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
    dispatch(
      setHasCollateralContract((market?.numCollateralContracts ?? 0) > 0),
    )
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

  const isMobile = useMobileResolution()

  const { data: mla, isLoading: mlaLoading } = useMarketMla(market?.address)

  const [isMobileDepositOpen, setIsMobileDepositOpen] = React.useState(false)
  const [isMobileWithdrawalOpen, setIsMobileWithdrawalOpen] =
    React.useState(false)
  const [isMobileMLAOpen, setIsMobileMLAOpen] = React.useState(false)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (isLoading && isMobile)
    return (
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Skeleton
          sx={{
            width: "100%",
            height: "156px",
            backgroundColor: COLORS.white06,
            borderRadius: "14px",
          }}
        />

        <Skeleton
          sx={{
            width: "100%",
            height: "126px",
            backgroundColor: COLORS.white06,
            borderRadius: "14px",
          }}
        />
      </Box>
    )

  if (isLoading && !isMobile)
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

  if (isMobile && isMobileDepositOpen)
    return (
      <DepositModal
        isMobileOpen={isMobileDepositOpen}
        setIsMobileOpen={setIsMobileDepositOpen}
        marketAccount={marketAccount}
      />
    )

  if (isMobile && isMobileWithdrawalOpen)
    return (
      <WithdrawModal
        marketAccount={marketAccount}
        isMobileOpen={isMobileWithdrawalOpen}
        setIsMobileOpen={setIsMobileWithdrawalOpen}
      />
    )

  if (isMobile && isMobileMLAOpen)
    return (
      <MobileMlaModal
        isMobileOpen={isMobileMLAOpen}
        setIsMobileOpen={setIsMobileMLAOpen}
        mla={mla}
        isLoading={mlaLoading}
      />
    )

  if (isMobile)
    return (
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <MarketHeader marketAccount={marketAccount} mla={mla} />

          <Box id="depositWithdraw">
            <BarCharts
              marketAccount={marketAccount}
              withdrawals={withdrawals}
              isLender={authorizedInMarket as boolean}
            />
          </Box>

          <Box id="status">
            <MarketParameters market={market} />
          </Box>

          <Box id="requests">
            <WithdrawalRequests withdrawals={withdrawals} />
          </Box>

          <Box id="mla">
            <MobileMlaAlert
              mla={mla}
              isLoading={mlaLoading}
              isMLAOpen={isMobileMLAOpen}
              setIsMLAOpen={setIsMobileMLAOpen}
            />
          </Box>

          <MarketCollateralContract marketAccount={marketAccount} hideActions />

          {authorizedInMarket && (
            <MobileMarketActions
              marketAccount={marketAccount}
              withdrawals={withdrawals}
              isMobileDepositOpen={isMobileDepositOpen}
              isMobileWithdrawalOpen={isMobileWithdrawalOpen}
              setIsMobileDepositOpen={setIsMobileDepositOpen}
              setIsMobileWithdrawalOpen={setIsMobileWithdrawalOpen}
              isMLAOpen={isMobileMLAOpen}
              setIsMLAOpen={setIsMobileMLAOpen}
            />
          )}
        </Box>

        <Footer showFooter={false} />
      </>
    )

  return (
    <Box sx={{ width: "100%", display: "flex" }}>
      <Box sx={{ width: "100%" }}>
        <MarketHeader marketAccount={marketAccount} />

        <Box sx={SectionContainer(theme)}>
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
                isLender={authorizedInMarket as boolean}
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
            <MarketCollateralContract
              marketAccount={marketAccount}
              hideActions
            />
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
