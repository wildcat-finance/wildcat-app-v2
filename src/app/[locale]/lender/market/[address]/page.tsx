"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Divider, Skeleton, Typography, useTheme } from "@mui/material"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { BarCharts } from "@/app/[locale]/lender/market/[address]/components/BarCharts"
import { BorrowerPenaltyWarning } from "@/app/[locale]/lender/market/[address]/components/BorrowerPenaltyWarning"
import { MobileLenderBanner } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileLenderBanner"
import { MobileMarketActions } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMarketActions"
import { MobileMlaAlert } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMlaAlert"
import { MobileMlaModal } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileMlaModal/MobileMlaModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { MobileMarketDescriptionModal } from "@/app/[locale]/lender/market/[address]/components/Modals/MobileMarketDescriptionModal"
import { MobileMarketHistoryModal } from "@/app/[locale]/lender/market/[address]/components/Modals/MobileMarketHistoryModal"
import { NonMlaAcknowledgementModal } from "@/app/[locale]/lender/market/[address]/components/Modals/NonMlaAcknowledgementModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { SwitchChainAlert } from "@/app/[locale]/lender/market/[address]/components/SwitchChainAlert"
import { WithdrawalRequests } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests"
import { Footer } from "@/components/Footer"
import { ConnectWalletDialog } from "@/components/Header/HeaderButton/ConnectWalletDialog"
import { LeadBanner } from "@/components/LeadBanner"
import {
  AccountRowsSkeleton,
  ChartSectionSkeleton,
  LenderTransactionsSkeleton,
} from "@/components/MarketDetailSkeletons"
import { MarketHeader } from "@/components/MarketHeader"
import { MarketParameters } from "@/components/MarketParameters"
import { MobileConnectWallet } from "@/components/MobileConnectWallet"
import { PaginatedMarketRecordsTable } from "@/components/PaginatedMarketRecordsTable"
import { useIdlePrefetchMarketRecords } from "@/components/PaginatedMarketRecordsTable/hooks/usePrefetchMarketRecords"
import { PendingAprReductionBanner } from "@/components/PendingAprReductionBanner"
import { ProfileSection } from "@/components/Profile/ProfileSection"
import { METRIC_BASIS } from "@/components/Profile/shared/metricBasis"
import { analyticsUiEnabled } from "@/config/featureFlags"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useMarketDetailPerformanceMark } from "@/hooks/useMarketDetailPerformance"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useMarketSummary } from "@/hooks/useMarketSummary"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useWagmiHydrated } from "@/hooks/useWagmiHydrated"
import { useWrapperAccountState } from "@/hooks/wrapper/useWrapperAccountState"
import { useWrapperForMarket } from "@/hooks/wrapper/useWrapperForMarket"
import { ROUTES } from "@/routes"
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
import {
  setActiveTab,
  setIsMobileOpenedState,
  WrapDebtTokenTab,
} from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"
import { COLORS } from "@/theme/colors"
import {
  buildBorrowerProfileHref,
  formatTokenWithCommas,
} from "@/utils/formatters"

import { CapacityBarChart } from "./components/BarCharts/CapacityBarChart"
import { LenderAnalyticsSummary } from "./components/LenderAnalyticsSummary"
import { MarketActions } from "./components/MarketActions"
import { MarketSummary } from "./components/MarketSummary"
import { WrapDebtToken } from "./components/WrapDebtToken"
import { useBorrowerPenaltyWarning } from "./hooks/useBorrowerPenaltyWarning"
import { useGetLenderWithdrawals } from "./hooks/useGetLenderWithdrawals"
import { useLenderMarketAccount } from "./hooks/useLenderMarketAccount"
import { useLenderMarketAnalytics } from "./hooks/useLenderMarketAnalytics"
import { useMarketDailyFlows } from "./hooks/useMarketDailyFlows"
import { useMarketDelinquencyHistory } from "./hooks/useMarketDelinquencyHistory"
import {
  LenderBannerWrapper,
  MarketContentColumn,
  SectionContainer,
  SkeletonContainer,
  SkeletonStyle,
} from "./style"
import {
  getEffectiveLenderRole,
  getLenderBannerState,
  resolveLenderAccessState,
  shouldShowLenderTransactions,
} from "./utils"

