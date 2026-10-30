import * as React from "react"

import {
  BorrowerAnalytics,
  MarketAnalytics as MarketData,
  useBorrowerAnalytics,
  useMarketAnalytics,
} from "./api"
import { AnalyticsSkeleton, Notice } from "./Frame"
import { MarketAnalyticsFrame, MarketDashboard } from "./MarketDashboard"

/** Independent API requests can straddle a publication switch. */
export const sameSnapshot = (market: MarketData, borrower: BorrowerAnalytics) =>
  market.market.chainId === borrower.borrower.chainId &&
  market.flags.borrower?.toLowerCase() ===
    borrower.borrower.address.toLowerCase() &&
  market.publication.id === borrower.publication.id &&
  market.publication.cut !== null &&
  borrower.publication.cut !== null &&
  market.publication.cut.block === borrower.publication.cut.block &&
  market.publication.cut.hash === borrower.publication.cut.hash

export const MarketAnalyticsView = ({
  market,
  borrower,
  typeLabels,
  borrowerName,
  borrowerLoading,
}: {
  market: MarketData
  borrower?: BorrowerAnalytics
  typeLabels?: string[]
  borrowerName?: string
  borrowerLoading?: boolean
}) => {
  const matchingBorrower =
    borrower &&
    sameSnapshot(market, borrower) &&
    borrower.state === "Ok" &&
    Object.keys(borrower.values).length
      ? borrower
      : undefined
  let content = (
    <MarketDashboard
      market={market}
      borrower={matchingBorrower}
      comparisonUnavailable={Boolean(borrower && !matchingBorrower)}
      typeLabels={typeLabels}
      borrowerName={borrowerName}
      borrowerLoading={borrowerLoading}
    />
  )
  if (market.state === "Preparing") {
    content = <Notice>Market analytics are being prepared.</Notice>
  } else if (
    market.state === "UnderReview" ||
    Object.keys(market.values).length === 0
  ) {
    content = <Notice>Market analytics are under review.</Notice>
  }
  return (
    <MarketAnalyticsFrame
      publication={market.publication}
      closed={market.values.M77 === "Closed"}
    >
      {content}
    </MarketAnalyticsFrame>
  )
}

export const MarketAnalytics = ({
  chainId,
  address,
  borrowerAddress,
  typeLabels,
  borrowerName,
}: {
  chainId?: number
  address?: string
  borrowerAddress?: string
  /** Market type labels (G4), from the market's hooks and app data. */
  typeLabels?: string[]
  borrowerName?: string
}) => {
  const market = useMarketAnalytics(chainId, address)
  const borrower = useBorrowerAnalytics(chainId, borrowerAddress)
  if (!chainId || !address || market.isLoading)
    return (
      <MarketAnalyticsFrame>
        <AnalyticsSkeleton compact />
      </MarketAnalyticsFrame>
    )
  if (market.isError || !market.data)
    return (
      <MarketAnalyticsFrame>
        <Notice
          onRetry={() => {
            market.refetch()
          }}
        >
          Analytics could not be loaded.
        </Notice>
      </MarketAnalyticsFrame>
    )
  if (market.data.status === "preparing")
    return (
      <MarketAnalyticsFrame>
        <Notice>Market analytics are being prepared.</Notice>
      </MarketAnalyticsFrame>
    )
  if (market.data.status === "unavailable")
    return (
      <MarketAnalyticsFrame>
        <Notice>Analytics are unavailable for this market.</Notice>
      </MarketAnalyticsFrame>
    )
  return (
    <MarketAnalyticsView
      market={market.data.data}
      borrower={borrower.data?.status === "ok" ? borrower.data.data : undefined}
      typeLabels={typeLabels}
      borrowerName={borrowerName}
      borrowerLoading={Boolean(borrowerAddress) && borrower.isLoading}
    />
  )
}
