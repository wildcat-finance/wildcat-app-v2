import * as React from "react"

import { Box, Button, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import Cross from "@/assets/icons/cross_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { EditLendersTableProps } from "./interface"
import { AddedDot, EditLendersTableStyles, UndoButton } from "./style"
import { TableLenderSelect } from "../MarketSelect/TableLenderSelect"

export const EditLendersTable = ({
  lendersRows,
  setLendersRows,
  setLendersNames,
  borrowerMarkets,
}: EditLendersTableProps) => {
  const columns: GridColDef[] = [
    {
      field: "name",
      disableColumnMenu: true,
      headerName: "Name",
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <>
          {params.row.status === "deleted" && (
            <Typography
              color={COLORS.santasGrey}
              variant="text3"
              sx={{ textDecoration: "line-through" }}
            >
              {params.value.name === "" ? "Add name" : params.value.name}
            </Typography>
          )}
          {params.row.status === "new" && (
            <>
              <Box sx={AddedDot} />
              <LenderName
                setLendersName={setLendersNames}
                lenderName={params.value.name}
                address={params.value.address}
              />
            </>
          )}
          {params.row.status === "old" && (
            <LenderName
              setLendersName={setLendersNames}
              lenderName={params.value.name}
              address={params.value.address}
            />
          )}
        </>
      ),
      flex: 1.5,
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
      flex: 2,
    },
    {
      field: "assignedAll",
      disableColumnMenu: true,
      headerName: "Assigned to All",
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <ExtendedCheckbox
          sx={{
            "& ::before": {
              transform: "translate(-3px, -3px) scale(0.75)",
            },
          }}
        />
      ),
      flex: 1,
    },
    {
      sortable: true,
      field: "markets",
      headerName: "Assigned to Markets",
      minWidth: 250,
      maxWidth: 300,
      headerAlign: "left",
      align: "left",
      flex: 5,
      renderCell: (params) => (
        <TableLenderSelect
          lenderMarkets={params.value}
          lenderAddress={params.row.address}
          borrowerMarkets={borrowerMarkets}
          setLendersRows={setLendersRows}
          disabled={params.row.status === "deleted"}
        />
      ),
    },
    {
      sortable: false,
      field: "",
      align: "right",
      flex: 0.0001,
      renderCell: (params) => (
        <>
          {(params.row.status === "old" || params.row.status === "new") && (
            <IconButton
              onClick={() => {
                setLendersRows((prev) =>
                  prev.map((item) => {
                    if (item.address === params.row.address) {
                      return {
                        ...item,
                        prevStatus: item.status,
                        status: "deleted",
                      }
                    }
                    return item
                  }),
                )
              }}
            >
              <SvgIcon
                fontSize="small"
                sx={{
                  "& path": { fill: `${COLORS.greySuit}` },
                }}
              >
                <Cross />
              </SvgIcon>
            </IconButton>
          )}
          {params.row.status === "deleted" && (
            <Button
              sx={UndoButton}
              variant="text"
              onClick={() => {
                setLendersRows((prev) =>
                  prev.map((item) => {
                    if (item.address === params.row.address) {
                      return { ...item, status: item.prevStatus || "old" }
                    }
                    return item
                  }),
                )
              }}
            >
              Undo
            </Button>
          )}
        </>
      ),
    },
  ]

  return (
    <DataGrid
      sx={EditLendersTableStyles}
      getRowHeight={() => "auto"}
      rows={lendersRows}
      columns={columns}
    />
  )
}
