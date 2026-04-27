"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Divider, Skeleton, Typography } from "@mui/material"
import { MarketVersion, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useSearchParams } from "next/navigation"
import { useAccount } from "wagmi"

import { MarketStatusChart } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart"
import { WrapDebtToken } from "@/app/[locale]/borrower/market/[address]/components/WrapDebtToken"
import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { SwitchChainAlert } from "@/app/[locale]/lender/market/[address]/components/SwitchChainAlert"
import { LeadBanner } from "@/components/LeadBanner"
import { MarketHeader } from "@/components/MarketHeader"
import { MarketParameters } from "@/components/MarketParameters"
import { PaginatedMarketRecordsTable } from "@/components/PaginatedMarketRecordsTable"
import { useIdlePrefetchMarketRecords } from "@/components/PaginatedMarketRecordsTable/hooks/usePrefetchMarketRecords"
import { useGetMarket } from "@/hooks/useGetMarket"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useMarketSummary } from "@/hooks/useMarketSummary"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useTokenWrapper } from "@/hooks/wrapper/useTokenWrapper"
import { useWrapperForMarket } from "@/hooks/wrapper/useWrapperForMarket"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import { hideDescriptionSection } from "@/store/slices/hideMarketSectionsSlice/hideMarketSectionsSlice"
import {
  resetPageState,
  setCheckBlock,
  setWithdrawalsCount,
} from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"
import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"

import { BorrowerMarketSummary } from "./components/BorrowerMarketSummary"
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

const AccountSectionSkeleton = () => (
  <Box sx={SkeletonContainer} flexDirection="column" gap="20px">
    <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
    <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
    <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
  </Box>
)

