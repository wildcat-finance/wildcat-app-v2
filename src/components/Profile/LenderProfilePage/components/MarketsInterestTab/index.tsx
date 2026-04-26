"use client"

import * as React from "react"

import { Box, Tooltip as MuiTooltip, Typography } from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import Link from "next/link"

import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { CHART_PALETTE, DonutChart, DonutChartItem } from "@/components/ECharts"
import { LinkGroup } from "@/components/LinkComponent"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { AnalyticsDataGrid } from "@/components/Profile/shared/AnalyticsDataGrid"
import { ProfileChartContainerStyle } from "@/components/Profile/shared/chartStyle"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildBorrowerProfileHref,
  buildMarketHref,
  trimAddress,
} from "@/utils/formatters"
import { MarketStatus } from "@/utils/marketStatus"

type MarketsInterestTabProps = {
  data?: LenderPositionsData
  isLoading: boolean
}

const PIE_COLORS = [...CHART_PALETTE.categorical]

const TextCell = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="text3">{children}</Typography>
)

const RightTextCell = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="text3" width="100%" textAlign="right">
    {children}
  </Typography>
)

const getHistoryMarketStatus = (
  status: "Active" | "Delinquent" | "Penalty" | "Closed",
) => {
  const statusMap = {
    Active: MarketStatus.HEALTHY,
    Delinquent: MarketStatus.DELINQUENT,
    Penalty: MarketStatus.PENALTY,
    Closed: MarketStatus.TERMINATED,
  } as const

  return {
    status: statusMap[status],
    healthyPeriod: null,
    penaltyPeriod: 0,
    delinquencyPeriod: 0,
  }
}

