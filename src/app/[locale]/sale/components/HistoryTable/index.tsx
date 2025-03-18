import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type HistoryTableModel = {
  name: string
  address: string
  id: string
  date: string
  time: string
  timestamp: number
  amount: {
    in: string
    out: string
    asset: string
  }
}

const HistoryTableMock = [
  {
    name: "Wildcat",
    address: "0x41D1ec254a76F9Ac65cD0fA919E11e9F11A07059",
    id: "0x0C353D8A026F8b5D132C621Fd1B848f3e31CE1eF",
    date: "12-Jul-2023",
    time: "12:04:34",
    timestamp: 1742256000,
    amount: {
      in: "135",
      out: "12",
      asset: "USDC",
    },
  },
  {
    name: "Wildcat",
    address: "0x41D1ec254a76F9Ac65cD0fA919E11e9F11A07059",
    id: "0x0C353D8A026F8b5D132C621Fd1B848f3e31CE2eF",
    date: "12-Jul-2023",
    time: "12:04:34",
    timestamp: 1742256000,
    amount: {
      in: "135",
      out: "12",
      asset: "USDC",
    },
  },
  {
    name: "Wildcat",
    address: "0x41D1ec254a76F9Ac65cD0fA919E11e9F11A07059",
    id: "0x0C353D8A026F8b5D132C621Fd1B848f3e31CE3eF",
    date: "12-Jul-2023",
    time: "12:04:34",
    timestamp: 1742256000,
    amount: {
      in: "135",
      out: "12",
      asset: "USDC",
    },
  },
]

export const HistoryTable = () => {
  const rows: GridRowsProp<HistoryTableModel> = HistoryTableMock

  const columns: TypeSafeColDef<HistoryTableModel>[] = [
    {
      field: "name",
      headerName: "Name",
      minWidth: 160,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Typography variant="text3">{params.value}</Typography>

          <LinkGroup
            linkValue={`${EtherscanBaseUrl}/address/${params.row.address}`}
          />
        </Box>
      ),
    },
    {
      field: "id",
      headerName: "Transaction ID",
      minWidth: 200,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Typography variant="text3">{trimAddress(params.value)}</Typography>

          <LinkGroup
            linkValue={`${EtherscanBaseUrl}/transaction/${params.value}`}
            copyValue={params.value}
          />
        </Box>
      ),
    },
    {
      field: "date",
      headerName: "Date",
      minWidth: 96,
      flex: 1,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "timestamp",
      headerName: "Timestamp",
      minWidth: 192,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Typography variant="text3">{params.row.time}</Typography>

          <Typography variant="text3" color={COLORS.santasGrey}>
            .{params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "amount",
      headerName: "Amount In / Amount Out",
      minWidth: 264,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Typography variant="text3">
            {params.value.in} {params.value.asset}
          </Typography>

          <Typography variant="text3">{params.value.out} WLDC</Typography>
        </Box>
      ),
    },
  ]

  return (
    <Box minHeight={510}>
      <DataGrid
        sx={{
          overflow: "auto",
          maxWidth: "calc(100vw - 267px)",
          padding: "0 16px",
          "& .MuiDataGrid-columnHeader": { padding: 0 },
          "& .MuiDataGrid-cell": { padding: "0px" },
        }}
        rows={rows}
        columns={columns}
        columnHeaderHeight={40}
      />
    </Box>
  )
}
