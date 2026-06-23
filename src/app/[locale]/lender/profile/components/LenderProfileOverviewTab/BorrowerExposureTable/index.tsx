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
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/style"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { TablePagination } from "@/components/TablePagination"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { COLORS } from "@/theme/colors"
import { buildBorrowerProfileHref } from "@/utils/formatters"

import {
  BorrowerExposureRow,
  BorrowerExposureTableProps,
  CONCENTRATION_COPY,
  CONCENTRATION_THRESHOLD,
  TypeSafeColDef,
} from "./interface"

// Shared mini-bar geometry — kept identical to MarketYieldTable so the share
// bars look the same across the two tables.
const MINI_BAR_HEIGHT = "4px"

// Graphic half of "Portfolio share": a single proportional bar, amber once the
// borrower crosses the concentration-risk threshold. Fixed width, right-aligned
// so every row's bar sits at the same x — separate from the numbers, no float.
const ShareBar = ({ share }: { share: number }) => {
  const flagged = share > CONCENTRATION_THRESHOLD
  const barColor = flagged ? COLORS.lemonPie : COLORS.ultramarineBlue

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "50%",
          height: MINI_BAR_HEIGHT,
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
    </Box>
  )
}

// Numeric half of "Portfolio share": the %, with a fixed-width badge slot so the
// number never shifts between flagged and unflagged rows. Left-aligned so it
// sits directly after the bar.
const ShareValue = ({ share }: { share: number }) => {
  const flagged = share > CONCENTRATION_THRESHOLD

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "7px",
        width: "100%",
      }}
    >
      <Typography variant="text3">{formatPercent(share, 1)}</Typography>

      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 10,
    page: 0,
  })

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
        shareBar: 0,
        button: "View",
      }

      existing.marketCount += 1
      existing.exposure += position.currentBalance
      byBorrower.set(position.borrower, existing)
    })

    return Array.from(byBorrower.values())
      .map((row) => {
        const share =
          totalExposure > 0 ? (row.exposure / totalExposure) * 100 : 0

        return { ...row, share, shareBar: share }
      })
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
      flex: 1.5,
      align: "right",
      headerAlign: "right",
    },
    {
      field: "exposure",
      headerName: "Exposure",
      minWidth: 140,
      flex: 1.5,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => formatUsd(value as number, { compact: true }),
    },
    {
      // Graphic column for portfolio share — render-only, no header.
      field: "shareBar",
      headerName: "",
      flex: 3,
      minWidth: 120,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: ({ value }) => <ShareBar share={value as number} />,
    },
    {
      // Numeric column for portfolio share — carries the header. Left-aligned so
      // the % sits right after the bar.
      field: "share",
      headerName: "Portfolio share",
      flex: 0.1,
      minWidth: 80,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: ({ value }) => <ShareValue share={value as number} />,
    },
    {
      field: "button",
      sortable: false,
      headerName: "",
      minWidth: 140,
      flex: 0.5,
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
    <DataGrid
      disableVirtualization
      sx={ProfileHealthClickableGridSx}
      rowHeight={66}
      rows={rows}
      columns={columns}
      columnHeaderHeight={40}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      slots={{ pagination: TablePagination }}
      hideFooter={false}
    />
  )
}
