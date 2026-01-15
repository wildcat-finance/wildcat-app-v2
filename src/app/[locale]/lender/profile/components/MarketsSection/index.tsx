import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"
import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { ROUTES } from "@/routes"
import {
  percentComparator,
  statusComparator,
  typeComparator,
} from "@/utils/comparators"
import { formatSecsToHours, formatTokenWithCommas } from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { LinkCell } from "./styles"

export const MarketsSection = ({ markets }: { markets?: Market[] }) => {
  const { t } = useTranslation()

  const rows: GridRowsProp = (markets ?? [])
    .filter((market) => !market.isClosed)
    .map((market) => {
      const {
        address,
        name,
        underlyingToken,
        annualInterestBips,
        withdrawalBatchDuration,
      } = market
      const { borrowed } = market.getTotalDebtBreakdown()

      const marketStatus = getMarketStatusChip(market)

      return {
        id: address,
        name,
        status: marketStatus,
        asset: underlyingToken.symbol,
        lenderAPR: annualInterestBips,
        term: getMarketTypeChip(market),
        debt: borrowed.raw.lt(0)
          ? new TokenAmount(BigNumber.from(0), underlyingToken)
          : borrowed,
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
          href={`${ROUTES.lender.market}/${params.row.id}`}
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
          href={`${ROUTES.lender.market}/${params.row.id}`}
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
          href={`${ROUTES.lender.market}/${params.row.id}`}
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
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
          {params.value}
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
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
          {formatSecsToHours(params.value, true)}
        </Link>
      ),
    },
    {
      field: "lenderAPR",
      headerName: t("borrowerProfile.profile.activeMarkets.table.apr"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: percentComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {`${params.value / 100}%`}
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
          href={`${ROUTES.lender.market}/${params.row.id}`}
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
  ]

  return (
    <Box marginBottom="44px">
      <Typography variant="title3">
        {t("borrowerProfile.profile.activeMarkets.title")}
      </Typography>
      <DataGrid
        sx={{
          marginTop: "12px",
          overflow: "auto",
          "& .MuiDataGrid-columnHeader": { padding: 0 },
          "& .MuiDataGrid-cell": { padding: "0px" },
        }}
        rows={rows}
        columns={columns}
      />
    </Box>
  )
}
