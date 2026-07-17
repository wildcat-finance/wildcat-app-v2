"use client"

import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import { Market } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { TypeSafeColDef } from "@/app/[locale]/lender/profile/components/interface"
import {
  LenderProfileClickableGridSx,
  LenderProfileLinkCell,
  LenderProfileRowLinkInteractiveSx,
  LenderProfileRowLinkStretchedSx,
} from "@/app/[locale]/lender/profile/components/style"
import HealthyIcon from "@/assets/icons/chipBlueCheck_icon.svg"
import PendingIcon from "@/assets/icons/chipEmptyGrey_icon.svg"
import TerminatedIcon from "@/assets/icons/chipGreyCross_icon.svg"
import PenaltyIcon from "@/assets/icons/chipYellowAlert_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { formatPercent } from "@/components/Profile/shared/analytics"
import { TablePagination } from "@/components/TablePagination"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { statusComparator } from "@/utils/comparators"
import {
  buildMarketHref,
  formatSecsToHours,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { BorrowerMarketHealthRow } from "./interface"
import {
  DebtBarTrackSx,
  marketHealthChipSx,
  MarketHealthChipsRowSx,
} from "./style"

const STATUS_CHIPS: MarketStatus[] = [
  MarketStatus.HEALTHY,
  MarketStatus.DELINQUENT,
  MarketStatus.PENALTY,
  MarketStatus.TERMINATED,
]

// Pre-colored chip icon per status (rendered via `component`, keeping own fills).
const STATUS_ICONS: Record<
  MarketStatus,
  React.FC<React.SVGProps<SVGElement>>
> = {
  [MarketStatus.HEALTHY]: HealthyIcon,
  [MarketStatus.DELINQUENT]: PendingIcon,
  [MarketStatus.PENALTY]: PenaltyIcon,
  [MarketStatus.TERMINATED]: TerminatedIcon,
}

const formatToken = (amount: BorrowerMarketHealthRow["debt"]) =>
  formatTokenWithCommas(amount, { withSymbol: false, fractionDigits: 2 })

export const BorrowerMarketHealthTable = ({
  markets,
}: {
  markets: Market[]
}) => {
  const rows = React.useMemo<GridRowsProp<BorrowerMarketHealthRow>>(
    () =>
      (markets ?? []).map((market) => {
        const capacityRaw = market.maxTotalSupply.raw
        const utilization = capacityRaw.isZero()
          ? 0
          : market.totalDebts.raw.mul(10000).div(capacityRaw).toNumber() / 100
        const remaining = market.maxTotalSupply.gt(market.totalDebts)
          ? market.maxTotalSupply.sub(market.totalDebts)
          : market.maxTotalSupply.sub(market.maxTotalSupply)

        return {
          id: market.address,
          chainId: market.chainId,
          name: market.name,
          status: getMarketStatusChip(market),
          term: getMarketTypeChip(market),
          asset: market.underlyingToken.symbol,
          withdrawalBatchDuration: market.withdrawalBatchDuration,
          apr: market.annualInterestBips,
          debt: market.totalDebts,
          remaining,
          utilization,
          borrow: market.address,
        }
      }),
    [markets],
  )

  const [statusFilter, setStatusFilter] = React.useState<MarketStatus[]>([])
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 10,
    page: 0,
  })

  React.useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }))
  }, [statusFilter])

  const statusCounts = React.useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc[row.status.status] = (acc[row.status.status] ?? 0) + 1
          return acc
        },
        {} as Record<MarketStatus, number>,
      ),
    [rows],
  )

  const filteredRows = React.useMemo(
    () =>
      statusFilter.length
        ? rows.filter((row) => statusFilter.includes(row.status.status))
        : rows,
    [rows, statusFilter],
  )

  const toggleStatus = (status: MarketStatus) =>
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status],
    )

  const columns: TypeSafeColDef<BorrowerMarketHealthRow>[] = [
    {
      field: "name",
      headerName: "Market",
      flex: 1.6,
      minWidth: 220,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box
          component={Link}
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          sx={{
            ...LenderProfileLinkCell,
            ...LenderProfileRowLinkStretchedSx,
            display: "flex",
            paddingRight: "16px",
          }}
        >
          <Typography
            variant="text3"
            sx={{
              display: "block",
              width: "100%",
              minWidth: 0,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status and Term",
      flex: 1,
      minWidth: 180,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "4px",
          }}
        >
          <MarketStatusChip status={params.row.status} withPeriod={false} />
          <MarketTypeChip type="table" {...params.row.term} />
        </Box>
      ),
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 90,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "withdrawalBatchDuration",
      headerName: "Withdrawal",
      minWidth: 110,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Typography variant="text3">
          {formatSecsToHours(value as number, true)}
        </Typography>
      ),
    },
    {
      field: "apr",
      headerName: "Lender APR",
      minWidth: 120,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => {
        const baseApr = formatPercent(params.value / 100)
        const adsComponent = getAdsTooltipComponent(params.row.id, baseApr)
        const adsCellProps = getAdsCellProps(params.row.id)

        return (
          <Box
            component={Link}
            href={buildMarketHref(
              params.row.id,
              params.row.chainId,
              ROUTES.borrower.market,
            )}
            tabIndex={-1}
            sx={{
              ...LenderProfileRowLinkInteractiveSx,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <AprChip
              isBonus={!!adsCellProps}
              baseApr={baseApr}
              icons={adsCellProps?.icons}
              adsComponent={adsComponent}
            />
          </Box>
        )
      },
    },
    {
      field: "debt",
      headerName: "Total Debt / Remaining",
      flex: 1.2,
      minWidth: 190,
      headerAlign: "right",
      align: "right",
      sortable: false,
      renderCell: ({ row }) => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "6px",
            paddingTop: "22px",
          }}
        >
          <Box sx={DebtBarTrackSx}>
            <Box
              sx={{
                width: `${Math.max(0, Math.min(100, row.utilization))}%`,
                height: "100%",
                backgroundColor: COLORS.ultramarineBlue,
              }}
            />
          </Box>
          <Typography variant="text4" color={COLORS.santasGrey}>
            {formatToken(row.debt)} / {formatToken(row.remaining)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "borrow",
      headerName: "",
      minWidth: 120,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row }) => (
        <Button
          component={Link}
          href={buildMarketHref(row.id, row.chainId, ROUTES.borrower.market)}
          variant="contained"
          size="small"
          sx={{
            backgroundColor: COLORS.whiteSmoke,
            color: COLORS.blackRock,
            boxShadow: "none",
            "&:hover": {
              backgroundColor: COLORS.athensGrey,
              boxShadow: "none",
            },
          }}
        >
          Borrow
        </Button>
      ),
    },
  ]

  return (
    <Box>
      <Box sx={MarketHealthChipsRowSx}>
        {STATUS_CHIPS.map((status) => (
          <Box
            key={status}
            component="button"
            type="button"
            onClick={() => toggleStatus(status)}
            sx={marketHealthChipSx(statusFilter.includes(status))}
          >
            <SvgIcon
              component={STATUS_ICONS[status]}
              sx={{ fontSize: "16px" }}
            />

            <Typography variant="text4Highlighted">{status}</Typography>

            <Typography variant="text4" color={COLORS.manate}>
              {statusCounts[status] ?? 0}
            </Typography>
          </Box>
        ))}
      </Box>

      <DataGrid
        disableVirtualization
        sx={LenderProfileClickableGridSx}
        rowHeight={66}
        rows={filteredRows}
        columns={columns}
        columnHeaderHeight={40}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        slots={{ pagination: TablePagination }}
        hideFooter={false}
      />
    </Box>
  )
}
