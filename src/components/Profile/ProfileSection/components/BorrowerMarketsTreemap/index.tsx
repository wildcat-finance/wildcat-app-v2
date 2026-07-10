"use client"

import * as React from "react"

import {
  Box,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"

import {
  CHART_PALETTE,
  TreemapChart,
  TreemapChartItem,
} from "@/components/ECharts"
import { formatUsd } from "@/components/Profile/shared/analytics"
import { AnalyticsChartCard } from "@/components/Profile/shared/AnalyticsChartCard"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"

type BorrowerMarketsTreemapProps = {
  markets: Market[]
  priceMap: Record<string, number>
  isLoading?: boolean
}

type TreemapSizeMode = "capacity" | "supply"

const STATUS_STYLE: Record<MarketStatus, { label: string; color: string }> = {
  [MarketStatus.HEALTHY]: {
    label: "Healthy",
    color: CHART_PALETTE.risk.healthy,
  },
  [MarketStatus.DELINQUENT]: {
    label: "Delinquent",
    color: CHART_PALETTE.risk.grace,
  },
  [MarketStatus.PENALTY]: {
    label: "Penalty",
    color: CHART_PALETTE.risk.penalty,
  },
  [MarketStatus.TERMINATED]: {
    label: "Terminated",
    color: CHART_PALETTE.semantic.neutral,
  },
}

type TreemapMarketRow = {
  market: Market
  status: MarketStatus
  statusStyle: (typeof STATUS_STYLE)[MarketStatus]
  price: number
  debt: number
  capacity: number
  supply: number
  debtUsd: number
  capacityUsd: number
  supplyUsd: number
  sizeUsd: number
  rawSize: number
}

const getTokenAmountValue = (amount: Market["totalDebts"]) =>
  Number(amount.format(amount.decimals))

const getMarketPrice = (market: Market, priceMap: Record<string, number>) =>
  priceMap[market.address.toLowerCase()] ?? priceMap[market.address] ?? 0

const formatApr = (annualInterestBips: number) =>
  `${(annualInterestBips / 100).toFixed(2)}%`

const formatTokenOrUsd = (
  usdValue: number,
  tokenAmount: Market["totalDebts"],
) =>
  usdValue > 0
    ? formatUsd(usdValue, { compact: true })
    : formatTokenWithCommas(tokenAmount, {
        withSymbol: true,
        fractionDigits: 2,
      })

const buildTreemapRows = (
  markets: Market[],
  priceMap: Record<string, number>,
  sizeMode: TreemapSizeMode,
): TreemapMarketRow[] =>
  markets.map((market) => {
    const { status } = getMarketStatusChip(market)
    const statusStyle = STATUS_STYLE[status]
    const price = getMarketPrice(market, priceMap)
    const debt = getTokenAmountValue(market.totalDebts)
    const capacity = getTokenAmountValue(market.maxTotalSupply)
    const supply = getTokenAmountValue(market.totalSupply)
    const debtUsd = debt * price
    const capacityUsd = capacity * price
    const supplyUsd = supply * price
    const sizeUsd = sizeMode === "capacity" ? capacityUsd : supplyUsd
    const sizeToken = sizeMode === "capacity" ? capacity : supply

    return {
      market,
      status,
      statusStyle,
      price,
      debt,
      capacity,
      supply,
      debtUsd,
      capacityUsd,
      supplyUsd,
      sizeUsd,
      rawSize: sizeUsd || sizeToken,
    }
  })

const buildTreemapData = (
  markets: Market[],
  priceMap: Record<string, number>,
  sizeMode: TreemapSizeMode,
): TreemapChartItem[] => {
  const rows = buildTreemapRows(markets, priceMap, sizeMode)
  const positiveSizes = rows
    .map((row) => row.rawSize)
    .filter((value) => value > 0)
  const zeroValueFloor =
    positiveSizes.length > 0 ? Math.min(...positiveSizes) * 0.001 : 1

  return rows.map((row) => {
    const {
      market,
      statusStyle,
      debt,
      capacity,
      debtUsd,
      capacityUsd,
      supplyUsd,
      sizeUsd,
      rawSize,
    } = row
    const apr = formatApr(market.annualInterestBips)
    const debtLabel = formatTokenOrUsd(debtUsd, market.totalDebts)
    const capacityLabel = formatTokenOrUsd(capacityUsd, market.maxTotalSupply)
    const supplyLabel = formatTokenOrUsd(supplyUsd, market.totalSupply)
    const utilization =
      capacity > 0
        ? `${Math.min((debt / capacity) * 100, 100).toFixed(1)}%`
        : "0%"

    return {
      name: [
        market.name,
        `APR ${apr}`,
        `Debt ${debtLabel}`,
        `Cap ${capacityLabel}`,
      ].join("\n"),
      displayName: market.name,
      value: rawSize > 0 ? rawSize : zeroValueFloor,
      rawValue: rawSize,
      color: statusStyle.color,
      tooltipRows: [
        {
          label: "Status",
          value: statusStyle.label,
          color: statusStyle.color,
        },
        {
          label: "APR",
          value: apr,
        },
        {
          label: sizeMode === "capacity" ? "Tile capacity" : "Tile supply",
          value:
            sizeUsd > 0
              ? formatUsd(sizeUsd, { compact: true })
              : formatTokenWithCommas(
                  sizeMode === "capacity"
                    ? market.maxTotalSupply
                    : market.totalSupply,
                  {
                    withSymbol: true,
                    fractionDigits: 2,
                  },
                ),
        },
        {
          label: "Debt",
          value: debtLabel,
        },
        {
          label: "Capacity",
          value: capacityLabel,
        },
        {
          label: "Supply",
          value: supplyLabel,
        },
        {
          label: "Utilization",
          value: utilization,
        },
      ],
    }
  })
}

const StatusLegend = () => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 14px",
    }}
  >
    {Object.entries(STATUS_STYLE).map(([status, { label, color }]) => (
      <Box
        key={status}
        sx={{ display: "flex", alignItems: "center", gap: "6px" }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "2px",
            backgroundColor: color,
          }}
        />
        <Typography variant="text4" color={COLORS.santasGrey}>
          {label}
        </Typography>
      </Box>
    ))}
  </Box>
)

