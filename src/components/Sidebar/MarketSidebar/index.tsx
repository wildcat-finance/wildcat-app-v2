import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { useParams, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { TerminateMarket } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket"
import BorrowAndRepayIcon from "@/assets/icons/borrowAndRepay_icon.svg"
import CollateralContractIcon from "@/assets/icons/collateralContract_icon.svg"
import LenderBorrowerIcon from "@/assets/icons/lenderBorrower_icon.svg"
import MarketEventsIcon from "@/assets/icons/marketEvents_icon.svg"
import StatusAndDetailsIcon from "@/assets/icons/statusAndDetails_icon.svg"
import SummaryIcon from "@/assets/icons/summary_icon.svg"
import TokenWrapIcon from "@/assets/icons/tokenWrap_icon.svg"
import WithdrawalAndRequestsIcon from "@/assets/icons/withdrawalAndRequests_icon.svg"
import { BackButton } from "@/components/BackButton"
import { usePrefetchMarketRecords } from "@/components/PaginatedMarketRecordsTable/hooks/usePrefetchMarketRecords"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/MarketSidebar/style"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setCheckBlock,
  setSidebarHighlightState,
} from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import { COLORS } from "@/theme/colors"
import {
  BORROW_REPAY_SECTION,
  showBorrowRepayTab,
  STATUS_DETAILS_SECTION,
} from "@/utils/borrowerMarketSections"