const LenderFlowCharts = dynamic(
  () =>
    import("./components/LenderFlowCharts").then(
      (module) => module.LenderFlowCharts,
    ),
  {
    ssr: false,
    loading: () => <ChartSectionSkeleton sections={3} />,
  },
)

export default function LenderMarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const theme = useTheme()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const {
    address: connectedAddress,
    isConnected,
    isConnecting,
    isReconnecting,
  } = useAccount()
  const isWalletHydrated = useWagmiHydrated()
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false)

  const searchParams = useSearchParams()
  const marketChainIdRaw = parseInt(searchParams.get("chainId") ?? "", 10)
  const marketChainId = Number.isFinite(marketChainIdRaw)
    ? marketChainIdRaw
    : undefined

  const {
    data: market,
    isLoading: isMarketLoading,
    error: marketError,
    apiLoading,
    isDiscoveringChainId,
    isAwaitingMarketData,
  } = useGetMarket({
    address,
    chainId: marketChainId,
  })
  const performanceContext = {
    address: market?.address ?? address,
    chainId: market?.chainId ?? marketChainId,
    role: "lender" as const,
  }
  useMarketDetailPerformanceMark(
    "route-mount",
    {
      address,
      chainId: marketChainId,
      role: "lender",
    },
    true,
  )
  useIdlePrefetchMarketRecords(market)

  const { isWrongNetwork, isSelectionMismatch, selectedChainId } =
    useNetworkGate({
      desiredChainId: market?.chainId ?? marketChainId,
      includeAgreementStatus: false,
    })

  const {
    data: marketAccount,
    authoritativeAccount,
    authoritativeStatus,
    refetchUpdate: refetchLenderAccess,
  } = useLenderMarketAccount(market)
  const { data: withdrawals, isLoadingInitial: isWithdrawalsLoading } =
    useGetLenderWithdrawals(market)
  const {
    wrapper,
    hasWrapper,
    hasFactory,
    isLoading: isWrapperLookupLoading,
    isError: isWrapperError,
  } = useWrapperForMarket(market)
  const { publicClient: marketPublicClient } = useEthersProvider({
    chainId: market?.chainId,
  })
  const { data: wrapperAccountState, isLoading: isWrapperAccountStateLoading } =
    useWrapperAccountState(
      market?.chainId,
      wrapper,
      connectedAddress,
      marketPublicClient,
    )
  useMarketDetailPerformanceMark(
    "account-ready",
    performanceContext,
    !!market && authoritativeStatus === "resolved",
  )
  useMarketDetailPerformanceMark(
    "withdrawals-ready",
    performanceContext,
    !!market && !isWithdrawalsLoading,
  )
  const analytics = useLenderMarketAnalytics(
    market,
    connectedAddress,
    analyticsUiEnabled,
  )
  const {
    dailyFlows,
    isLoading: isFlowsLoading,
    symbol,
  } = useMarketDailyFlows(market, analyticsUiEnabled)
  const {
    delinquencyHistory,
    isLoading: isDelinquencyLoading,
    gracePeriodHours,
  } = useMarketDelinquencyHistory(market, analyticsUiEnabled)

  const hasLenderInteracted = !!marketAccount?.hasEverInteracted

  const analyticsSummaryItems = React.useMemo(() => {
    if (!market || !marketAccount) return []
    const zero = market.underlyingToken.getAmount(0)
    const assetSymbol = market.underlyingToken.symbol
    const totalDeposited = marketAccount.totalDeposited ?? zero
    const totalInterestEarned = marketAccount.totalInterestEarned ?? zero
    const totalWithdrawalsExecuted = analytics.totalWithdrawalsExecuted ?? zero
    return [
      {
        label: t("marketDetails.lender.analytics.lifetimeDeposited"),
        value: formatTokenWithCommas(totalDeposited),
        symbol: assetSymbol,
        tooltip: t("marketDetails.lender.analytics.lifetimeDepositedTooltip"),
        description: METRIC_BASIS.liveToken,
        fullPrecisionValue: totalDeposited.format(
          totalDeposited.decimals,
          true,
        ),
      },
      {
        label: t("marketDetails.lender.analytics.interestEarned"),
        value: formatTokenWithCommas(totalInterestEarned),
        symbol: assetSymbol,
        tooltip: t("marketDetails.lender.analytics.interestEarnedTooltip"),
        description: METRIC_BASIS.liveToken,
        fullPrecisionValue: totalInterestEarned.format(
          totalInterestEarned.decimals,
          true,
        ),
      },
      {
        label: t("marketDetails.lender.analytics.totalWithdrawalsExecuted"),
        value: formatTokenWithCommas(totalWithdrawalsExecuted),
        symbol: assetSymbol,
        tooltip: t(
          "marketDetails.lender.analytics.totalWithdrawalsExecutedTooltip",
        ),
        description: METRIC_BASIS.indexedToken,
        fullPrecisionValue: totalWithdrawalsExecuted.format(
          totalWithdrawalsExecuted.decimals,
          true,
        ),
      },
    ]
  }, [market, marketAccount, analytics.totalWithdrawalsExecuted, t])

  const additionalParameterItems = React.useMemo(() => {
    if (!market || !marketAccount) return []
    const interestEarned =
      marketAccount.totalInterestEarned ?? market.underlyingToken.getAmount(0)
    return [
      {
        title: t("marketDetails.lender.analytics.interestEarned"),
        value: formatTokenWithCommas(interestEarned, { withSymbol: true }),
        tooltipText: t("marketDetails.lender.analytics.interestEarnedTooltip"),
      },
      {
        title: t("marketDetails.lender.analytics.totalLenders"),
        value:
          analytics.activeLendersCount !== undefined
            ? analytics.activeLendersCount
            : "-",
        tooltipText: t("marketDetails.lender.analytics.totalLendersTooltip"),
      },
    ]
  }, [market, marketAccount, analytics.activeLendersCount, t])

  const { data: marketSummary, isLoading: isLoadingSummary } = useMarketSummary(
    address.toLowerCase(),
    market?.chainId ?? selectedChainId,
  )
  const borrowerPenaltyWarning = useBorrowerPenaltyWarning(market)
  const showBorrowerPenaltyWarning = borrowerPenaltyWarning.state === "warning"

  const hasMarketDescription =
    !!marketSummary && marketSummary?.description !== ""

  const isDifferentChain = isSelectionMismatch || isWrongNetwork

  const lenderAccessState = resolveLenderAccessState({
    authoritativeStatus,
    role: authoritativeAccount
      ? getEffectiveLenderRole(authoritativeAccount)
      : undefined,
  })
  const authorizedInMarket = lenderAccessState === "authorized"
  const hasWrappedMarketPosition =
    wrapperAccountState?.balances?.shareBalance.gt(0) ?? false
  const hasMarketPosition =
    (marketAccount?.marketBalance.gt(0) ?? false) || hasWrappedMarketPosition
  const hasWithdrawalActivity =
    !!withdrawals.activeWithdrawal ||
    withdrawals.expiredPendingWithdrawals.length > 0
  const showLenderTransactions = shouldShowLenderTransactions({
    accessState: lenderAccessState,
    hasMarketPosition,
    hasWithdrawalActivity,
  })
  const isWrapperLoading = isWrapperLookupLoading
  const isWrapperPositionLoading =
    isConnected &&
    hasFactory &&
    (isWrapperLookupLoading || (hasWrapper && isWrapperAccountStateLoading))

  const isLoadingMarket = isMarketLoading || apiLoading || isDiscoveringChainId
  const isLoading = !marketError && (isLoadingMarket || !market)
  const lenderBannerState = getLenderBannerState({
    isWalletHydrated,
    isConnected,
    isConnecting,
    isReconnecting,
    isDifferentChain,
    accessState: lenderAccessState,
    hasLenderTransactions: showLenderTransactions,
    isWithdrawalActivityLoading:
      isWithdrawalsLoading || isWrapperPositionLoading,
  })
  const showConnectWalletBanner = lenderBannerState === "connect"
  const showLenderAccessError = lenderBannerState === "authorization-error"
  const showLenderBlocked = lenderBannerState === "blocked"
  const showLenderRequestBanner = lenderBannerState === "request-access"
  const isTransactionsLoading =
    !marketAccount ||
    (showLenderTransactions && !isDifferentChain && isWithdrawalsLoading)
  const isBarChartsLoading = !marketAccount || isWithdrawalsLoading

  const currentSection = useAppSelector(
    (state) => state.lenderMarketRouting.currentSection,
  )

  useEffect(() => {
    dispatch(setIsLoading(isLoading))
  }, [isLoading])

  useEffect(() => {
    if (!isWalletHydrated || isConnecting || isReconnecting) return

    if (!isConnected || isDifferentChain) {
      dispatch(setIsLender(false))
      return
    }

    if (lenderAccessState === "resolving" || lenderAccessState === "error") {
      dispatch(setIsLender(showLenderTransactions))
      return
    }

    if (showLenderTransactions) {
      dispatch(setIsLender(true))
      dispatch(setSection(LenderMarketSections.TRANSACTIONS))
    } else {
      dispatch(setIsLender(false))
      dispatch(setSection(LenderMarketSections.STATUS))
    }
  }, [
    dispatch,
    isConnected,
    isConnecting,
    isDifferentChain,
    isReconnecting,
    isWalletHydrated,
    lenderAccessState,
    showLenderTransactions,
  ])

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

  useEffect(() => {
    if (currentSection !== LenderMarketSections.WRAP_DEBT_TOKEN) {
      dispatch(setActiveTab(WrapDebtTokenTab.WRAP))
    }
  }, [currentSection])

  useEffect(
    () => () => {
      dispatch(resetPageState())
      dispatch(setActiveTab(WrapDebtTokenTab.WRAP))
    },
    [],
  )

  const isMobile = useMobileResolution()

  const { data: mla, isLoading: mlaLoading } = useMarketMla(
    market?.address,
    market?.chainId,
  )

  const [isMobileDepositOpen, setIsMobileDepositOpen] = React.useState(false)
  const [isMobileAcknowledgementOpen, setIsMobileAcknowledgementOpen] =
    React.useState(false)
  const [isMobileWithdrawalOpen, setIsMobileWithdrawalOpen] =
    React.useState(false)
  const [isMobileMLAOpen, setIsMobileMLAOpen] = React.useState(false)
  const [isMobileDescriptionOpen, setIsMobileDescriptionOpen] =
    React.useState(false)
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = React.useState(false)
  const isMobileWrapperSectionOpen = useAppSelector(
    (state) => state.wrapDebtTokenFlow.isMobileOpenedState,
  )

  useEffect(() => {
    setIsMobileDepositOpen(false)
    setIsMobileAcknowledgementOpen(false)
    setIsMobileWithdrawalOpen(false)
  }, [connectedAddress, isDifferentChain])

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!marketSummary || marketSummary!.description === "") {
      dispatch(hideDescriptionSection(true))
    } else {
      dispatch(hideDescriptionSection(false))
    }
  }, [marketSummary])

  useEffect(() => {
    if (!isMobile) {
      dispatch(setIsMobileOpenedState(true))
    } else {
      dispatch(setIsMobileOpenedState(false))
    }
  }, [isMobile])

  if (!mounted) return null

  if (isAwaitingMarketData)
    return (
      <Box sx={{ padding: "32px 20px 0 44px" }}>
        <Typography
          component="p"
          role="status"
          aria-live="polite"
          variant="text3"
          color={COLORS.santasGrey}
        >
          {t("common.labels.loadingMarketDetails")}
        </Typography>
      </Box>
    )

  if (marketError)
    return (
      <Box sx={{ padding: "32px 20px 0 44px" }}>
        <Typography
          component="p"
          role="alert"
          variant="text3"
          color={COLORS.santasGrey}
        >
          {t("common.labels.unableLoadMarketDetails")}
        </Typography>
      </Box>
    )

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

  if (!market)
    return (
      <Box sx={{ padding: "52px 20px 0 44px" }}>
        <Box sx={{ width: "69%" }}>
          <Typography variant="text2">
            {t("marketDetails.lender.noDataAvailable")}
          </Typography>
        </Box>
      </Box>
    )

  if (isMobile && isMobileAcknowledgementOpen)
    return (
      <NonMlaAcknowledgementModal
        open
        marketAddress={market.address}
        marketName={market.name}
        borrowerAddress={market.borrower}
        chainId={market.chainId}
        onClose={() => setIsMobileAcknowledgementOpen(false)}
        onAcknowledged={() => {
          setIsMobileAcknowledgementOpen(false)
          setIsMobileDepositOpen(true)
        }}
      />
    )

  if (isMobile && isMobileDepositOpen && marketAccount)
    return (
      <DepositModal
        isMobileOpen={isMobileDepositOpen}
        setIsMobileOpen={setIsMobileDepositOpen}
        setIsMobileAcknowledgementOpen={setIsMobileAcknowledgementOpen}
        marketAccount={marketAccount}
        borrowerPenaltyWarningState={borrowerPenaltyWarning.state}
        refreshBorrowerPenaltyWarning={borrowerPenaltyWarning.refresh}
      />
    )

  if (isMobile && isMobileWithdrawalOpen && marketAccount)
    return (
      <WithdrawModal
        marketAccount={marketAccount}
        wrapper={wrapper}
        hasWrapper={hasWrapper}
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

        {marketAccount &&
          isConnected &&
          (showLenderTransactions || isDifferentChain) && (
            <MobileMarketActions
              marketAccount={marketAccount}
              withdrawals={withdrawals}
              accessState={lenderAccessState}
              wrapper={wrapper}
              hasWrapper={hasWrapper}
              isMobileWithdrawalOpen={isMobileWithdrawalOpen}
              setIsMobileDepositOpen={setIsMobileDepositOpen}
              setIsMobileAcknowledgementOpen={setIsMobileAcknowledgementOpen}
              setIsMobileWithdrawalOpen={setIsMobileWithdrawalOpen}
              isMLAOpen={isMobileMLAOpen}
              setIsMLAOpen={setIsMobileMLAOpen}
            />
          )}

        <Footer showFooter={false} />
      </Box>
    )

  if (isMobile && isMobileHistoryOpen)
    return (
      <Box>
        <MobileMarketHistoryModal
          market={market}
          setIsMobileHistoryOpen={setIsMobileHistoryOpen}
        />

        {marketAccount &&
          isConnected &&
          (showLenderTransactions || isDifferentChain) && (
            <MobileMarketActions
              marketAccount={marketAccount}
              withdrawals={withdrawals}
              accessState={lenderAccessState}
              wrapper={wrapper}
              hasWrapper={hasWrapper}
              isMobileWithdrawalOpen={isMobileWithdrawalOpen}
              setIsMobileDepositOpen={setIsMobileDepositOpen}
              setIsMobileAcknowledgementOpen={setIsMobileAcknowledgementOpen}
              setIsMobileWithdrawalOpen={setIsMobileWithdrawalOpen}
              isMLAOpen={isMobileMLAOpen}
              setIsMLAOpen={setIsMobileMLAOpen}
            />
          )}

        <Footer showFooter={false} />
      </Box>
    )

  if (isMobile && isMobileWrapperSectionOpen)
    return (
      <>
        <WrapDebtToken
          market={market}
          wrapper={wrapper}
          hasWrapper={hasWrapper}
          hasFactory={hasFactory}
          isWrapperLoading={isWrapperLoading}
          isWrapperLookupLoading={isWrapperLookupLoading}
          isWrapperError={isWrapperError}
          isAuthorizedLender={authorizedInMarket as boolean}
          isDifferentChain={isDifferentChain}
        />

        <Footer showFooter={false} showDivider={false} />
      </>
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
            market={market}
            marketAccount={marketAccount}
            mla={mla}
            hasMarketDescription={hasMarketDescription}
          />

          {showBorrowerPenaltyWarning && <BorrowerPenaltyWarning />}
          <PendingAprReductionBanner
            market={market}
            sx={{ margin: "8px 0 4px" }}
          />

          <Box id="depositWithdraw">
            {marketAccount && !isWithdrawalsLoading ? (
              <BarCharts
                marketAccount={marketAccount}
                withdrawals={withdrawals}
                isLender={authorizedInMarket}
              />
            ) : (
              <ChartSectionSkeleton sections={authorizedInMarket ? 3 : 1} />
            )}
          </Box>

          {analyticsUiEnabled && hasLenderInteracted && (
            <LenderAnalyticsSummary
              items={analyticsSummaryItems}
              isLoading={analytics.isLoading}
            />
          )}

          {hasMarketDescription && (
            <Box id="marketDescription">
              <MarketSummary
                marketSummary={marketSummary}
                isLoading={isLoadingSummary}
                isOpen={isMobileDescriptionOpen}
                setIsOpen={setIsMobileDescriptionOpen}
              />
            </Box>
          )}

          <Box id="status">
            <MarketParameters
              market={market}
              viewerType="lender"
              wrapper={wrapper}
              hasWrapper={hasWrapper}
              additionalItems={additionalParameterItems}
            />
          </Box>

          <Box id="requests">
            <WithdrawalRequests
              withdrawals={withdrawals}
              chainId={market.chainId}
            />
          </Box>

          <Box id="marketHistory">
            <PaginatedMarketRecordsTable
              market={market}
              setIsOpen={setIsMobileHistoryOpen}
            />
          </Box>

          <Box id="mla">
            <MobileMlaAlert
              mla={mla}
              isLoading={mlaLoading}
              isMLAOpen={isMobileMLAOpen}
              setIsMLAOpen={setIsMobileMLAOpen}
            />
          </Box>

          {authorizedInMarket && (
            <WrapDebtToken
              market={market}
              wrapper={wrapper}
              hasWrapper={hasWrapper}
              hasFactory={hasFactory}
              isWrapperLoading={isWrapperLoading}
              isWrapperLookupLoading={isWrapperLookupLoading}
              isWrapperError={isWrapperError}
              isAuthorizedLender={authorizedInMarket as boolean}
              isDifferentChain={isDifferentChain}
            />
          )}

          {showConnectWalletBanner && (
            <MobileLenderBanner
              title={t("marketDetails.lender.connectWallet")}
              subtitle={t(
                "marketDetails.lender.connectWalletDepositIntoMarket",
              )}
              buttonText={t("common.labels.connectWallet")}
              onButtonClick={() => setIsConnectDialogOpen(true)}
            />
          )}

          {showLenderAccessError && (
            <MobileLenderBanner
              title={t("marketDetails.lender.access.error.title")}
              subtitle={t("marketDetails.lender.access.error.subtitle")}
              buttonText={t("marketDetails.lender.access.error.retry")}
              onButtonClick={() => {
                refetchLenderAccess().catch(() => undefined)
              }}
            />
          )}

          {showLenderBlocked && (
            <MobileLenderBanner
              title={t("marketDetails.lender.access.blocked.title")}
              subtitle={t("marketDetails.lender.access.blocked.subtitle")}
            />
          )}

          {showLenderRequestBanner && (
            <MobileLenderBanner
              title={t("marketDetails.lender.lendThroughWildcat")}
              subtitle={t(
                "marketDetails.lender.interestedLendingThroughWildcatConnect",
              )}
              buttonText={t("marketDetails.lender.leaveRequest")}
              href={buildBorrowerProfileHref(market.borrower, market.chainId)}
            />
          )}

          {!isConnected && (
            <MobileConnectWallet
              open={isConnectDialogOpen}
              handleClose={() => setIsConnectDialogOpen(false)}
            />
          )}

          {marketAccount &&
            isConnected &&
            (showLenderTransactions || isDifferentChain) && (
              <MobileMarketActions
                marketAccount={marketAccount}
                withdrawals={withdrawals}
                accessState={lenderAccessState}
                wrapper={wrapper}
                hasWrapper={hasWrapper}
                isMobileWithdrawalOpen={isMobileWithdrawalOpen}
                setIsMobileDepositOpen={setIsMobileDepositOpen}
                setIsMobileAcknowledgementOpen={setIsMobileAcknowledgementOpen}
                setIsMobileWithdrawalOpen={setIsMobileWithdrawalOpen}
                isMLAOpen={isMobileMLAOpen}
                setIsMLAOpen={setIsMobileMLAOpen}
              />
            )}

          {analyticsUiEnabled && (
            <Box sx={{ padding: "0 4px" }}>
              <LenderFlowCharts
                market={market}
                dailyFlows={dailyFlows}
                isLoading={isFlowsLoading}
                delinquencyHistory={delinquencyHistory}
                isDelinquencyLoading={isDelinquencyLoading}
                gracePeriodHours={gracePeriodHours}
                symbol={symbol}
              />
            </Box>
          )}
        </Box>

        <Footer showFooter={false} />
      </>
    )

  return (
    <Box>
      <MarketHeader market={market} marketAccount={marketAccount} />

      {isConnected && isDifferentChain && (
        <SwitchChainAlert desiredChainId={market?.chainId} />
      )}

      <Box sx={MarketContentColumn(theme, isConnected && isDifferentChain)}>
        {showConnectWalletBanner && (
          <Box sx={LenderBannerWrapper}>
            <LeadBanner
              title={t("marketDetails.lender.connectWallet")}
              subtitle={t(
                "marketDetails.lender.connectWalletDepositIntoMarket",
              )}
              buttonText={t("common.labels.connectWallet")}
              buttonOnClick={() => setIsConnectDialogOpen(true)}
              compact
            />
          </Box>
        )}

        {showLenderAccessError && (
          <Box sx={LenderBannerWrapper}>
            <LeadBanner
              title={t("marketDetails.lender.access.error.title")}
              subtitle={t("marketDetails.lender.access.error.subtitle")}
              buttonText={t("marketDetails.lender.access.error.retry")}
              buttonOnClick={() => {
                refetchLenderAccess().catch(() => undefined)
              }}
            />
          </Box>
        )}

        {showLenderBlocked && (
          <Box sx={LenderBannerWrapper}>
            <LeadBanner
              title={t("marketDetails.lender.access.blocked.title")}
              subtitle={t("marketDetails.lender.access.blocked.subtitle")}
            />
          </Box>
        )}

        {showLenderRequestBanner && (
          <Box sx={LenderBannerWrapper}>
            <LeadBanner
              title={t("marketDetails.lender.lendThroughWildcat")}
              subtitle={t(
                "marketDetails.lender.interestedLendingThroughWildcatConnect",
              )}
              buttonText={t("marketDetails.lender.leaveRequest")}
              buttonLink={{
                isExternal: false,
                url: buildBorrowerProfileHref(market.borrower, market.chainId),
              }}
            />
          </Box>
        )}

        {!isConnected && (
          <ConnectWalletDialog
            open={isConnectDialogOpen}
            handleClose={() => setIsConnectDialogOpen(false)}
          />
        )}

        {showBorrowerPenaltyWarning && <BorrowerPenaltyWarning />}
        <PendingAprReductionBanner
          market={market}
          sx={{ margin: "16px 0 24px" }}
        />

        <Box sx={SectionContainer(theme)}>
          {currentSection === LenderMarketSections.TRANSACTIONS && (
            <Box>
              {isTransactionsLoading ? (
                <LenderTransactionsSkeleton />
              ) : (
                <>
                  {showLenderTransactions &&
                    isConnected &&
                    !isDifferentChain && (
                      <MarketActions
                        marketAccount={marketAccount}
                        withdrawals={withdrawals}
                        accessState={lenderAccessState}
                        wrapper={wrapper}
                        hasWrapper={hasWrapper}
                        borrowerPenaltyWarningState={
                          borrowerPenaltyWarning.state
                        }
                        refreshBorrowerPenaltyWarning={
                          borrowerPenaltyWarning.refresh
                        }
                      />
                    )}
                  <CapacityBarChart
                    marketAccount={marketAccount}
                    legendType="big"
                    isLender={authorizedInMarket}
                  />
                </>
              )}
              {analyticsUiEnabled && hasLenderInteracted && (
                <Box sx={{ marginTop: "32px" }}>
                  <LenderAnalyticsSummary
                    items={analyticsSummaryItems}
                    isLoading={analytics.isLoading}
                  />
                </Box>
              )}
              {analyticsUiEnabled && (
                <Box sx={{ marginTop: "32px" }}>
                  <LenderFlowCharts
                    market={market}
                    dailyFlows={dailyFlows}
                    isLoading={isFlowsLoading}
                    delinquencyHistory={delinquencyHistory}
                    isDelinquencyLoading={isDelinquencyLoading}
                    gracePeriodHours={gracePeriodHours}
                    symbol={symbol}
                  />
                </Box>
              )}
            </Box>
          )}

          {currentSection === LenderMarketSections.STATUS && (
            <Box marginTop="12px">
              {!isBarChartsLoading ? (
                <>
                  <BarCharts
                    marketAccount={marketAccount}
                    withdrawals={withdrawals}
                    isLender={authorizedInMarket}
                  />
                  <Divider sx={{ margin: "40px 0 44px" }} />
                </>
              ) : (
                <ChartSectionSkeleton sections={authorizedInMarket ? 3 : 1} />
              )}
              <MarketParameters
                market={market}
                viewerType="lender"
                wrapper={wrapper}
                hasWrapper={hasWrapper}
                additionalItems={additionalParameterItems}
              />
            </Box>
          )}

          {currentSection === LenderMarketSections.SUMMARY && (
            <MarketSummary
              marketSummary={marketSummary}
              isLoading={isLoadingSummary}
            />
          )}

          {currentSection === LenderMarketSections.BORROWER_PROFILE && (
            <ProfileSection
              profileAddress={market.borrower as `0x${string}`}
              externalChainId={marketChainId}
            />
          )}

          {currentSection === LenderMarketSections.REQUESTS && (
            <Box marginTop="12px">
              {isWithdrawalsLoading ? (
                <AccountRowsSkeleton />
              ) : (
                <WithdrawalRequests
                  withdrawals={withdrawals}
                  chainId={market.chainId}
                />
              )}
            </Box>
          )}
          {currentSection === LenderMarketSections.MARKET_HISTORY && (
            <Box marginTop="12px">
              <PaginatedMarketRecordsTable market={market} />
            </Box>
          )}
          {currentSection === LenderMarketSections.WRAP_DEBT_TOKEN && (
            <WrapDebtToken
              market={market}
              wrapper={wrapper}
              hasWrapper={hasWrapper}
              hasFactory={hasFactory}
              isWrapperLoading={isWrapperLoading}
              isWrapperLookupLoading={isWrapperLookupLoading}
              isWrapperError={isWrapperError}
              isAuthorizedLender={authorizedInMarket as boolean}
              isDifferentChain={isDifferentChain}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}
