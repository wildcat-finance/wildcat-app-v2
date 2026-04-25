"use client"

import * as React from "react"

import { Box, MenuItem, Select, Skeleton, Typography } from "@mui/material"

import {
  LenderPositionRow,
  LenderRiskReturnsPoint,
} from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderRiskReturnsChart } from "@/app/[locale]/lender/profile/hooks/useLenderRiskReturnsChart"
import wildcatLogoUrl from "@/assets/icons/logo_black.svg?url"
import { EChart, EChartOption, formatChartDate } from "@/components/ECharts"
import { tooltipRow, tooltipShell } from "@/components/ECharts/formatters"
import {
  formatAxisNumber,
  formatPercent,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import { COLORS } from "@/theme/colors"

type RiskReturnsChartProps = {
  lenderAddress: `0x${string}` | undefined
  positions: LenderPositionRow[]
  priceMap: Record<string, number>
}

type DelinquencyPeriod = {
  startTimestamp: number
  endTimestamp: number
}

const YOUR_ACTIVITY_COLOR = "#5C7DFF"
const INTEREST_COLOR = "#6CBF63"
const OTHER_WITHDRAWALS_COLOR = "#F2AEB8"
const LENDER_WITHDRAWALS_COLOR = "#F1464B"
const watermarkImage =
  typeof wildcatLogoUrl === "string"
    ? wildcatLogoUrl
    : (wildcatLogoUrl as { src: string }).src

const YIELD_WITHDRAWAL_WATERMARK: EChartOption["graphic"] = {
  type: "image",
  z: 0,
  silent: true,
  style: {
    image: watermarkImage,
    width: 260,
    height: 87,
    opacity: 0.05,
  },
  left: "center",
  top: "42%",
}

const csvCell = (value: string | number | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`

const buildCsv = (data: LenderRiskReturnsPoint[]) =>
  [
    [
      "Date",
      "Cumulative lender interest USD",
      "Lender deposits (daily) USD",
      "Cumulative net lender deposits USD",
      "Other-lender withdrawals USD",
      "Lender withdrawals USD",
      "Market withdrawals USD",
      "Lender withdrawal share %",
    ],
    ...data.map((point) => [
      formatChartDate(point.timestamp * 1000),
      point.cumulativeInterestUsd,
      point.depositsUsd,
      point.cumulativeNetDepositsUsd,
      point.otherWithdrawalsUsd,
      point.lenderWithdrawalsUsd,
      point.marketWithdrawalsUsd,
      point.lenderWithdrawalSharePct,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")

const formatAxisDate = (timestampMs: number) => {
  const date = new Date(timestampMs)
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`
}

const getMarketLabel = (position: LenderPositionRow) =>
  `${position.marketName} (${position.asset})`

const buildOption = ({
  data,
  delinquencyPeriods,
}: {
  data: LenderRiskReturnsPoint[]
  delinquencyPeriods: DelinquencyPeriod[]
}): EChartOption => ({
  animation: false,
  graphic: YIELD_WITHDRAWAL_WATERMARK,
  grid: { left: 12, right: 56, top: 70, bottom: 64, containLabel: true },
  legend: {
    type: "scroll",
    top: 28,
    right: 8,
    itemWidth: 10,
    itemHeight: 6,
    textStyle: {
      color: COLORS.santasGrey,
      fontFamily: "monospace",
      fontSize: 11,
    },
  },
  tooltip: {
    trigger: "axis",
    confine: true,
    backgroundColor: COLORS.blackRock,
    borderColor: COLORS.iron,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: {
      color: COLORS.white,
      fontFamily: "monospace",
      fontSize: 11,
    },
    axisPointer: {
      type: "cross",
      lineStyle: {
        color: COLORS.ultramarineBlue,
        width: 1,
        opacity: 0.7,
      },
      crossStyle: {
        color: COLORS.ultramarineBlue,
        opacity: 0.7,
      },
    },
    formatter: (params: unknown) => {
      const items = Array.isArray(params) ? params : [params]
      const timestamp = Number(items[0]?.axisValue ?? 0)
      const point = data.find((item) => item.timestamp * 1000 === timestamp)

      if (!point) return ""

      return tooltipShell(
        formatChartDate(timestamp),
        [
          tooltipRow({
            color: INTEREST_COLOR,
            label: "Cumulative interest",
            value: formatUsd(point.cumulativeInterestUsd, { compact: true }),
          }),
          tooltipRow({
            color: YOUR_ACTIVITY_COLOR,
            label: "Lender deposits",
            value: formatUsd(point.cumulativeNetDepositsUsd, {
              compact: true,
            }),
          }),
          tooltipRow({
            color: OTHER_WITHDRAWALS_COLOR,
            label: "Market withdrawals",
            value: formatUsd(point.marketWithdrawalsUsd, { compact: true }),
          }),
          tooltipRow({
            color: LENDER_WITHDRAWALS_COLOR,
            label: "Lender withdrawals",
            value: `${formatUsd(point.lenderWithdrawalsUsd, {
              compact: true,
            })} (${formatPercent(point.lenderWithdrawalSharePct, 1)})`,
          }),
        ].join(""),
      )
    },
  },
  dataZoom: [
    {
      type: "inside",
      xAxisIndex: 0,
      start: 0,
      end: 100,
      filterMode: "filter",
    },
    {
      type: "slider",
      xAxisIndex: 0,
      start: 0,
      end: 100,
      height: 26,
      left: 12,
      right: 12,
      bottom: 8,
      borderColor: COLORS.black01,
      fillerColor: COLORS.blueRibbon01,
      backgroundColor: COLORS.blackRock006,
      dataBackground: {
        lineStyle: { color: COLORS.greySuit, opacity: 0.75 },
        areaStyle: { color: COLORS.greySuit, opacity: 0.18 },
      },
      selectedDataBackground: {
        lineStyle: { color: COLORS.ultramarineBlue, opacity: 0.9 },
        areaStyle: { color: COLORS.ultramarineBlue, opacity: 0.2 },
      },
      handleStyle: {
        borderColor: COLORS.blackRock,
        color: COLORS.white,
      },
      moveHandleStyle: {
        color: COLORS.black01,
      },
      textStyle: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
      },
      labelFormatter: (value: string | number) => formatAxisDate(Number(value)),
    },
  ],
  xAxis: {
    type: "time",
    boundaryGap: true,
    axisLine: { lineStyle: { color: COLORS.black01 } },
    axisTick: { show: false },
    axisLabel: {
      color: COLORS.santasGrey,
      fontFamily: "monospace",
      fontSize: 10,
      formatter: (value: number) => formatAxisDate(value),
    },
    splitLine: {
      lineStyle: {
        color: COLORS.athensGrey,
        type: "dashed",
        opacity: 0.9,
      },
    },
  },
  yAxis: [
    {
      type: "value",
      name: "Returns",
      axisLine: { lineStyle: { color: COLORS.black01 } },
      axisTick: { show: false },
      nameTextStyle: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
      },
      axisLabel: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: {
        lineStyle: {
          color: COLORS.athensGrey,
          type: "dashed",
          opacity: 0.9,
        },
      },
    },
    {
      type: "value",
      name: "Exit pressure",
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      nameTextStyle: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
      },
      axisLabel: {
        color: COLORS.santasGrey,
        fontFamily: "monospace",
        fontSize: 10,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: { show: false },
    },
    {
      type: "value",
      show: false,
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: "Interest earned",
      type: "line",
      yAxisIndex: 0,
      symbol: "none",
      smooth: true,
      lineStyle: { color: INTEREST_COLOR, width: 1.4 },
      itemStyle: { color: INTEREST_COLOR },
      areaStyle: { color: INTEREST_COLOR, opacity: 0.16 },
      markArea:
        delinquencyPeriods.length > 0
          ? {
              silent: true,
              itemStyle: {
                color: COLORS.carminePink,
                opacity: 0.06,
              },
              data: delinquencyPeriods.map((period) => [
                { xAxis: period.startTimestamp * 1000 },
                { xAxis: period.endTimestamp * 1000 },
              ]),
            }
          : undefined,
      data: data.map((point) => [
        point.timestamp * 1000,
        point.cumulativeInterestUsd,
      ]),
    },
    {
      name: "Lender deposits",
      type: "bar",
      yAxisIndex: 2,
      barMaxWidth: 10,
      itemStyle: {
        color: YOUR_ACTIVITY_COLOR,
        borderRadius: [3, 3, 0, 0],
      },
      data: data.map((point) => [point.timestamp * 1000, point.depositsUsd]),
    },
    {
      name: "Other-lender withdrawals",
      type: "bar",
      yAxisIndex: 1,
      stack: "wd",
      barMaxWidth: 12,
      itemStyle: {
        color: OTHER_WITHDRAWALS_COLOR,
        borderRadius: [0, 0, 3, 3],
      },
      data: data.map((point) => [
        point.timestamp * 1000,
        point.otherWithdrawalsUsd,
      ]),
    },
    {
      name: "Lender withdrawals",
      type: "bar",
      yAxisIndex: 1,
      stack: "wd",
      barMaxWidth: 12,
      itemStyle: {
        color: LENDER_WITHDRAWALS_COLOR,
        borderRadius: [0, 0, 3, 3],
      },
      data: data.map((point) => [
        point.timestamp * 1000,
        point.lenderWithdrawalsUsd,
      ]),
    },
  ],
})

