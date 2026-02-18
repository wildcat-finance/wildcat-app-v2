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
        <MarketDailyStatsChart data={marketChartsData.dailyStats} />
        <MarketWithdrawalsChart data={marketChartsData.withdrawalBatches} />
      </>
    )
  )
}
