"use client"

import * as React from "react"

import { Market } from "@wildcatfi/wildcat-sdk"

import MarketDailyStatsChart from "@/components/charts/MarketDailyStatsChart"
import MarketWithdrawalsChart from "@/components/charts/MarketWithdrawalCharts"
import { useGetMarketChartsData } from "@/hooks/useGetMarketChartsData"

export const DailyAndWithdrawalCharts = ({ market }: { market: Market }) => {
  const { data: marketChartsData, isLoading } = useGetMarketChartsData(market)
  return (
    !!marketChartsData &&
    !isLoading && (
      <>
        {marketChartsData.dailyStats.length > 0 && (
          <MarketDailyStatsChart
            data={marketChartsData.dailyStats}
            tokenSymbol={market.underlyingToken.symbol}
          />
        )}
        {marketChartsData.withdrawalBatches.length > 0 && (
          <MarketWithdrawalsChart
            data={marketChartsData.withdrawalBatches}
            tokenSymbol={market.underlyingToken.symbol}
          />
        )}
      </>
    )
  )
}