export const RiskReturnsChart = ({
  lenderAddress,
  positions,
  priceMap,
}: RiskReturnsChartProps) => {
  const marketOptions = React.useMemo(
    () =>
      positions
        .slice()
        .sort(
          (left, right) => right.currentTokenBalance - left.currentTokenBalance,
        ),
    [positions],
  )
  const [selectedMarketId, setSelectedMarketId] = React.useState<string>("")

  React.useEffect(() => {
    if (marketOptions.length === 0) {
      setSelectedMarketId("")
      return
    }

    if (
      !marketOptions.some((position) => position.marketId === selectedMarketId)
    ) {
      setSelectedMarketId(marketOptions[0].marketId)
    }
  }, [marketOptions, selectedMarketId])

  const chartQuery = useLenderRiskReturnsChart({
    lenderAddress,
    marketId: selectedMarketId || undefined,
    priceMap,
  })
  const data = chartQuery.data?.points ?? []
  const option = React.useMemo(
    () =>
      buildOption({
        data,
        delinquencyPeriods: chartQuery.data?.delinquencyPeriods ?? [],
      }),
    [chartQuery.data?.delinquencyPeriods, data],
  )
  const selectedMarket = marketOptions.find(
    (position) => position.marketId === selectedMarketId,
  )

  if (marketOptions.length === 0) return null

  const renderChart = () => {
    if (chartQuery.isLoading) {
      return (
        <Skeleton
          variant="rounded"
          height="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )
    }

    if (data.length === 0) {
      return (
        <Box
          sx={{
            alignItems: "center",
            color: COLORS.santasGrey,
            display: "flex",
            fontSize: 12,
            height: "100%",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          No daily risk and return history found for this market.
        </Box>
      )
    }

    return (
      <EChart
        option={option}
        ariaLabel={`Risk and returns for ${
          selectedMarket?.marketName ?? "selected market"
        }`}
        showExportActions
        exportButtonVariant="text"
        csvContent={buildCsv(data)}
        csvFileName={`lender-risk-returns-${selectedMarketId}.csv`}
        imageFileName={`lender-risk-returns-${selectedMarketId}.png`}
      />
    )
  }

  return (
    <AnalyticsChartCard
      title="Yield vs Withdrawal pressure"
      description="Interest accrued compared against withdrawal-request volume."
      cardHeight={360}
      dialogHeight={580}
      constrainWidth
      actions={
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Typography
            component="span"
            sx={{
              color: COLORS.santasGrey,
              fontFamily: "monospace",
              fontSize: 10,
            }}
          >
            Market
          </Typography>
          <Select
            size="small"
            value={selectedMarketId}
            onChange={(event) => setSelectedMarketId(event.target.value)}
            sx={{
              height: 28,
              minWidth: 190,
              color: COLORS.blackRock,
              fontFamily: "monospace",
              fontSize: 10,
              "& .MuiSelect-select": {
                padding: "4px 28px 4px 8px",
              },
              "& fieldset": {
                borderColor: COLORS.athensGrey,
              },
              "&:hover fieldset": {
                borderColor: COLORS.iron,
              },
            }}
          >
            {marketOptions.map((position) => (
              <MenuItem
                key={position.marketId}
                value={position.marketId}
                sx={{ fontFamily: "monospace", fontSize: 11 }}
              >
                {getMarketLabel(position)}
              </MenuItem>
            ))}
          </Select>
        </Box>
      }
    >
      {renderChart}
    </AnalyticsChartCard>
  )
}
