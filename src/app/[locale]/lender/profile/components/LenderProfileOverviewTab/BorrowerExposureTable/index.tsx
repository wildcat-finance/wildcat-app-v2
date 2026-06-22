import * as React from "react"

import { Box, Button, Tooltip, Typography } from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import Link from "next/link"

import {
  getBorrowerDisplayName,
  useBorrowerNames,
} from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import {
  ProfileHealthClickableGridSx,
  ProfileHealthRowLinkStretchedSx,
  ProfileHealthTableScrollSx,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/style"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { COLORS } from "@/theme/colors"
import { buildBorrowerProfileHref, buildMarketHref } from "@/utils/formatters"

import {
  BorrowerExposureRow,
  BorrowerExposureTableProps,
  CONCENTRATION_COPY,
  CONCENTRATION_THRESHOLD,
  TypeSafeColDef,
} from "./interface"

// Portfolio-share cell: a proportional bar + %, turning amber with a warning
// badge once the borrower crosses the concentration-risk threshold.
const ConcentrationCell = ({ share }: { share: number }) => {
  const flagged = share > CONCENTRATION_THRESHOLD
  const barColor = flagged ? COLORS.lemonPie : COLORS.ultramarineBlue

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        width: "100%",
        maxWidth: "260px",
        pl: "24px",
      }}
    >
      <Box
        sx={{
          flex: "1 1 auto",
          minWidth: "60px",
          maxWidth: "160px",
          height: "4px",
          borderRadius: "3px",
          backgroundColor: COLORS.athensGrey,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${Math.min(100, Math.max(0, share))}%`,
            height: "100%",
            backgroundColor: barColor,
          }}
        />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <Typography variant="text3">{formatPercent(share, 1)}</Typography>

        {flagged && (
          <Tooltip title={CONCENTRATION_COPY} placement="top" arrow>
            <Box
              component="span"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "transparent",
                border: `1px solid ${COLORS.lemonPie}`,
                color: COLORS.lemonPie,
                fontSize: "10px",
                lineHeight: "14px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              !
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}

export const BorrowerExposureTable = ({
  lenderData,
}: BorrowerExposureTableProps) => {
  const { data: borrowers } = useBorrowerNames()
  const { chainId } = useSelectedNetwork()

  // Aggregate active positions by borrower → exposure (USD), market count and
  // share of the lender's active portfolio.
  const rows = React.useMemo<GridRowsProp<BorrowerExposureRow>>(() => {
    const activePositions = (lenderData?.positions ?? []).filter(
      (position) => position.currentBalance > 0 && position.status !== "Closed",
    )
    const totalExposure = activePositions.reduce(
      (sum, position) => sum + position.currentBalance,
      0,
    )

    const byBorrower = new Map<string, BorrowerExposureRow>()
    activePositions.forEach((position) => {
      const existing = byBorrower.get(position.borrower) ?? {
        id: position.borrower,
        borrower: position.borrower,
        borrowerName: getBorrowerDisplayName(
          position.borrower,
          borrowers ?? [],
          "name",
        ),
        marketCount: 0,
        exposure: 0,
        share: 0,
        button: "View",
      }

      existing.marketCount += 1
      existing.exposure += position.currentBalance
      byBorrower.set(position.borrower, existing)
    })

    return Array.from(byBorrower.values())
      .map((row) => ({
        ...row,
        share: totalExposure > 0 ? (row.exposure / totalExposure) * 100 : 0,
      }))
      .sort((left, right) => right.exposure - left.exposure)
  }, [lenderData?.positions, borrowers])

  const columns: TypeSafeColDef<BorrowerExposureRow>[] = [
    {
      field: "borrower",
      headerName: "Borrower",
      flex: 1,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: ({ row }) => (
        <Box
          component={Link}
          href={buildBorrowerProfileHref(row.borrower, chainId)}
          prefetch={false}
          sx={{
            ...ProfileHealthRowLinkStretchedSx,
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <BorrowerProfileChip borrower={row.borrowerName ?? row.borrower} />
        </Box>
      ),
    },
    {
      field: "marketCount",
      headerName: "Markets",
      minWidth: 110,
      flex: 1,
      align: "right",
      headerAlign: "right",
    },
    {
      field: "exposure",
      headerName: "Exposure",
      minWidth: 140,
      flex: 1,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => formatUsd(value as number, { compact: true }),
    },
    {
      field: "share",
      headerName: "Portfolio share",
      flex: 2,
      minWidth: 240,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: ({ value }) => <ConcentrationCell share={value as number} />,
    },
    {
      field: "button",
      sortable: false,
      headerName: "",
      minWidth: 140,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <Button
          variant="contained"
          color="secondary"
          size="small"
          component={Link}
          href={buildBorrowerProfileHref(params.row.borrower, chainId)}
          sx={{ textDecoration: "none", display: "flex" }}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <Box sx={ProfileHealthTableScrollSx}>
      <DataGrid
        disableVirtualization
        sx={ProfileHealthClickableGridSx}
        rowHeight={66}
        rows={rows}
        columns={columns}
        columnHeaderHeight={40}
      />
    </Box>
  )
}
