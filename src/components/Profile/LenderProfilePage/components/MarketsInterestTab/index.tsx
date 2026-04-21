"use client"

import * as React from "react"

import { Box, Chip, Link as MuiLink, Typography } from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import Link from "next/link"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { AnalyticsDataGrid } from "@/components/Profile/shared/AnalyticsDataGrid"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildMarketHref, trimAddress } from "@/utils/formatters"

type MarketsInterestTabProps = {
  data?: LenderPositionsData
  isLoading: boolean
}

const PIE_COLORS = [
  COLORS.ultramarineBlue,
  COLORS.cornflowerBlue,
  COLORS.galliano,
  COLORS.carminePink,
  COLORS.greySuit,
  COLORS.matteSilver,
]

const asNumericValue = (value: unknown) =>
  typeof value === "number" ? value : Number(value ?? 0)

export const MarketsInterestTab = ({
  data,
  isLoading,
}: MarketsInterestTabProps) => {
  const positions = data?.positions ?? []
  const interestRows = positions
    .filter((position) => position.interestEarned > 0)
    .sort((left, right) => right.interestEarned - left.interestEarned)

  const totalInterest = interestRows.reduce(
    (sum, position) => sum + position.interestEarned,
    0,
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
          <MuiLink
            component="span"
            underline="hover"
            color={COLORS.ultramarineBlue}
          >
            {value}
          </MuiLink>
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 110,
    },
    {
      field: "interestEarned",
      headerName: "Interest earned",
      minWidth: 150,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatUsd(value as number, { compact: true }),
    },
    {
      field: "share",
      headerName: "Share",
      minWidth: 120,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatPercent(value as number, 1),
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
          <MuiLink
            component="span"
            underline="hover"
            color={COLORS.ultramarineBlue}
          >
            {value}
          </MuiLink>
        </Link>
      ),
    },
    {
      field: "borrower",
      headerName: "Borrower",
      minWidth: 150,
      renderCell: ({ value }) => (
        <Link href={`${ROUTES.borrower.profile}/${value}`}>
          <MuiLink
            component="span"
            underline="hover"
            color={COLORS.ultramarineBlue}
          >
            {trimAddress(value)}
          </MuiLink>
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 110,
    },
    {
      field: "addedDate",
      headerName: "First deposit",
      minWidth: 140,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 130,
      renderCell: ({ value }) => {
        const isActive = value !== "Closed"
        return (
          <Chip
            label={isActive ? "Active" : "Exited"}
            size="small"
            sx={{
              borderRadius: "8px",
              backgroundColor: isActive ? COLORS.lightGreen : COLORS.athensGrey,
              color: isActive ? COLORS.blackRock : COLORS.santasGrey,
            }}
          />
        )
      },
    },
    {
      field: "totalDeposited",
      headerName: "Deposited",
      minWidth: 140,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatUsd(value as number, { compact: true }),
    },
    {
      field: "interestEarned",
      headerName: "Interest",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatUsd(value as number, { compact: true }),
    },
  ]

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Box>
        <Typography variant="title3" marginBottom="12px">
          Interest breakdown
        </Typography>

        {interestRows.length > 0 ? (
          <Box
            sx={{
              border: `1px solid ${COLORS.athensGrey}`,
              borderRadius: "16px",
              backgroundColor: COLORS.white,
              padding: "24px",
              marginBottom: "16px",
            }}
          >
            <Typography variant="text2Highlighted">
              Interest by market
            </Typography>
            <Typography
              variant="text4"
              color={COLORS.santasGrey}
              marginTop="6px"
              display="block"
              sx={{ lineHeight: 1.45 }}
            >
              {formatUsd(totalInterest, { compact: true })} total interest
              earned.
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
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={interestRows.map((row) => ({
                        name: row.marketName,
                        value: row.interestEarned,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {interestRows.map((row, index) => (
                        <Cell
                          key={row.marketId}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatUsd(asNumericValue(value))}
                      contentStyle={{
                        borderRadius: "12px",
                        border: `1px solid ${COLORS.athensGrey}`,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              <Box
                sx={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                {interestRows.map((row, index) => (
                  <Box
                    key={row.marketId}
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
                        backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />
                    <Typography
                      variant="text2"
                      sx={{ flex: 1, minWidth: 0 }}
                      noWrap
                    >
                      {row.marketName}
                    </Typography>
                    <Typography variant="text2" color={COLORS.santasGrey}>
                      {formatPercent(
                        totalInterest > 0
                          ? (row.interestEarned / totalInterest) * 100
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
        <Typography variant="title3" marginBottom="12px">
          Market history
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
