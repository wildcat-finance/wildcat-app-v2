import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { MobileMarketList } from "@/components/Mobile/MobileMarketList"
import { analyticsDataGridSx } from "@/components/Profile/shared/AnalyticsDataGrid"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import {
  percentComparator,
  statusComparator,
  typeComparator,
} from "@/utils/comparators"
import {
  buildMarketHref,
  formatSecsToHours,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { MarketsBlockProps } from "./interface"
import { LinkCell } from "./style"

export const MarketsBlock = ({ markets, isLoading }: MarketsBlockProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

  const pathname = usePathname()
  const marketLink = pathname.includes(ROUTES.borrower.profile)
    ? ROUTES.borrower.market
    : ROUTES.lender.market

  const rows: GridRowsProp = (markets ?? [])
    .filter((market) => !market.isClosed)
    .map((market) => {
      const {
        address,
        name,
        underlyingToken,
        annualInterestBips,
        totalDebts,
        maxTotalSupply,
        totalSupply,
        withdrawalBatchDuration,
        chainId,
      } = market

      const marketStatus = getMarketStatusChip(market)

      return {
        id: address,
        chainId,
        name,
        status: marketStatus,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        term: getMarketTypeChip(market),
        debt: totalDebts,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        withdrawalBatchDuration,
      }
    })

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: t("borrowerProfile.profile.activeMarkets.table.name"),
      flex: 2,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(params.row.id, params.row.chainId, marketLink)}
          style={{
            ...LinkCell,
            paddingRight: "16px",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "6px",
            minWidth: 0,
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
        </Link>
      ),
    },
    {
      field: "status",
      headerName: t("borrowerProfile.profile.activeMarkets.table.status"),
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(params.row.id, params.row.chainId, marketLink)}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box width="120px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "term",
      headerName: t("borrowerProfile.profile.activeMarkets.table.term"),
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: typeComparator,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(params.row.id, params.row.chainId, marketLink)}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box minWidth="170px">
            <MarketTypeChip type="table" {...params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: t("borrowerProfile.profile.activeMarkets.table.asset"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(params.row.id, params.row.chainId, marketLink)}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
          <Typography variant="text3">{params.value}</Typography>
        </Link>
      ),
    },
    {
      field: "withdrawalBatchDuration",
      headerName: t("dashboard.markets.tables.header.withdrawal"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(params.row.id, params.row.chainId, marketLink)}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
          <Typography variant="text3">
            {formatSecsToHours(params.value, true)}
          </Typography>
        </Link>
      ),
    },
    {
      field: "apr",
      headerName: t("borrowerProfile.profile.activeMarkets.table.apr"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: percentComparator,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(params.row.id, params.row.chainId, marketLink)}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          <Typography variant="text3">{`${params.value / 100}%`}</Typography>
        </Link>
      ),
    },
    {
      field: "debt",
      headerName: t("borrowerProfile.profile.activeMarkets.table.debt"),
      flex: 1,
      minWidth: 100,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(params.row.id, params.row.chainId, marketLink)}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          <Typography variant="text3">
            {params.value
              ? formatTokenWithCommas(params.value, {
                  withSymbol: false,
                  fractionDigits: 2,
                })
              : "0"}
          </Typography>
        </Link>
      ),
    },
  ]

  if (isMobile) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return <MobileMarketList markets={rows} isLoading={isLoading} />
  }

  return (
    <Box marginTop="24px" marginBottom="20px">
      <DataGrid
        autoHeight
        getRowHeight={() => "auto"}
        hideFooter
        disableColumnMenu
        disableRowSelectionOnClick
        sx={{
          ...analyticsDataGridSx,
          marginTop: "12px",
          minWidth: 980,
        }}
        rows={rows}
        columns={columns}
      />
    </Box>
  )
}
