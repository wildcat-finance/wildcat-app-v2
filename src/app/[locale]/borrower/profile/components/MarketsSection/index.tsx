import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"
import { Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { COLORS } from "@/theme/colors"
import {
  capacityComparator,
  dateComparator,
  percentComparator,
  statusComparator,
} from "@/utils/comparators"
import {
  formatTokenWithCommas,
  timestampToDateFormatted,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type MarketsSectionProps = {
  markets?: Market[]
}

export const MarketsSection = ({ markets }: MarketsSectionProps) => {
  const { t } = useTranslation()

  const rows: GridRowsProp = (markets ?? [])
    .filter((market) => !market.isClosed)
    .map((market) => {
      const {
        address,
        name,
        underlyingToken,
        annualInterestBips,
        deployedEvent,
        totalBorrowed,
      } = market

      const marketStatus = getMarketStatusChip(market)

      return {
        id: address,
        name,
        status: marketStatus,
        asset: underlyingToken.symbol,
        lenderAPR: annualInterestBips,
        term: getMarketTypeChip(market),
        debt: totalBorrowed,
        kyc: "Added By Borrower",
        deployed: deployedEvent ? deployedEvent.blockTimestamp : 0,
      }
    })

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: t("borrowerMarketList.table.header.marketName"),
      flex: 3,
      minWidth: 208,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "200px",
          }}
        >
          {value}
        </span>
      ),
    },
    {
      field: "status",
      headerName: t("borrowerMarketList.table.header.status"),
      minWidth: 120,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => <MarketStatusChip status={params.value} />,
      flex: 1,
    },
    {
      field: "term",
      headerName: "Term",
      minWidth: 170,
      headerAlign: "left",
      align: "left",
      sortComparator: capacityComparator,
      flex: 2,
      renderCell: (params) => <MarketTypeChip {...params.value} />,
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 95,
      headerAlign: "right",
      align: "right",
      flex: 1,
    },
    {
      field: "lenderAPR",
      headerName: t("borrowerMarketList.table.header.apr"),
      minWidth: 95,
      headerAlign: "right",
      align: "right",
      sortComparator: percentComparator,
      flex: 1,
    },
    {
      field: "debt",
      headerName: "Total Debt",
      minWidth: 110,
      headerAlign: "right",
      align: "right",
      flex: 1.5,
      renderCell: (params) =>
        params.value
          ? formatTokenWithCommas(params.value, {
              withSymbol: false,
              fractionDigits: 2,
            })
          : "0",
    },
  ]

  return (
    <Box marginBottom="44px">
      <Typography variant="title3">Active Markets</Typography>
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