export const MarketsInterestTab = ({
  data,
  isLoading,
}: MarketsInterestTabProps) => {
  const { chainId } = useSelectedNetwork()
  const { getAddressUrl } = useBlockExplorer()
  const positions = data?.positions ?? []
  const interestRows = positions
    .filter((position) => position.interestEarned > 0)
    .sort((left, right) => right.interestEarned - left.interestEarned)

  const totalInterest = interestRows.reduce(
    (sum, position) => sum + position.interestEarned,
    0,
  )
  const activePositionCount = data?.profile.activePositions ?? 0
  const interestDonutData = React.useMemo<DonutChartItem[]>(
    () =>
      interestRows.map((row, index) => ({
        name: row.marketName,
        value: row.interestEarned,
        color: PIE_COLORS[index % PIE_COLORS.length],
        tooltipRows: [
          { label: "APR", value: `${row.apr.toFixed(2)}%` },
          { label: "Status", value: row.status },
          {
            label: "Share",
            value: formatPercent(
              totalInterest > 0
                ? (row.interestEarned / totalInterest) * 100
                : 0,
              1,
            ),
          },
        ],
      })),
    [interestRows, totalInterest],
  )

  const interestColumns: GridColDef[] = [
    {
      field: "marketName",
      headerName: "Market",
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row, value }) => (
        <Link
          href={buildMarketHref(row.marketId, undefined, ROUTES.lender.market)}
        >
          <Typography component="span" variant="text3">
            {value}
          </Typography>
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 110,
      renderCell: ({ value }) => <TextCell>{value}</TextCell>,
    },
    {
      field: "interestEarned",
      headerName: "Interest earned",
      minWidth: 150,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>
          {formatUsd(value as number, { compact: true })}
        </RightTextCell>
      ),
    },
    {
      field: "share",
      headerName: "Share",
      minWidth: 120,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>{formatPercent(value as number, 1)}</RightTextCell>
      ),
    },
  ]

  const marketHistoryColumns: GridColDef[] = [
    {
      field: "marketName",
      headerName: "Market",
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row, value }) => (
        <Link
          href={buildMarketHref(row.marketId, undefined, ROUTES.lender.market)}
        >
          <Typography component="span" variant="text3">
            {value}
          </Typography>
        </Link>
      ),
    },
    {
      field: "borrower",
      headerName: "Borrower",
      minWidth: 150,
      renderCell: ({ value }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <MuiTooltip title={value} placement="top">
            <Link href={buildBorrowerProfileHref(value, chainId)}>
              <Typography component="span" variant="text3">
                {trimAddress(value)}
              </Typography>
            </Link>
          </MuiTooltip>
          <LinkGroup linkValue={getAddressUrl(value)} copyValue={value} />
        </Box>
      ),
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 110,
      renderCell: ({ value }) => <TextCell>{value}</TextCell>,
    },
    {
      field: "addedDate",
      headerName: "First deposit",
      minWidth: 140,
      renderCell: ({ value }) => <TextCell>{value}</TextCell>,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 130,
      renderCell: ({ value }) => (
        <MarketStatusChip
          status={getHistoryMarketStatus(
            value as "Active" | "Delinquent" | "Penalty" | "Closed",
          )}
          withPeriod={false}
        />
      ),
    },
    {
      field: "totalDeposited",
      headerName: "Deposited",
      minWidth: 140,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>
          {formatUsd(value as number, { compact: true })}
        </RightTextCell>
      ),
    },
    {
      field: "interestEarned",
      headerName: "Interest",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>
          {formatUsd(value as number, { compact: true })}
        </RightTextCell>
      ),
    },
  ]

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Box>
        <Typography
          variant="title2"
          display="block"
          sx={{ marginBottom: "24px" }}
        >
          Interest breakdown
        </Typography>

        {interestRows.length > 0 ? (
          <Box
            sx={{
              border: `1px solid ${COLORS.athensGrey}`,
              borderRadius: "16px",
              backgroundColor: COLORS.white,
              padding: "24px",
              marginBottom: "24px",
              ...ProfileChartContainerStyle,
            }}
          >
            <Typography variant="text2Highlighted">
              Interest by position
            </Typography>
            <Typography
              variant="text4"
              color={COLORS.santasGrey}
              marginTop="6px"
              display="block"
              sx={{ lineHeight: 1.45 }}
            >
              {formatUsd(totalInterest, { compact: true })} earned across{" "}
              {interestRows.length} positions with realized interest.{" "}
              {activePositionCount} positions are still open with balance.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
                gap: "24px",
                marginTop: "20px",
                alignItems: "center",
              }}
            >
              <Box sx={{ width: "100%", height: 260 }}>
                <DonutChart
                  data={interestDonutData}
                  colors={PIE_COLORS}
                  formatValue={(value) => formatUsd(value)}
                  centerLabel={{
                    primary: formatUsd(totalInterest, { compact: true }),
                    secondary: "Total interest",
                  }}
                  ariaLabel="Interest earned by lender position"
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "252px",
                  overflowY: interestDonutData.length > 7 ? "auto" : "visible",
                  paddingRight: interestDonutData.length > 7 ? "6px" : 0,
                }}
              >
                {interestDonutData.map((row, index) => (
                  <Box
                    key={row.name}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Box
                      sx={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        backgroundColor:
                          row.color ?? PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />
                    <Typography
                      variant="text2"
                      sx={{ flex: 1, minWidth: 0 }}
                      noWrap
                    >
                      {row.name}
                    </Typography>
                    <Typography variant="text2" color={COLORS.santasGrey}>
                      {formatPercent(
                        totalInterest > 0
                          ? (row.value / totalInterest) * 100
                          : 0,
                        1,
                      )}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              border: `1px dashed ${COLORS.iron}`,
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "16px",
            }}
          >
            <Typography variant="text2" color={COLORS.santasGrey}>
              No interest earned yet for this lender.
            </Typography>
          </Box>
        )}

        <AnalyticsDataGrid
          loading={isLoading}
          rows={interestRows.map((row) => ({
            ...row,
            share:
              totalInterest > 0
                ? (row.interestEarned / totalInterest) * 100
                : 0,
          }))}
          columns={interestColumns}
          noRowsLabel="No interest earned yet."
          minWidth={760}
        />
      </Box>

      <Box>
        <Typography
          variant="title2"
          display="block"
          sx={{ marginBottom: "6px" }}
        >
          Market history
        </Typography>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          display="block"
          sx={{ marginBottom: "24px" }}
        >
          All {positions.length} lender positions, including exited markets.
        </Typography>
        <AnalyticsDataGrid
          loading={isLoading}
          rows={positions}
          columns={marketHistoryColumns}
          noRowsLabel="No market history found for this lender."
          minWidth={980}
        />
      </Box>
    </Box>
  )
}
