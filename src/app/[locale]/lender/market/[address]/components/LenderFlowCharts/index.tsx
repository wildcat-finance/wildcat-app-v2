"use client"

import { Box, Skeleton } from "@mui/material"
import { useTranslation } from "react-i18next"

import { TimeSeriesChart, TimeSeriesConfig } from "@/components/ECharts"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import { CHART_COLORS } from "@/components/Profile/shared/chartStyle"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { ChartsGrid } from "./style"
import type { DailyFlowPoint } from "../../hooks/useMarketDailyFlows"

function fmtK(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(v % 1 === 0 ? 0 : 1)
}

const fmtToken = (symbol: string) => (v: number) =>
  `${Math.abs(v).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${symbol}`

const fmtTokenAxis = (symbol: string) => (v: number) => `${fmtK(v)} ${symbol}`

type ChartBodyProps = {
  data: DailyFlowPoint[]
  symbol: string
}

const DAILY_FLOW_SERIES: TimeSeriesConfig<DailyFlowPoint>[] = [
  {
    key: "dailyDeposit",
    name: "Deposits",
    color: CHART_COLORS.deposit,
    kind: "bar",
  },
  {
    key: "dailyWithdrawalRequestedNeg",
    name: "Withdrawals Requested",
    color: CHART_COLORS.withdrawalRequested,
    kind: "bar",
  },
  {
    key: "dailyWithdrawalExecutedNeg",
    name: "Withdrawals Executed",
    color: CHART_COLORS.withdrawalExecuted,
    kind: "bar",
  },
]

const NET_FLOW_SERIES: TimeSeriesConfig<DailyFlowPoint>[] = [
  {
    key: "netFlow",
    name: "Net Flow",
    color: CHART_COLORS.deposit,
    kind: "area",
  },
]

const DailyFlowsChartBody = ({ data, symbol }: ChartBodyProps) => (
  <TimeSeriesChart
    data={data}
    series={DAILY_FLOW_SERIES}
    formatValue={fmtToken(symbol)}
    yAxisFormatter={fmtTokenAxis(symbol)}
    ariaLabel="Daily market deposits and withdrawals"
  />
)

const CumulativeNetFlowChartBody = ({ data, symbol }: ChartBodyProps) => (
  <TimeSeriesChart
    data={data}
    series={NET_FLOW_SERIES}
    formatValue={fmtToken(symbol)}
    yAxisFormatter={fmtTokenAxis(symbol)}
    showLegend={false}
    ariaLabel="Cumulative market net flow"
  />
)

export const LenderFlowCharts = ({
  dailyFlows,
  isLoading,
  symbol,
}: {
  dailyFlows: DailyFlowPoint[]
  isLoading: boolean
  symbol: string
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

  if (isLoading) {
    return (
      <Box sx={ChartsGrid(isMobile)}>
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
        />
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
        />
      </Box>
    )
  }

  if (dailyFlows.length === 0) return null

  return (
    <Box sx={ChartsGrid(isMobile)}>
      <AnalyticsChartCard
        title={t("lenderMarketDetails.analytics.charts.dailyFlows")}
        description={t("lenderMarketDetails.analytics.charts.dailyFlowsDesc")}
        cardHeight={260}
        dialogHeight={isMobile ? 360 : 520}
      >
        {() => <DailyFlowsChartBody data={dailyFlows} symbol={symbol} />}
      </AnalyticsChartCard>

      <AnalyticsChartCard
        title={t("lenderMarketDetails.analytics.charts.cumulativeNetFlow")}
        description={t(
          "lenderMarketDetails.analytics.charts.cumulativeNetFlowDesc",
        )}
        cardHeight={260}
        dialogHeight={isMobile ? 360 : 520}
      >
        {() => <CumulativeNetFlowChartBody data={dailyFlows} symbol={symbol} />}
      </AnalyticsChartCard>
    </Box>
  )
}
