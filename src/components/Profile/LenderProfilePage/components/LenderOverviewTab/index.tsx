"use client"

import * as React from "react"

import { Box, Chip, Link as MuiLink, Tooltip, Typography } from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import Link from "next/link"

import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderActivity } from "@/app/[locale]/lender/profile/hooks/useLenderActivity"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { AnalyticsDataGrid } from "@/components/Profile/shared/AnalyticsDataGrid"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress, buildMarketHref } from "@/utils/formatters"

import { LenderOverviewHeader } from "./LenderOverviewHeader"

type LenderOverviewTabProps = {
  lenderAddress: `0x${string}` | undefined
  data?: LenderPositionsData
  isLoading: boolean
}

const STATUS_COLORS: Record<string, string> = {
  Active: COLORS.lightGreen,
  Delinquent: COLORS.oasis,
  Penalty: COLORS.remy,
  Closed: COLORS.athensGrey,
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  Active: COLORS.blackRock,
  Delinquent: COLORS.butteredRum,
  Penalty: COLORS.dullRed,
  Closed: COLORS.santasGrey,
}

export const LenderOverviewTab = ({
  lenderAddress,
  data,
  isLoading,
}: LenderOverviewTabProps) => {
  const { data: borrowers } = useBorrowerNames()
  const activityQuery = useLenderActivity(
    lenderAddress,
    data?.marketIds ?? [],
    data?.decimalsMap ?? {},
    data?.priceMap ?? {},
  )
  const positions = data?.positions ?? []
  const activePositions = positions
    .filter((position) => position.currentBalance > 0)
    .sort((left, right) => right.currentBalance - left.currentBalance)

  const borrowerExposureRows = React.useMemo(() => {
    const totalBalance = activePositions.reduce(
      (sum, position) => sum + position.currentBalance,
      0,
    )
    const rows = new Map<
      string,
      {
        id: string
        borrower: string
        borrowerName: string
        marketCount: number
        exposure: number
        share: number
      }
    >()

    activePositions.forEach((position) => {
      const match = borrowers?.find(
        (b) => b.address.toLowerCase() === position.borrower.toLowerCase(),
      )
      const existing = rows.get(position.borrower) ?? {
        id: position.borrower,
        borrower: position.borrower,
        borrowerName: match?.alias ?? match?.name ?? "",
        marketCount: 0,
        exposure: 0,
        share: 0,
      }

      existing.marketCount += 1
      existing.exposure += position.currentBalance
      rows.set(position.borrower, existing)
    })

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        share: totalBalance > 0 ? (row.exposure / totalBalance) * 100 : 0,
      }))
      .sort((left, right) => right.exposure - left.exposure)
  }, [activePositions, borrowers])

  const positionColumns: GridColDef[] = [
    {
      field: "marketName",
      headerName: "Market",
      flex: 1.5,
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
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => (
        <Tooltip title={value} placement="top">
          <Link href={`${ROUTES.borrower.profile}/${value}`}>
            <MuiLink
              component="span"
              underline="hover"
              color={COLORS.ultramarineBlue}
            >
              {trimAddress(value)}
            </MuiLink>
          </Link>
        </Tooltip>
      ),
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 110,
    },
    {
      field: "currentBalance",
      headerName: "Balance",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatUsd(value as number, { compact: true }),
    },
    {
      field: "totalDeposited",
      headerName: "Deposited",
      minWidth: 130,
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
    {
      field: "apr",
      headerName: "APR",
      minWidth: 110,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatPercent(value as number),
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 120,
      renderCell: ({ value }) => (
        <Chip
          label={value}
          size="small"
          sx={{
            borderRadius: "8px",
            backgroundColor: STATUS_COLORS[value as string],
            color: STATUS_TEXT_COLORS[value as string],
          }}
        />
      ),
    },
  ]

  const borrowerExposureColumns: GridColDef[] = [
    {
      field: "borrower",
      headerName: "Borrower",
      flex: 1.2,
      minWidth: 180,
      renderCell: ({ value }) => (
        <Tooltip title={value} placement="top">
          <Link href={`${ROUTES.borrower.profile}/${value}`}>
            <MuiLink
              component="span"
              underline="hover"
              color={COLORS.ultramarineBlue}
            >
              {trimAddress(value)}
            </MuiLink>
          </Link>
        </Tooltip>
      ),
    },
    {
      field: "borrowerName",
      headerName: "Name",
      flex: 1,
      minWidth: 160,
    },
    {
      field: "marketCount",
      headerName: "Markets",
      minWidth: 110,
      align: "right",
      headerAlign: "right",
    },
    {
      field: "exposure",
      headerName: "Exposure",
      minWidth: 140,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatUsd(value as number, { compact: true }),
    },
    {
      field: "share",
      headerName: "Portfolio Share",
      minWidth: 150,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatPercent(value as number, 1),
    },
  ]

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <LenderOverviewHeader
        lenderAddress={lenderAddress}
        data={data}
        activity={activityQuery.data}
        isLoading={isLoading}
      />

      <Box>
        <Typography variant="title3" marginBottom="12px">
          Active positions
        </Typography>
        <AnalyticsDataGrid
          loading={isLoading}
          rows={activePositions}
          columns={positionColumns}
          noRowsLabel="No active positions for this lender."
          minWidth={980}
        />
      </Box>

      <Box>
        <Typography variant="title3" marginBottom="12px">
          Borrower exposure
        </Typography>
        <AnalyticsDataGrid
          loading={isLoading}
          rows={borrowerExposureRows}
          columns={borrowerExposureColumns}
          noRowsLabel="No active borrower exposure."
          minWidth={700}
        />
      </Box>
    </Box>
  )
}
