import * as React from "react"

import { Box, Skeleton } from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"
import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { MarketImplementationChip } from "@/components/@extended/MarketImplementationChip"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  implementationComparator,
  statusComparator,
  typeComparator,
} from "@/utils/comparators"
import {
  buildMarketHref,
  formatBps,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getDisplayLenderAprBips } from "@/utils/marketApr"
import { getMarketImplementationType } from "@/utils/marketImplementation"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { LinkCell } from "../../../components/MarketsTables/style"

export type MarketsTabProps = {
  markets: Market[]
  isLoading: boolean
}

export type MarketsTableModel = {
  id: string
  chainId?: number
  implementationType: ReturnType<typeof getMarketImplementationType>
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  asset: string
  apr: number
  debt?: TokenAmount
}

export const MarketsTab = ({ markets, isLoading }: MarketsTabProps) => {
  const columns: GridColDef[] = [
    {
      field: "status",
      headerName: "Status",
      minWidth: 120,
      flex: 0.7,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box width="130px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "implementationType",
      headerName: "Type",
      minWidth: 130,
      flex: 0.8,
      headerAlign: "left",
      align: "left",
      sortComparator: implementationComparator,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box minWidth="120px">
            <MarketImplementationChip
              implementationType={params.value}
              type="table"
            />
          </Box>
        </Link>
      ),
    },
    {
      field: "term",
      headerName: "Term",
      minWidth: 170,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: typeComparator,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box minWidth="170px">
            <MarketTypeChip {...params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "name",
      headerName: "Market Name",
      flex: 3,
      minWidth: 208,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 95,
      headerAlign: "right",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "debt",
      headerName: "Total Debt",
      minWidth: 110,
      headerAlign: "right",
      align: "right",
      flex: 1.5,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Link>
      ),
    },
    {
      field: "apr",
      headerName: "APR",
      minWidth: 102,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {`${formatBps(params.value)}%`}
        </Link>
      ),
    },
  ]

  const rows: GridRowsProp<MarketsTableModel> = markets.map((market) => {
    const { address, name, underlyingToken } = market
    const { borrowed } = market.getTotalDebtBreakdown()

    const marketStatus = getMarketStatusChip(market)
    const implementationType = getMarketImplementationType(market)
    const term = getMarketTypeChip(market)

    return {
      id: address,
      chainId: market.chainId,
      implementationType,
      status: marketStatus,
      term,
      name,
      asset: underlyingToken.symbol,
      apr: getDisplayLenderAprBips(market),
      debt: borrowed.lt(0) ? underlyingToken.getAmount(0) : borrowed,
    }
  })

  return (
    <Box sx={{ width: "100%" }}>
      {isLoading && (
        <Box
          display="flex"
          flexDirection="column"
          rowGap="8px"
          marginTop="16px"
        >
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
        </Box>
      )}
      {!isLoading && (
        <DataGrid
          sx={{
            overflow: "auto",
            "& .MuiDataGrid-columnHeader": { padding: 0 },
            "& .MuiDataGrid-cell": { padding: "0px" },
          }}
          rows={rows}
          columns={columns}
          columnHeaderHeight={40}
        />
      )}
    </Box>
  )
}
