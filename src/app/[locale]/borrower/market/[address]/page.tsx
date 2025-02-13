"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Divider, Skeleton } from "@mui/material"
import { useAccount } from "wagmi"

import { useBorrowerInvitationRedirect } from "@/app/[locale]/borrower/hooks/useBorrowerInvitationRedirect"
import { MarketCollateralContract } from "@/app/[locale]/borrower/market/[address]/components/MarketCollateralContract"
import { MarketStatusChart } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart"
import { CommonGlossarySidebar } from "@/components/CommonGlossarySidebar"
import { LeadBanner } from "@/components/LeadBanner"
import { MarketHeader } from "@/components/MarketHeader"
import { MarketParameters } from "@/components/MarketParameters"
import { PaginatedMarketRecordsTable } from "@/components/PaginatedMarketRecordsTable"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { useMarketMla } from "@/hooks/useMarketMla"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import {
  resetPageState,
  setCheckBlock,
} from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"

import { MarketAuthorisedLenders } from "./components/MarketAuthorisedLenders"
import { MarketMLA } from "./components/MarketMLA"
import { MarketTransactions } from "./components/MarketTransactions"
import { MarketWithdrawalRequests } from "./components/MarketWithdrawalRequests"
import useScrollHandler from "./hooks/useScrollHandler"
import {
  SlideContentContainer,
  SkeletonContainer,
  SkeletonStyle,
} from "./style"

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

  const { data: marketMla, isLoading: isLoadingMarketMla } = useMarketMla(
    marketAccount?.market.address,
  )

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

  // for collateral contract test ui
  const [tokenCollateralAsset, setTokenCollateralAsset] = useState<string>("")
  const [hasContract, setHasContract] = useState<boolean>(false)

  const glossary = [
    {
      title: "Collateral Contract",
      description:
        "Rules defining loan type (open or fixed) and access requirements.",
    },
    {
      title: "Reclaim",
      description:
        "This can only be accessed when the underlying market is terminated.",
    },
    {
      title: "Liquidate",
      description:
        "Rules defining loan type (open or fixed) and access requirements.",
    },
  ]

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

  // if (!isLoadingMarketMla && marketMla === null && checked !== 5)
  //   return (
  //     <Box sx={{ padding: "52px 20px 0 44px" }}>
  //       <Box sx={{ width: "69%" }}>
  //         <LeadBanner
  //           title="Select MLA Settings"
  //           text="Your MLA selection was not successfully uploaded. Please try again."
  //           buttonText="Go to MLA Settings"
  //           buttonLink={undefined}
  //           onClick={() => dispatch(setCheckBlock(5))}
  //         />
  //       </Box>
  //     </Box>
  //   )

  return (
    <Box>
      {!bannerDisplayConfig.hideBanner && checked === 1 && (
        <Box padding="24px 32.3% 0 44px">
          <LeadBanner
            title={bannerDisplayConfig.title}
            text={bannerDisplayConfig.text}
            buttonText={bannerDisplayConfig.buttonText}
            buttonLink={bannerDisplayConfig.link}
          />
        </Box>
      )}

      <Box sx={{ width: "100%", display: "flex" }}>
        <Box
          sx={{
            width: "100%",
          }}
        >
          <MarketHeader marketAccount={marketAccount} />

          <Box
            sx={{
              width: "100%",
              overflow: "hidden",
              overflowY: "visible",
              padding: "0 36px 24px 44px",
              height:
                !bannerDisplayConfig.hideBanner && checked === 1
                  ? `calc(100vh - ${pageCalcHeights.market} - 220px)`
                  : `calc(100vh - ${pageCalcHeights.market})`,
            }}
          >
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

            {checked === 2 && (
              <Box sx={SlideContentContainer} marginTop="12px">
                <MarketStatusChart market={market} />
                <Divider sx={{ margin: "32px 0 44px" }} />
                <MarketParameters market={market} />
              </Box>
            )}

            {checked === 3 && (
              <Box sx={SlideContentContainer} marginTop="12px">
                <MarketWithdrawalRequests
                  marketAccount={marketAccount}
                  isHoldingMarket={holdTheMarket}
                />
              </Box>
            )}

            {checked === 4 && (
              <Box sx={SlideContentContainer} marginTop="12px">
                <MarketAuthorisedLenders
                  market={market}
                  marketAccount={marketAccount}
                />
              </Box>
            )}

            {checked === 5 && (
              <Box sx={SlideContentContainer} marginTop="12px">
                <MarketMLA marketAccount={marketAccount} />
              </Box>
            )}

            {checked === 6 && (
              <Box sx={SlideContentContainer} marginTop="12px">
                <PaginatedMarketRecordsTable market={market} />
              </Box>
            )}

            {checked === 7 && (
              <Box sx={SlideContentContainer} marginTop="12px">
                <MarketCollateralContract
                  market={market}
                  tokenCollateralAsset={tokenCollateralAsset}
                  setTokenCollateralAsset={setTokenCollateralAsset}
                  hasContract={hasContract}
                  setHasContract={setHasContract}
                />
              </Box>
            )}
          </Box>
        </Box>

        <CommonGlossarySidebar
          glossaryArray={glossary}
          hideGlossary={!(checked === 7) || !hasContract}
        />
      </Box>
    </Box>
  )
}