export default function MarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const dispatch = useAppDispatch()
  const searchParams = useSearchParams()
  const marketChainIdRaw = parseInt(searchParams.get("chainId") ?? "", 10)
  const marketChainId = Number.isFinite(marketChainIdRaw)
    ? marketChainIdRaw
    : undefined

  const { chainId: targetChainId } = useSelectedNetwork()
  const {
    data: market,
    isLoading: isMarketLoading,
    apiError,
    apiLoading,
    isDiscoveringChainId,
  } = useGetMarket({
    address,
    chainId: marketChainId,
  })
  useIdlePrefetchMarketRecords(market)
  const { data: withdrawals } = useGetWithdrawals(market)
  const { data: marketAccount } = useGetMarketAccountForBorrowerLegacy(market)

  const { isWrongNetwork, isSelectionMismatch } = useNetworkGate({
    desiredChainId: market?.chainId ?? marketChainId,
    includeAgreementStatus: false,
  })
  const isDifferentChain = isWrongNetwork || isSelectionMismatch

  const { data: marketSummary, isLoading: isSummaryLoading } = useMarketSummary(
    address.toLowerCase(),
    market?.chainId ?? targetChainId,
  )
  const { address: walletAddress } = useAccount()
  const holdTheMarket =
    market?.borrower.toLowerCase() === walletAddress?.toLowerCase()
  const canInteract = holdTheMarket && !isDifferentChain

  const { checked } = useScrollHandler()

  const [prevURL, setPrevURL] = useState<string | null>(null)
  const { data: marketMla, isLoading: isLoadingMarketMla } = useMarketMla(
    market?.address,
  )

  const {
    wrapperAddress,
    hasWrapper,
    hasFactory,
    isLoading: isWrapperLookupLoading,
  } = useWrapperForMarket(market)

  const {
    data: wrapper,
    isLoading: isWrapperLoading,
    isError: isWrapperError,
  } = useTokenWrapper(
    market?.chainId as SupportedChainId | undefined,
    wrapperAddress,
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    setPrevURL(sessionStorage.getItem("previousPageUrl"))
  }, [])

  useEffect(() => {
    if (prevURL && prevURL.includes(ROUTES.borrower.lendersList)) {
      dispatch(setCheckBlock(4))
    }
  }, [dispatch, prevURL])

  useEffect(() => {
    if (
      (!marketSummary || marketSummary!.description === "") &&
      !holdTheMarket
    ) {
      dispatch(hideDescriptionSection(true))
    } else {
      dispatch(hideDescriptionSection(false))
    }
  }, [marketSummary, holdTheMarket, walletAddress])

  useEffect(
    () => () => {
      dispatch(resetPageState())
    },
    [],
  )

  const ongoingCount = withdrawals.activeWithdrawal?.requests.length ?? 0

  const claimableCount = withdrawals.batchesWithClaimableWithdrawals?.flatMap(
    (batch) =>
      batch.withdrawals.flatMap((withdrawal) => {
        const claimableAmount = withdrawal.availableWithdrawalAmount
        return withdrawal.requests.filter((request) => {
          const amount = claimableAmount.mulDiv(
            request.scaledAmount,
            withdrawal.scaledAmount,
          )
          return amount.gt(0)
        })
      }),
  ).length

  const outstandingCount = (
    withdrawals?.expiredPendingWithdrawals ?? []
  ).flatMap((batch) =>
    batch.requests.filter((w) => w.getNormalizedAmountOwed(batch).gt(0)),
  ).length

  const totalWithdrawalsCount = ongoingCount + claimableCount + outstandingCount

  useEffect(() => {
    dispatch(setWithdrawalsCount(totalWithdrawalsCount))
  }, [totalWithdrawalsCount])

  const isLoadingMarket = isMarketLoading || apiLoading || isDiscoveringChainId
  useEffect(() => {
    if (isLoadingMarket || !market) return
    if (!canInteract && checked === 1) {
      dispatch(setCheckBlock(2))
    }
  }, [canInteract, checked, dispatch, isLoadingMarket, market])

  if (apiError) {
    return (
      <Box sx={{ padding: "52px 20px 0 44px" }}>
        <Box sx={{ width: "69%" }}>
          <Typography variant="title2">
            Market not found or unable to load market data
          </Typography>
        </Box>
      </Box>
    )
  }

  if (isLoadingMarket || !market)
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

  if (
    !isLoadingMarketMla &&
    marketMla === null &&
    checked !== 6 &&
    market?.version === MarketVersion.V2 &&
    canInteract
  )
    return (
      <Box sx={{ padding: "52px 20px 0 44px" }}>
        <Box sx={{ width: "69%" }}>
          <LeadBanner
            title="Select MLA Settings"
            text="Your MLA selection was not successfully uploaded. Please try again."
            buttonText="Go to MLA Settings"
            buttonLink={undefined}
            onClick={() => dispatch(setCheckBlock(5))}
          />
        </Box>
      </Box>
    )

  return (
    <Box>
      <Box>
        <MarketHeader market={market} marketAccount={marketAccount} />
        {isDifferentChain && (
          <SwitchChainAlert desiredChainId={market?.chainId} />
        )}
        <Box
          // ref={scrollContainer}
          sx={{
            width: "100%",
            overflow: "hidden",
            overflowY: "visible",
            padding: "0 32.3% 24px 44px",
            height: `calc(100vh - ${pageCalcHeights.market}${
              isDifferentChain ? " - 130px" : ""
            })`,
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
              {canInteract && marketAccount && (
                <MarketTransactions
                  market={market}
                  marketAccount={marketAccount}
                  withdrawals={withdrawals}
                  holdTheMarket={holdTheMarket}
                />
              )}
              {canInteract && !marketAccount && <AccountSectionSkeleton />}
              {canInteract && <Divider sx={{ margin: "32px 0" }} />}
              <MarketStatusChart market={market} withdrawals={withdrawals} />
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
              <MarketStatusChart market={market} withdrawals={withdrawals} />
              <Divider sx={{ margin: "32px 0 44px" }} />
              <MarketParameters
                market={market}
                wrapper={wrapper}
                hasWrapper={hasWrapper}
                viewerType="borrower"
              />
            </Box>
          )}

          {checked === 3 && (
            <Box sx={SlideContentContainer} marginTop="12px">
              <BorrowerMarketSummary
                marketAddress={market.address}
                chainId={market.chainId}
                isBorrower={holdTheMarket}
                marketSummary={marketSummary}
                isLoading={isSummaryLoading}
              />
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
          {checked === 4 && (
            <Box sx={SlideContentContainer} marginTop="12px">
              {marketAccount ? (
                <MarketWithdrawalRequests
                  marketAccount={marketAccount}
                  withdrawals={withdrawals}
                  isHoldingMarket={canInteract}
                />
              ) : (
                <AccountSectionSkeleton />
              )}
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
          {checked === 5 && (
            <Box sx={SlideContentContainer} marginTop="12px">
              <MarketAuthorisedLenders
                market={market}
                marketAccount={marketAccount}
              />
            </Box>
          )}

          {checked === 6 && canInteract && marketAccount && (
            <Box sx={SlideContentContainer} marginTop="12px">
              <MarketMLA marketAccount={marketAccount} />
            </Box>
          )}
          {checked === 6 && canInteract && !marketAccount && (
            <Box sx={SlideContentContainer} marginTop="12px">
              <AccountSectionSkeleton />
            </Box>
          )}
          {checked === 7 && (
            <Box sx={SlideContentContainer} marginTop="12px">
              <PaginatedMarketRecordsTable market={market} />
            </Box>
          )}
          {checked === 8 && (
            <Box sx={SlideContentContainer} marginTop="4px">
              <WrapDebtToken
                market={market}
                wrapper={wrapper}
                hasWrapper={hasWrapper}
                hasFactory={hasFactory}
                isWrapperLoading={isWrapperLoading}
                isWrapperLookupLoading={isWrapperLookupLoading}
                isWrapperError={isWrapperError}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
