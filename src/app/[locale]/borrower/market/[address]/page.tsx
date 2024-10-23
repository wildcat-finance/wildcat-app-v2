"use client"

import * as React from "react"
import { useEffect } from "react"

import { Box, Divider, Skeleton } from "@mui/material"
import { useAccount } from "wagmi"

import { useBorrowerInvitationRedirect } from "@/app/[locale]/borrower/hooks/useBorrowerInvitationRedirect"
import { MarketStatusChart } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart"
import { LeadBanner } from "@/components/LeadBanner"
import { MarketHeader } from "@/components/MarketHeader"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import {
  resetPageState,
  setCheckBlock,
} from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import { COLORS } from "@/theme/colors"

import { MarketAuthorisedLenders } from "./components/MarketAuthorisedLenders"
import { MarketTransactions } from "./components/MarketTransactions"
import { MarketWithdrawalRequests } from "./components/MarketWithdrawalRequests"
import useScrollHandler from "./hooks/useScrollHandler"
import {
  SlideContentContainer,
  SkeletonContainer,
  SkeletonStyle,
} from "./style"
import { MarketParameters } from "../../../../../components/MarketParameters"

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

  const { checked } = useScrollHandler()

  const prevURL = sessionStorage.getItem("previousPageUrl")

  useEffect(() => {
    if (prevURL && prevURL.includes(ROUTES.borrower.lendersList)) {
      dispatch(setCheckBlock(4))
    }
  }, [])

  useEffect(
    () => () => {
      dispatch(resetPageState())
    },
    [],
  )

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
        {!bannerDisplayConfig.hideBanner && checked === 1 && (
          <LeadBanner
            title={bannerDisplayConfig.title}
            text={bannerDisplayConfig.text}
            buttonText={bannerDisplayConfig.buttonText}
            buttonLink={bannerDisplayConfig.link}
          />
        )}
        <MarketHeader marketAccount={marketAccount} />
        <Box
          // ref={scrollContainer}
          sx={{
            width: "100%",
            overflow: "hidden",
            overflowY: "visible",
            height:
              !bannerDisplayConfig.hideBanner && checked === 1
                ? "calc(100vh - 43px - 43px - 52px - 60px - 52px - 220px)"
                : "calc(100vh - 43px - 43px - 52px - 60px - 52px)",
          }}
        >
          {/* <Slide */}
          {/*  direction={direction} */}
          {/*  container={scrollContainer.current} */}
          {/*  unmountOnExit */}
          {/*  in={checked === 1} */}
          {/* > */}
          {/*  <Box sx={SlideContentContainer}> */}
          {/*    {holdTheMarket && ( */}
          {/*      <MarketTransactions */}
          {/*        market={market} */}
          {/*        marketAccount={marketAccount} */}
          {/*        holdTheMarket={holdTheMarket} */}
          {/*      /> */}
          {/*    )} */}
          {/*    {holdTheMarket && <Divider sx={{ margin: "32px 0 44px" }} />} */}
          {/*    <MarketStatusChart market={market} /> */}
          {/*  </Box> */}
          {/* </Slide> */}
          {checked === 1 && (
            <Box sx={SlideContentContainer}>
              {holdTheMarket && (
                <MarketTransactions
                  market={market}
                  marketAccount={marketAccount}
                  holdTheMarket={holdTheMarket}
                />
              )}
              {holdTheMarket && <Divider sx={{ margin: "32px 0" }} />}
              <MarketStatusChart market={market} />
            </Box>
          )}
          {/* <Slide */}
          {/*  direction={direction} */}
          {/*  container={scrollContainer.current} */}
          {/*  unmountOnExit */}
          {/*  in={checked === 2} */}
          {/* > */}
          {/*  <Box sx={SlideContentContainer} marginTop="12px"> */}
          {/*    <MarketStatusChart market={market} /> */}
          {/*    <Divider sx={{ margin: "32px 0 44px" }} /> */}
          {/*    <MarketParameters market={market} /> */}
          {/*  </Box> */}
          {/* </Slide> */}
          {checked === 2 && (
            <Box sx={SlideContentContainer} marginTop="12px">
              <MarketStatusChart market={market} />
              <Divider sx={{ margin: "32px 0 44px" }} />
              <MarketParameters market={market} />
            </Box>
          )}
          {/* <Slide */}
          {/*  direction={direction} */}
          {/*  container={scrollContainer.current} */}
          {/*  unmountOnExit */}
          {/*  in={checked === 3} */}
          {/* > */}
          {/*  <Box sx={SlideContentContainer} marginTop="12px"> */}
          {/*    <MarketWithdrawalRequests marketAccount={marketAccount} /> */}
          {/*  </Box> */}
          {/* </Slide> */}
          {checked === 3 && (
            <Box sx={SlideContentContainer} marginTop="12px">
              <MarketWithdrawalRequests
                marketAccount={marketAccount}
                isHoldingMarket={holdTheMarket}
              />
            </Box>
          )}
          {/* <Slide */}
          {/*  direction={direction} */}
          {/*  container={scrollContainer.current} */}
          {/*  unmountOnExit */}
          {/*  in={checked === 4} */}
          {/* > */}
          {/*  <Box sx={SlideContentContainer} marginTop="12px"> */}
          {/*    <MarketAuthorisedLenders market={market} /> */}
          {/*  </Box> */}
          {/* </Slide> */}
          {checked === 4 && (
            <Box sx={SlideContentContainer} marginTop="12px">
              <MarketAuthorisedLenders market={market} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
