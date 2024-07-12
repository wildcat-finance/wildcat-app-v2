"use client"

import * as React from "react"

import { Box, Divider, Fade, Skeleton } from "@mui/material"
import { useAccount } from "wagmi"

import { useBorrowerInvitationRedirect } from "@/app/[locale]/borrower/hooks/useBorrowerInvitationRedirect"
import { MarketStatusChart } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart"
import { useGetMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useGetMarket"
import { LeadBanner } from "@/components/LeadBanner"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setCheckBlock,
  setSidebarHighlightState,
} from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import { COLORS } from "@/theme/colors"

import { MarketAuthorisedLenders } from "./components/MarketAuthorisedLenders"
import { MarketHeader } from "./components/MarketHeader"
import { MarketParameters } from "./components/MarketParameters"
import { MarketTransactions } from "./components/MarketTransactions"
import { MarketWithdrawalRequests } from "./components/MarketWithdrawalRequests"
import { FadeContentContainer, SkeletonContainer, SkeletonStyle } from "./style"

export default function MarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const dispatch = useAppDispatch()
  const { data: market } = useGetMarket({ address })
  const { data: marketAccount } = useGetMarketAccountForBorrowerLegacy(market)
  const { address: walletAddress } = useAccount()
  const bannerDisplayConfig = useBorrowerInvitationRedirect()
  const holdTheMarket =
    market?.borrower.toLowerCase() === walletAddress?.toLowerCase()
  const checked = useAppSelector((state) => state.highlightSidebar.checked)
  const checkedRef = React.useRef<number>(1)
  const [scrollEnabled, setScrollEnabled] = React.useState(true)
  checkedRef.current = checked
  const slidesCount = 4

  const handleScroll = (evt: WheelEvent) => {
    if (!scrollEnabled) return

    if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
      if (evt.deltaY > 0 && checkedRef.current !== slidesCount) {
        setScrollEnabled(false)
        dispatch(setCheckBlock(checkedRef.current + 1))
      }
    }

    if (window.scrollY === 0) {
      if (evt.deltaY < 0 && checkedRef.current !== 1) {
        setScrollEnabled(false)
        dispatch(setCheckBlock(checkedRef.current - 1))
      }
    }
  }

  React.useEffect(() => {
    document.onwheel = handleScroll
    return () => {
      document.onwheel = null
    }
  }, [scrollEnabled])

  React.useEffect(() => {
    if (!scrollEnabled) {
      const timeout = setTimeout(() => setScrollEnabled(true), 1200)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [checked, scrollEnabled])

  React.useEffect(() => {
    switch (checked) {
      case 1:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: true,
            statusDetails: false,
            withdrawals: false,
            lenders: false,
          }),
        )
        break
      case 2:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: true,
            withdrawals: false,
            lenders: false,
          }),
        )
        break
      case 3:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: true,
            lenders: false,
          }),
        )
        break
      case 4:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: false,
            lenders: true,
          }),
        )
        break
      default:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: true,
            statusDetails: false,
            withdrawals: false,
            lenders: false,
          }),
        )
        break
    }
  }, [checked, dispatch])

  if (!market || !marketAccount)
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

  return (
    <Box sx={{ padding: "52px 20px 0 44px" }}>
      <Box sx={{ width: "69%" }}>
        {!bannerDisplayConfig.hideBanner && (
          <LeadBanner
            title={bannerDisplayConfig.title}
            text={bannerDisplayConfig.text}
            buttonText={bannerDisplayConfig.buttonText}
            buttonLink={bannerDisplayConfig.link}
          />
        )}
        <Box sx={{ position: "relative" }}>
          <Fade unmountOnExit in={checked === 1}>
            <Box sx={FadeContentContainer}>
              <MarketHeader
                marketAccount={marketAccount}
                holdTheMarket={holdTheMarket}
              />
              {holdTheMarket && <Divider sx={{ margin: "32px 0" }} />}
              {holdTheMarket && (
                <MarketTransactions
                  market={market}
                  marketAccount={marketAccount}
                />
              )}
              <Divider sx={{ margin: "32px 0 44px" }} />
              <MarketStatusChart market={market} />
            </Box>
          </Fade>
          <Fade unmountOnExit in={checked === 2}>
            <Box sx={FadeContentContainer}>
              <MarketStatusChart market={market} />
              <Divider sx={{ margin: "32px 0 44px" }} />
              <MarketParameters market={market} />
            </Box>
          </Fade>
          <Fade unmountOnExit in={checked === 3}>
            <Box sx={FadeContentContainer}>
              {holdTheMarket && (
                <MarketWithdrawalRequests marketAccount={marketAccount} />
              )}
            </Box>
          </Fade>
          <Fade unmountOnExit in={checked === 4}>
            <Box sx={FadeContentContainer}>
              {holdTheMarket && <MarketAuthorisedLenders market={market} />}
            </Box>
          </Fade>
        </Box>
      </Box>
    </Box>
  )
}
