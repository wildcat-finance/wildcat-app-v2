import * as React from "react"

import { Box, Skeleton } from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"
import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import Link from "next/link"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { capacityComparator, statusComparator } from "@/utils/comparators"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { LinkCell } from "../../../components/MarketsTables/style"

export type MarketsTabProps = {
  markets: Market[]
  isLoading: boolean
}

export type MarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  type: ReturnType<typeof getMarketTypeChip>
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
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
      field: "type",
      headerName: "Term",
      minWidth: 170,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: capacityComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {`${formatBps(params.value)}%`}
        </Link>
      ),
    },
  ]

  const rows: GridRowsProp<MarketsTableModel> = markets.map((market) => {
    const { address, name, underlyingToken, annualInterestBips } = market
    const { borrowed } = market.getTotalDebtBreakdown()

    const marketStatus = getMarketStatusChip(market)
    const marketType = getMarketTypeChip(market)

    return {
      id: address,
      status: marketStatus,
      type: marketType,
      name,
      asset: underlyingToken.symbol,
      apr: annualInterestBips,
      debt: borrowed.raw.lt(0)
        ? new TokenAmount(BigNumber.from(0), underlyingToken)
        : borrowed,
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
