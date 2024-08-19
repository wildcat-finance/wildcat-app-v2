import * as React from "react"
import { useState } from "react"

import { Button, SvgIcon, Typography } from "@mui/material"
import { Box } from "@mui/system"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useMarketsForBorrower } from "@/app/[locale]/borrower/hooks/useMarketsForBorrower"
import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import Cross from "@/assets/icons/cross_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { EditLendersTableProps } from "./interface"
import { MarketWithdrawalRequetstCell, NewLenderDot } from "./style"
import { LenderMarketSelect } from "../LenderMarketSelect"

export const EditLendersTable = ({
  rows,
  setRows,
  setLendersName,
}: EditLendersTableProps) => {
  const { t } = useTranslation()

  const { data: allMarkets, isLoading } = useMarketsForBorrower()
  const { address, isConnected } = useAccount()

  const activeBorrowerMarketsNames = allMarkets
    ?.filter(
      (market) =>
        market.borrower.toLowerCase() === address?.toLowerCase() &&
        !market.isClosed,
    )
    .map((market) => market.name)

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
          {params.row.status === "remove" && (
            <Typography
              color={COLORS.santasGrey}
              variant="text4"
              sx={{ textDecoration: "line-through" }}
            >
              {params.value.name === "" ? "Add name" : params.value.name}
            </Typography>
          )}
          {params.row.status === "new" && (
            <>
              <Box sx={NewLenderDot} />
              <LenderName
                setLendersName={setLendersName}
                lenderName={params.value.name}
                address={params.value.address}
              />
            </>
          )}
          {params.row.status === "old" && (
            <LenderName
              setLendersName={setLendersName}
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
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography
            sx={{
              minWidth: "80px",
              textDecoration:
                params.row.status === "remove" ? "line-through" : "",
              color: params.row.status === "remove" ? COLORS.santasGrey : "",
            }}
            variant={params.row.status === "remove" ? "text4" : "text3"}
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
      flex: 4,
      display: "flex",
      renderCell: (params) => (
        <LenderMarketSelect
          lenderAddress={params.row.address}
          setRows={setRows}
          chosenMarkets={
            rows
              .find((item) => item.address === params.row.address)
              ?.markets.map((market) => market) || []
          }
          borrowerMarkets={activeBorrowerMarketsNames || []}
          type="table"
        />
      ),
    },
    {
      sortable: false,
      field: "",
      align: "right",
      // maxWidth: 24,
      renderCell: (params) => (
        <>
          {(params.row.status === "old" || params.row.status === "new") && (
            <Box
              onClick={() => {
                setRows((prev) =>
                  prev.map((item) => {
                    if (item.address === params.row.address)
                      item.status = "remove"
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
            </Box>
          )}
          {params.row.status === "remove" && (
            <Button
              sx={{
                minWidth: "36px",
                padding: 0,
                color: COLORS.ultramarineBlue,
              }}
              variant="text"
              onClick={() => {
                setRows((prev) =>
                  prev.map((item) => {
                    if (item.address === params.row.address) item.status = "old"
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
      sx={{
        "& .MuiDataGrid-cell": {
          minHeight: "52px",
          height: "auto",
          padding: "12px 16px",
        },
        "& .MuiDataGrid-columnHeader": {
          backgroundColor: "transparent",
        },
      }}
      getRowHeight={() => "auto"}
      rows={rows}
      columns={columns}
    />
  )
}
