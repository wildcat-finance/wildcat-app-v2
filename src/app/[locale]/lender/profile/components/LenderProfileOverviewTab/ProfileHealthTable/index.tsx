import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import {
  getBorrowerDisplayName,
  useBorrowerNames,
} from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { useLenderInterestBreakdown } from "@/app/[locale]/lender/profile/hooks/useLenderInterestBreakdown"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildBorrowerProfileHref, buildMarketHref } from "@/utils/formatters"
import { MarketStatus } from "@/utils/marketStatus"

import {
  getPositionMarketStatus,
  PortfolioHealthRow,
  ProfileHealthTableProps,
  statusAndTermComparator,
  TypeSafeColDef,
} from "./interface"
import {
  profileHealthChipSx,
  ProfileHealthChipsRowSx,
  ProfileHealthClickableGridSx,
  ProfileHealthLinkCell,
  ProfileHealthRowLinkStretchedSx,
  ProfileHealthRowLinkInteractiveSx,
  ProfileHealthTableScrollSx,
} from "./style"

const STATUS_CHIPS: MarketStatus[] = [
  MarketStatus.HEALTHY,
  MarketStatus.DELINQUENT,
  MarketStatus.PENALTY,
  MarketStatus.TERMINATED,
]

export const ProfileHealthTable = ({
  lenderAddress,
  lenderData,
}: ProfileHealthTableProps) => {
  const { data: borrowers } = useBorrowerNames()
  const { data: interestBreakdown } = useLenderInterestBreakdown({
    lenderAddress,
    marketIds: lenderData?.marketIds ?? [],
    priceMap: lenderData?.priceMap ?? {},
    decimalsMap: lenderData?.decimalsMap ?? {},
  })

  const interestByMarket = interestBreakdown?.byMarket ?? {}

  const rows = React.useMemo<GridRowsProp<PortfolioHealthRow>>(
    () =>
      (lenderData?.positions ?? []).map((position) => {
        const { termEndTime } = position

        return {
          id: position.marketId,
          marketId: position.marketId,
          name: position.marketName,
          borrower: position.borrower,
          borrowerName: getBorrowerDisplayName(
            position.borrower,
            borrowers ?? [],
            "name",
          ),
          status: getPositionMarketStatus(position.status),
          term:
            termEndTime > 0
              ? {
                  kind: HooksKind.FixedTerm,
                  fixedPeriod: termEndTime * 1000 - Date.now(),
                }
              : { kind: HooksKind.OpenTerm },
          asset: position.asset,
          balance: position.currentBalance,
          deposited: position.totalDeposited,
          interest: position.interestEarned,
          inHandUsd: interestByMarket[position.marketId]?.inHandUsd ?? 0,
          apr: position.apr,
          button: position.marketId,
        }
      }),
    [lenderData?.positions, borrowers, interestByMarket],
  )

  const [statusFilter, setStatusFilter] = React.useState<MarketStatus[]>([])

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

  const columns: TypeSafeColDef<PortfolioHealthRow>[] = [
    {
      field: "name",
      headerName: "Market",
      flex: 1.6,
      minWidth: 240,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box
          sx={{
            ...ProfileHealthLinkCell,
            paddingRight: "16px",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "6px",
            minWidth: 0,
          }}
        >
          <Box
            component={Link}
            href={buildMarketHref(
              params.row.marketId,
              undefined,
              ROUTES.lender.market,
            )}
            sx={ProfileHealthRowLinkStretchedSx}
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

          {params.row.borrower ? (
            <Box
              component={Link}
              href={buildBorrowerProfileHref(
                params.row.borrower,
                params.row.chainId,
              )}
              prefetch={false}
              sx={{
                ...ProfileHealthRowLinkInteractiveSx,
                display: "flex",
                textDecoration: "none",
              }}
            >
              <BorrowerProfileChip
                borrower={params.row.borrowerName ?? params.row.borrower}
              />
            </Box>
          ) : (
            <BorrowerProfileChip
              borrower={params.row.borrowerName ?? params.row.borrower}
            />
          )}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status and Term",
      flex: 1,
      minWidth: 170,
      headerAlign: "left",
      align: "left",
      sortComparator: statusAndTermComparator,
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
      minWidth: 80,
    },
    {
      field: "balance",
      headerName: "Balance",
      minWidth: 120,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => formatUsd(value as number, { compact: true }),
    },
    {
      field: "deposited",
      headerName: "Deposited",
      minWidth: 120,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => formatUsd(value as number, { compact: true }),
    },
    {
      field: "interest",
      headerName: "Interest earned",
      minWidth: 140,
      flex: 1,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row }) => (
        <Box sx={{ width: "100%", textAlign: "right" }}>
          <Typography variant="text3" display="block">
            {formatUsd(row.interest, { compact: true })}
          </Typography>

          {row.inHandUsd > 0 && (
            <Typography
              variant="text4"
              color={COLORS.santasGrey}
              display="block"
            >
              {formatUsd(row.inHandUsd, { compact: true })} in hand
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: "apr",
      headerName: "APR",
      minWidth: 110,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        const adsComponent = getAdsTooltipComponent(
          params.row.id,
          formatPercent(params.value),
        )
        const adsCellProps = getAdsCellProps(params.row.id)

        return (
          <Box
            component={Link}
            href={buildMarketHref(params.row.id, undefined)}
            tabIndex={-1}
            sx={{
              ...ProfileHealthRowLinkInteractiveSx,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <AprChip
              isBonus={!!adsCellProps}
              baseApr={formatPercent(params.value)}
              icons={adsCellProps?.icons}
              adsComponent={adsComponent}
            />
          </Box>
        )
      },
    },
    {
      field: "button",
      headerName: "",
      minWidth: 130,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row }) => (
        <Button
          component={Link}
          href={buildMarketHref(row.id, undefined)}
          variant="contained"
          color="secondary"
          size="small"
        >
          Deposit
        </Button>
      ),
    },
  ]

  return (
    <Box>
      <Box sx={ProfileHealthChipsRowSx}>
        {STATUS_CHIPS.map((status) => (
          <Box
            key={status}
            component="button"
            type="button"
            onClick={() => toggleStatus(status)}
            sx={profileHealthChipSx(statusFilter.includes(status))}
          >
            {/* place for icons here */}

            <Typography variant="text4Highlighted">{status}</Typography>

            <Typography variant="text4" color={COLORS.manate}>
              {statusCounts[status] ?? 0}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={ProfileHealthTableScrollSx}>
        <DataGrid
          disableVirtualization
          sx={ProfileHealthClickableGridSx}
          rowHeight={66}
          rows={filteredRows}
          columns={columns}
          columnHeaderHeight={40}
        />
      </Box>
    </Box>
  )
}