export const MarketSidebar = () => {
  const { t } = useTranslation()

  const dispatch = useAppDispatch()

  const params = useParams<{ locale: string; address: string }>()
  const searchParams = useSearchParams()

  const { address } = params
  const marketChainIdRaw = parseInt(searchParams.get("chainId") ?? "", 10)
  const marketChainId = Number.isFinite(marketChainIdRaw)
    ? marketChainIdRaw
    : undefined

  const { data: market } = useGetMarket({
    address,
    chainId: marketChainId,
  })
  const prefetchMarketHistory = usePrefetchMarketRecords(market)
  const { address: walletAddress } = useAccount()
  const { data: marketAccount } = useGetMarketAccountForBorrowerLegacy(market)

  const sidebarState = useAppSelector(
    (state) => state.highlightSidebar.sidebarState,
  )

  const withdrawalsCount = useAppSelector(
    (state) => state.highlightSidebar.withdrawalsCount,
  )

  const hideDescriptionSection = useAppSelector(
    (state) => state.hideMarketSections.description,
  )

  const holdTheMarket =
    market?.borrower.toLowerCase() === walletAddress?.toLowerCase()

  const { isWrongNetwork, isSelectionMismatch } = useNetworkGate({
    desiredChainId: market?.chainId ?? marketChainId,
    includeAgreementStatus: false,
  })
  const isDifferentChain = isWrongNetwork || isSelectionMismatch
  // canInteract: borrower owns market AND is on correct chain
  const canInteract = holdTheMarket && !isDifferentChain
  const canBorrowAndRepay = showBorrowRepayTab({
    canInteract,
    isClosed: !!market?.isClosed,
  })

  return (
    <Box sx={ContentContainer}>
      <Box position="sticky" top="32px">
        <BackButton title={t("marketDetails.borrower.sidebar.backToMarkets")} />

        <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
          {canBorrowAndRepay && (
            <Button
              variant="text"
              size="medium"
              sx={{
                ...MenuItemButton,
                backgroundColor: sidebarState.borrowRepay
                  ? COLORS.whiteSmoke
                  : "transparent",
              }}
              onClick={() => {
                dispatch(setCheckBlock(BORROW_REPAY_SECTION))
                dispatch(
                  setSidebarHighlightState({
                    borrowRepay: true,
                    statusDetails: false,
                    marketSummary: false,
                    withdrawals: false,
                    lenders: false,
                    mla: false,
                    marketHistory: false,
                    tokenWrapper: false,
                  }),
                )
              }}
            >
              <SvgIcon sx={{ marginRight: "10px" }}>
                <BorrowAndRepayIcon />
              </SvgIcon>
              {t("marketDetails.borrower.sidebar.borrowRepay")}
            </Button>
          )}
          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.statusDetails
                ? COLORS.whiteSmoke
                : "transparent",
            }}
            onClick={() => {
              dispatch(setCheckBlock(STATUS_DETAILS_SECTION))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: true,
                  marketSummary: false,
                  withdrawals: false,
                  lenders: false,
                  mla: false,
                  marketHistory: false,
                  tokenWrapper: false,
                }),
              )
            }}
          >
            <SvgIcon sx={{ marginRight: "10px" }}>
              <StatusAndDetailsIcon />
            </SvgIcon>
            {t("nav.marketStatusDetails")}
          </Button>
          {!hideDescriptionSection && (
            <Button
              variant="text"
              size="medium"
              sx={{
                ...MenuItemButton,
                backgroundColor: sidebarState.marketSummary
                  ? COLORS.whiteSmoke
                  : "transparent",
              }}
              onClick={() => {
                dispatch(setCheckBlock(3))
                dispatch(
                  setSidebarHighlightState({
                    borrowRepay: false,
                    statusDetails: false,
                    marketSummary: true,
                    withdrawals: false,
                    lenders: false,
                    mla: false,
                    marketHistory: false,
                    tokenWrapper: false,
                  }),
                )
              }}
            >
              <SvgIcon
                sx={{
                  marginRight: "10px",
                }}
              >
                <SummaryIcon />
              </SvgIcon>
              {t("common.fields.marketDescription")}
            </Button>
          )}
          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.withdrawals
                ? COLORS.whiteSmoke
                : "transparent",
            }}
            onClick={() => {
              dispatch(setCheckBlock(4))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  marketSummary: false,
                  withdrawals: true,
                  lenders: false,
                  mla: false,
                  marketHistory: false,
                  tokenWrapper: false,
                }),
              )
            }}
          >
            <SvgIcon sx={{ marginRight: "10px" }}>
              <WithdrawalAndRequestsIcon />
            </SvgIcon>
            {t("nav.withdrawalRequests")}

            {!!withdrawalsCount && (
              <Box
                sx={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "4px",
                  bgcolor: COLORS.whiteSmoke,

                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",

                  marginLeft: "auto",
                }}
              >
                <Typography
                  variant="text4Highlighted"
                  color={COLORS.santasGrey}
                >
                  {withdrawalsCount}
                </Typography>
              </Box>
            )}
          </Button>
          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.lenders
                ? COLORS.whiteSmoke
                : "transparent",
            }}
            onClick={() => {
              dispatch(setCheckBlock(5))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  marketSummary: false,
                  withdrawals: false,
                  lenders: true,
                  mla: false,
                  marketHistory: false,
                  tokenWrapper: false,
                }),
              )
            }}
          >
            <SvgIcon sx={{ marginRight: "10px" }}>
              <LenderBorrowerIcon />
            </SvgIcon>
            {t("common.placeholders.lenders")}
          </Button>
          {canInteract && (
            <Button
              variant="text"
              size="medium"
              sx={{
                ...MenuItemButton,
                backgroundColor: sidebarState.mla
                  ? COLORS.whiteSmoke
                  : "transparent",
              }}
              onClick={() => {
                dispatch(setCheckBlock(6))
                dispatch(
                  setSidebarHighlightState({
                    borrowRepay: false,
                    statusDetails: false,
                    marketSummary: false,
                    withdrawals: false,
                    lenders: false,
                    mla: true,
                    marketHistory: false,
                    tokenWrapper: false,
                  }),
                )
              }}
            >
              <SvgIcon sx={{ marginRight: "10px" }}>
                <CollateralContractIcon />
              </SvgIcon>
              {t("common.fields.mla")}
            </Button>
          )}

          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.marketHistory
                ? COLORS.whiteSmoke
                : "transparent",
            }}
            onMouseEnter={prefetchMarketHistory}
            onFocus={prefetchMarketHistory}
            onClick={() => {
              dispatch(setCheckBlock(7))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  marketSummary: false,
                  withdrawals: false,
                  lenders: false,
                  mla: false,
                  marketHistory: true,
                  tokenWrapper: false,
                }),
              )
            }}
          >
            <SvgIcon sx={{ marginRight: "10px" }}>
              <MarketEventsIcon />
            </SvgIcon>
            {t("marketDetails.shared.sidebar.marketHistory")}
          </Button>
        </Box>

        {holdTheMarket && (
          <>
            <Divider sx={{ margin: "6px 0px" }} />

            <Button
              variant="text"
              size="medium"
              sx={{
                ...MenuItemButton,
                backgroundColor: sidebarState.tokenWrapper
                  ? COLORS.whiteSmoke
                  : "transparent",
              }}
              onClick={() => {
                dispatch(setCheckBlock(8))
                dispatch(
                  setSidebarHighlightState({
                    borrowRepay: false,
                    statusDetails: false,
                    marketSummary: false,
                    withdrawals: false,
                    lenders: false,
                    mla: false,
                    marketHistory: false,
                    tokenWrapper: true,
                  }),
                )
              }}
            >
              <SvgIcon
                sx={{
                  marginRight: "10px",
                  "& path": { fill: COLORS.blackRock },
                }}
              >
                <TokenWrapIcon />
              </SvgIcon>
              {t("marketDetails.lender.sidebar.wrapDebtToken")}

              <Box
                sx={{
                  display: "flex",
                  padding: "0px 6px",
                  borderRadius: "4px",
                  backgroundColor: COLORS.glitter,
                  marginLeft: "auto",
                }}
              >
                <Typography variant="text4" color={COLORS.ultramarineBlue}>
                  {t("nav.new")}
                </Typography>
              </Box>
            </Button>
          </>
        )}

        {marketAccount && holdTheMarket && (
          <TerminateMarket marketAccount={marketAccount} />
        )}
      </Box>
    </Box>
  )
}
