import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"

import { AddedDot } from "@/app/[locale]/borrower/edit_lenders/components/EditLendersTable/style"
import {
  LenderTableT,
  MarketTableT,
} from "@/app/[locale]/borrower/edit_lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export const ConfirmTable = ({
  lendersRows,
  borrowerMarkets,
}: {
  lendersRows: LenderTableT[]
  borrowerMarkets: MarketDataT[]
}) => {
  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const columns: GridColDef[] = [
    {
      field: "name",
      disableColumnMenu: true,
      headerName: "Name",
      minWidth: 160,
      flex: 1.5,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <>
          {params.row.status === "new" && (
            <Box
              sx={{ ...AddedDot, backgroundColor: COLORS.ultramarineBlue }}
            />
          )}
          <Typography
            variant="text3"
            sx={{
              color:
                params.row.status === "deleted"
                  ? COLORS.santasGrey
                  : COLORS.blackRock,
              textDecoration:
                params.row.status === "deleted" ? "line-through" : "none",
            }}
          >
            {lendersName[params.row.address.toLowerCase()] === ("" || undefined)
              ? "Add name"
              : lendersName[params.row.address.toLowerCase()]}
          </Typography>
        </>
      ),
    },
    {
      field: "address",
      headerName: "Wallet Address",
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box display="flex" gap="4px">
          <Typography
            sx={{
              minWidth: "80px",
              textDecoration:
                params.row.status === "deleted" ? "line-through" : "",
              color: params.row.status === "deleted" ? COLORS.santasGrey : "",
            }}
            variant="text3"
          >
            {trimAddress(params.value)}
          </Typography>

          <LinkGroup
            linkValue={`${EtherscanBaseUrl}/address/${params.value}`}
            copyValue={params.value}
          />
        </Box>
      ),
      flex: 1,
    },
    {
      sortable: true,
      field: "markets",
      headerName: "Assigned to Markets",
      minWidth: 250,
      headerAlign: "left",
      align: "left",
      flex: 7,
      renderCell: (params) =>
        params.value.length !== borrowerMarkets.length ? (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              padding: "14px 0",
            }}
          >
            {!(params.row.status === "deleted") &&
              params.value.map((market: MarketTableT) => (
                <LendersMarketChip
                  marketName={market.name}
                  type={market.status}
                  width="fit-content"
                />
              ))}
          </Box>
        ) : (
          <Typography variant="text3">All</Typography>
        ),
    },
  ]

  return (
    <DataGrid
      sx={{
        "& .MuiDataGrid-cell": {
          minHeight: "52px",
          height: "auto",
          padding: "12px 8px",
          cursor: "default",
        },

        "& .MuiDataGrid-columnHeader": {
          backgroundColor: "transparent",
          padding: "0 8px",
        },
      }}
      getRowHeight={() => "auto"}
      rows={lendersRows}
      columns={columns}
    />
  )
}
