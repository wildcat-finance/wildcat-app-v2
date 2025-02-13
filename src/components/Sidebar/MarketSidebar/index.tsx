import { Box, Button } from "@mui/material"
import { useParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { TerminateMarket } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket"
import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/MarketSidebar/style"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
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

  const holdTheMarket =
    market?.borrower.toLowerCase() === walletAddress?.toLowerCase()

  return (
    <Box sx={ContentContainer}>
      <Box position="sticky" top="32px">
        <BackButton title={t("borrowerMarketDetails.sidebar.backToMarkets")} />

        <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
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
                  withdrawals: false,
                  lenders: false,
                }),
              )
            }}
          >
            {t("borrowerMarketDetails.sidebar.borrowRepay")}
          </Button>
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
                  withdrawals: false,
                  lenders: false,
                  mla: false,
                }),
              )
            }}
          >
            {t("borrowerMarketDetails.sidebar.statusDetails")}
          </Button>
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
              dispatch(setCheckBlock(3))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  withdrawals: true,
                  lenders: false,
                  mla: false,
                }),
              )
            }}
          >
            {t("borrowerMarketDetails.sidebar.withdrawalRequests")}
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
              dispatch(setCheckBlock(4))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  withdrawals: false,
                  lenders: true,
                  mla: false,
                }),
              )
            }}
          >
            {t("borrowerMarketDetails.sidebar.authorisedLenders")}
          </Button>
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
              dispatch(setCheckBlock(5))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  withdrawals: false,
                  lenders: false,
                  mla: true,
                }),
              )
            }}
          >
            {t("borrowerMarketDetails.sidebar.mla")}
          </Button>

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
              dispatch(setCheckBlock(6))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  withdrawals: false,
                  lenders: false,
                  mla: false,
                  marketHistory: true,
                }),
              )
            }}
          >
            {t("borrowerMarketDetails.sidebar.marketHistory")}
          </Button>

          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.collateralContract
                ? COLORS.whiteSmoke
                : "transparent",
            }}
            onClick={() => {
              dispatch(setCheckBlock(7))
              dispatch(
                setSidebarHighlightState({
                  borrowRepay: false,
                  statusDetails: false,
                  withdrawals: false,
                  lenders: false,
                  mla: false,
                  marketHistory: false,
                  collateralContract: true,
                }),
              )
            }}
          >
            Collateral Contract
          </Button>
        </Box>

        {marketAccount && holdTheMarket && (
          <TerminateMarket marketAccount={marketAccount} />
        )}
      </Box>
    </Box>
  )
}
