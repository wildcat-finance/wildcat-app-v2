import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { useParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { TerminateMarket } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket"
import BorrowAndRepayIcon from "@/assets/icons/borrowAndRepay_icon.svg"
import CollateralContractIcon from "@/assets/icons/collateralContract_icon.svg"
import LenderBorrowerIcon from "@/assets/icons/lenderBorrower_icon.svg"
import MarketEventsIcon from "@/assets/icons/marketEvents_icon.svg"
import StatusAndDetailsIcon from "@/assets/icons/statusAndDetails_icon.svg"
import SummaryIcon from "@/assets/icons/summary_icon.svg"
import WithdrawalAndRequestsIcon from "@/assets/icons/withdrawalAndRequests_icon.svg"
import { BackButton } from "@/components/BackButton"
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

export const MarketSidebar = () => {
  const { t } = useTranslation()

  const dispatch = useAppDispatch()

  const params = useParams<{ locale: string; address: string }>()

  const { address } = params

  const { data: market } = useGetMarket({
    address,
  })
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
    desiredChainId: market?.chainId,
    includeAgreementStatus: false,
  })
  const isDifferentChain = isWrongNetwork || isSelectionMismatch
  // canInteract: borrower owns market AND is on correct chain
  const canInteract = holdTheMarket && !isDifferentChain

  return (
    <Box sx={ContentContainer}>
      <Box position="sticky" top="32px">
        <BackButton title={t("borrowerMarketDetails.sidebar.backToMarkets")} />

        <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
          {canInteract && (
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
                dispatch(setCheckBlock(1))
                dispatch(
                  setSidebarHighlightState({
                    borrowRepay: true,
                    statusDetails: false,
                    marketSummary: false,
                    withdrawals: false,
                    lenders: false,
                    mla: false,
                    marketHistory: false,
                  }),
                )
              }}
            >
              <SvgIcon sx={{ marginRight: "10px" }}>
                <BorrowAndRepayIcon />
              </SvgIcon>
              {t("borrowerMarketDetails.sidebar.borrowRepay")}
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
              dispatch(setCheckBlock(2))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: true,
                  marketSummary: false,
                  withdrawals: false,
                  lenders: false,
                  mla: false,
                  marketHistory: false,
                }),
              )
            }}
          >
            <SvgIcon sx={{ marginRight: "10px" }}>
              <StatusAndDetailsIcon />
            </SvgIcon>
            {t("borrowerMarketDetails.sidebar.statusDetails")}
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
              {t("borrowerMarketDetails.description.title")}
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
                }),
              )
            }}
          >
            <SvgIcon sx={{ marginRight: "10px" }}>
              <WithdrawalAndRequestsIcon />
            </SvgIcon>
            {t("borrowerMarketDetails.sidebar.withdrawalRequests")}

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
                }),
              )
            }}
          >
            <SvgIcon sx={{ marginRight: "10px" }}>
              <LenderBorrowerIcon />
            </SvgIcon>
            {t("borrowerMarketDetails.sidebar.authorisedLenders")}
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
                  }),
                )
              }}
            >
              <SvgIcon sx={{ marginRight: "10px" }}>
                <CollateralContractIcon />
              </SvgIcon>
              {t("borrowerMarketDetails.sidebar.mla")}
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
            onClick={() => {
              dispatch(setCheckBlock(7))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  marketSummary: false,
                  withdrawals: false,
                  lenders: false,
                  mla: true,
                  marketHistory: true,
                }),
              )
            }}
          >
            <SvgIcon sx={{ marginRight: "10px" }}>
              <MarketEventsIcon />
            </SvgIcon>
            {t("borrowerMarketDetails.sidebar.marketHistory")}
          </Button>
        </Box>

        {marketAccount && holdTheMarket && (
          <TerminateMarket marketAccount={marketAccount} />
        )}
      </Box>
    </Box>
  )
}
