import React, { useEffect } from "react"

import { Box, Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { TerminateMarket } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket"
import { useGetMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useGetMarket"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/MarketSidebar/style"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetPageState,
  setCheckBlock,
  setSidebarHighlightState,
} from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import { COLORS } from "@/theme/colors"

import BackArrow from "../../../assets/icons/backArrow_icon.svg"

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

  useEffect(() => {
    dispatch(resetPageState())
  }, [])

  return (
    <Box sx={ContentContainer}>
      <Box position="sticky" top="32px">
        <Link href={ROUTES.borrower.root} passHref>
          <Button
            fullWidth
            variant="text"
            size="medium"
            sx={{
              color: COLORS.greySuit,
              justifyContent: "flex-start",
              marginBottom: "12px",
            }}
          >
            <SvgIcon
              fontSize="small"
              sx={{
                marginRight: "4px",
                "& path": { fill: `${COLORS.greySuit}` },
              }}
            >
              <BackArrow />
            </SvgIcon>
            {t("borrowerMarketDetails.sidebar.backToMarkets")}
          </Button>
        </Link>

        <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.borrowRepay
                ? COLORS.blackRock03
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
                ? COLORS.blackRock03
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
                ? COLORS.blackRock03
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
                ? COLORS.blackRock03
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
                }),
              )
            }}
          >
            {t("borrowerMarketDetails.sidebar.authorisedLenders")}
          </Button>
        </Box>

        {marketAccount && holdTheMarket && (
          <TerminateMarket marketAccount={marketAccount} />
        )}
      </Box>
    </Box>
  )
}
