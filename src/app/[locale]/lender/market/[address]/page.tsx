"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Divider, Skeleton, Typography, useTheme } from "@mui/material"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { BorrowerProfileDetails } from "@/app/[locale]/borrower/profile/components/BorrowerProfileDetails"
import { BarCharts } from "@/app/[locale]/lender/market/[address]/components/BarCharts"
import { MobileMarketActions } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMarketActions"
import { MobileMlaAlert } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMlaAlert"
import { MobileMlaModal } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMlaModal/MobileMlaModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { MobileMarketDescriptionModal } from "@/app/[locale]/lender/market/[address]/components/Modals/MobileMarketDescriptionModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { SwitchChainAlert } from "@/app/[locale]/lender/market/[address]/components/SwitchChainAlert"
import { WithdrawalRequests } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests"
import { Footer } from "@/components/Footer"
import { MarketHeader } from "@/components/MarketHeader"
import { MarketParameters } from "@/components/MarketParameters"
import { PaginatedMarketRecordsTable } from "@/components/PaginatedMarketRecordsTable"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useMarketSummary } from "@/hooks/useMarketSummary"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { hideDescriptionSection } from "@/store/slices/hideMarketSectionsSlice/hideMarketSectionsSlice"
import {
  LenderMarketSections,
  setIsLender,
  setIsLoading,
  setSection,
  resetPageState,
  setWithdrawalsCount,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"

import { CapacityBarChart } from "./components/BarCharts/CapacityBarChart"
import { MarketActions } from "./components/MarketActions"
import { MarketSummary } from "./components/MarketSummary"
import { useGetLenderWithdrawals } from "./hooks/useGetLenderWithdrawals"
import { useLenderMarketAccount } from "./hooks/useLenderMarketAccount"
import { LenderStatus } from "./interface"
import { SectionContainer, SkeletonContainer, SkeletonStyle } from "./style"
import { getEffectiveLenderRole } from "./utils"

export default function LenderMarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const theme = useTheme()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { isConnected } = useAccount()

  const searchParams = useSearchParams()
  const marketChainIdRaw = parseInt(searchParams.get("chainId") ?? "", 10)
  const marketChainId = Number.isFinite(marketChainIdRaw)
    ? marketChainIdRaw
    : undefined

  const {
    data: market,
    isLoading: isMarketLoading,
    apiError,
  } = useGetMarket({
    address,
    chainId: marketChainId,
  })

  const { isWrongNetwork, isSelectionMismatch, selectedChainId } =
    useNetworkGate({
      desiredChainId: market?.chainId ?? marketChainId,
      includeAgreementStatus: false,
    })

  const { data: marketAccount, isLoadingInitial: isMarketAccountLoading } =
    useLenderMarketAccount(market)
  const { data: withdrawals, isLoadingInitial: isWithdrawalsLoading } =
    useGetLenderWithdrawals(market)
  const { data: marketSummary, isLoading: isLoadingSummary } = useMarketSummary(
    address.toLowerCase(),
    market?.chainId ?? selectedChainId,
  )

  const hasMarketDescription =
    !!marketSummary && marketSummary?.description !== ""

  const isDifferentChain = isSelectionMismatch || isWrongNetwork

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
    if (!authorizedInMarket) {
      dispatch(setIsLender(!!authorizedInMarket))
      dispatch(setSection(LenderMarketSections.STATUS))
    } else {
      dispatch(setIsLender(authorizedInMarket))
      dispatch(setSection(LenderMarketSections.TRANSACTIONS))
    }
  }, [authorizedInMarket])

  const ongoingCount = (
    withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []
  ).flatMap((b) => b.requests).length

  const claimableCount = (withdrawals.expiredPendingWithdrawals ?? []).flatMap(
    (withdrawal) => {
      const claimableAmount = withdrawal.availableWithdrawalAmount
      return withdrawal.requests.filter((request) => {
        const amount = claimableAmount.mulDiv(
          request.scaledAmount,
          withdrawal.scaledAmount,
        )
        return amount.gt(0)
      })
    },
  ).length

  const outstandingCount = (
    withdrawals?.expiredPendingWithdrawals ?? []
  ).flatMap((b) =>
    b.requests.filter((wd) => wd.getNormalizedAmountOwed(b.batch).gt(0)),
  ).length

  const totalWithdrawalsCount = ongoingCount + claimableCount + outstandingCount

  useEffect(() => {
    dispatch(setWithdrawalsCount(totalWithdrawalsCount))
  }, [totalWithdrawalsCount])

  useEffect(
    () => () => {
      dispatch(resetPageState())
    },
    [],
  )

  const isMobile = useMobileResolution()

  const { data: mla, isLoading: mlaLoading } = useMarketMla(market?.address)

  const [isMobileDepositOpen, setIsMobileDepositOpen] = React.useState(false)
  const [isMobileWithdrawalOpen, setIsMobileWithdrawalOpen] =
    React.useState(false)
  const [isMobileMLAOpen, setIsMobileMLAOpen] = React.useState(false)
  const [isMobileDescriptionOpen, setIsMobileDescriptionOpen] =
    React.useState(false)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!marketSummary || marketSummary!.description === "") {
      dispatch(hideDescriptionSection(true))
    } else {
      dispatch(hideDescriptionSection(false))
    }
  }, [marketSummary])

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

  if (apiError)
    return (
      <Box sx={{ padding: "52px 20px 0 44px" }}>
        <Box sx={{ width: "69%" }}>
          <Typography variant="title2">
            Failed to load market data. Please try again later.
          </Typography>
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

  if (isMobile && isMobileDescriptionOpen)
    return (
      <Box>
        <MobileMarketDescriptionModal
          marketName={market?.name}
          marketSummary={marketSummary}
          isLoading={isLoadingSummary}
          setIsMobileDescriptionOpen={setIsMobileDescriptionOpen}
        />

        {(authorizedInMarket || isDifferentChain) && (
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

        <Footer showFooter={false} />
      </Box>
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
          <MarketHeader
            marketAccount={marketAccount}
            mla={mla}
            hasMarketDescription={hasMarketDescription}
          />

          <Box id="depositWithdraw">
            <BarCharts
              marketAccount={marketAccount}
              withdrawals={withdrawals}
              isLender={authorizedInMarket as boolean}
            />
          </Box>

          {hasMarketDescription && (
            <Box id="marketSummary">
              <MarketSummary
                marketSummary={marketSummary}
                isLoading={isLoadingSummary}
                setIsMobileDescriptionOpen={setIsMobileDescriptionOpen}
              />
            </Box>
          )}

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

          {(authorizedInMarket || isDifferentChain) && (
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
    <Box>
      <Box>
        <MarketHeader marketAccount={marketAccount} />

        {isDifferentChain && (
          <SwitchChainAlert desiredChainId={market?.chainId} />
        )}

        <Box sx={SectionContainer(theme, isDifferentChain)}>
          {currentSection === LenderMarketSections.TRANSACTIONS && (
            <Box>
              {authorizedInMarket && !isDifferentChain && (
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

          {currentSection === LenderMarketSections.SUMMARY && (
            <MarketSummary
              marketSummary={marketSummary}
              isLoading={isLoadingSummary}
            />
          )}

          {currentSection === LenderMarketSections.BORROWER_PROFILE && (
            <>
              <Divider sx={{ paddingTop: "12px" }} />

              <BorrowerProfileDetails
                address={marketAccount.market.borrower}
                isMarketPage
                hideMarkets
              />
            </>
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
        </Box>
      </Box>
    </Box>
  )
}