const SizeModeToggle = ({
  value,
  onChange,
}: {
  value: TreemapSizeMode
  onChange: (value: TreemapSizeMode) => void
}) => (
  <ToggleButtonGroup
    exclusive
    size="small"
    value={value}
    onChange={(_, nextValue: TreemapSizeMode | null) => {
      if (nextValue) onChange(nextValue)
    }}
    sx={{
      "& .MuiToggleButton-root": {
        minWidth: 74,
        borderColor: COLORS.athensGrey,
        color: COLORS.santasGrey,
        typography: "text4",
        padding: "4px 8px",
        textTransform: "none",
      },
      "& .MuiToggleButton-root:focus-visible": {
        outline: `2px solid ${COLORS.ultramarineBlue}`,
        outlineOffset: "2px",
      },
      "& .Mui-selected": {
        backgroundColor: `${COLORS.ultramarineBlue}14 !important`,
        color: `${COLORS.ultramarineBlue} !important`,
      },
    }}
  >
    <ToggleButton value="capacity" aria-label="Size by capacity">
      Capacity
    </ToggleButton>
    <ToggleButton value="supply" aria-label="Size by supply">
      Supply
    </ToggleButton>
  </ToggleButtonGroup>
)

const TerminatedToggle = ({
  showTerminated,
  onChange,
}: {
  showTerminated: boolean
  onChange: (showTerminated: boolean) => void
}) => (
  <ToggleButton
    selected={!showTerminated}
    value="hide-terminated"
    size="small"
    onChange={() => onChange(!showTerminated)}
    aria-label="Hide terminated markets"
    sx={{
      minWidth: 110,
      borderColor: COLORS.athensGrey,
      color: COLORS.santasGrey,
      typography: "text4",
      padding: "4px 8px",
      textTransform: "none",
      "&.Mui-selected": {
        backgroundColor: `${COLORS.ultramarineBlue}14 !important`,
        color: `${COLORS.ultramarineBlue} !important`,
      },
      "&:focus-visible": {
        outline: `2px solid ${COLORS.ultramarineBlue}`,
        outlineOffset: "2px",
      },
    }}
  >
    Hide terminated
  </ToggleButton>
)

export const BorrowerMarketsTreemap = ({
  markets,
  priceMap,
  isLoading,
}: BorrowerMarketsTreemapProps) => {
  const [sizeMode, setSizeMode] = React.useState<TreemapSizeMode>("capacity")
  const [showTerminated, setShowTerminated] = React.useState(true)
  const visibleMarkets = React.useMemo(
    () =>
      showTerminated
        ? markets
        : markets.filter(
            (market) =>
              getMarketStatusChip(market).status !== MarketStatus.TERMINATED,
          ),
    [markets, showTerminated],
  )
  const data = React.useMemo(
    () => buildTreemapData(visibleMarkets, priceMap, sizeMode),
    [visibleMarkets, priceMap, sizeMode],
  )

  if (!isLoading && data.length === 0) {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        No markets found for this borrower on the selected network.
      </Typography>
    )
  }

  return (
    <AnalyticsChartCard
      title="Borrower market map"
      actions={
        <>
          <TerminatedToggle
            showTerminated={showTerminated}
            onChange={setShowTerminated}
          />
          <SizeModeToggle value={sizeMode} onChange={setSizeMode} />
        </>
      }
      cardHeight={320}
      dialogHeight={560}
      cardSx={{ paddingBottom: 0 }}
    >
      {() => (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <StatusLegend />
          <Box sx={{ width: "100%", flex: 1, minHeight: 0 }}>
            {isLoading ? (
              <Skeleton
                variant="rounded"
                width="100%"
                height="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            ) : (
              <TreemapChart
                data={data}
                height="100%"
                ariaLabel="Borrower markets by status"
              />
            )}
          </Box>
        </Box>
      )}
    </AnalyticsChartCard>
  )
}
