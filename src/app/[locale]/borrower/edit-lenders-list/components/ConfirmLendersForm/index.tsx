import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"

import { AddedDot } from "@/app/[locale]/borrower/edit-lenders/components/EditLendersTable/style"
import { MarketTableT } from "@/app/[locale]/borrower/edit-lenders/interface"
import useTrackLendersChanges from "@/app/[locale]/borrower/edit-lenders-list/hooks/useTrackLendersChanges"
import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "@/app/[locale]/borrower/edit-lenders-list/interface"
import Coins from "@/assets/icons/coins_icon.svg"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setEditStep } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type ConfirmLendersTableModel = {
  id: string
  name: string
  address: string
  markets: MarketTableDataType[]
}

export const ConfirmLendersForm = () => {
  const dispatch = useAppDispatch()

  const initialLendersTableData = useAppSelector(
    (state) => state.editLendersList.initialLendersTableData,
  )
  const lendersTableData = useAppSelector(
    (state) => state.editLendersList.lendersTableData,
  )

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const activeBorrowerMarkets = useAppSelector(
    (state) => state.editLendersList.activeBorrowerMarkets,
  )

  const handleClickEdit = () => {
    dispatch(setEditStep("edit"))
  }

  const { addedOrModifiedLenders } = useTrackLendersChanges(
    initialLendersTableData,
    lendersTableData,
  )

  const columns: TypeSafeColDef<ConfirmLendersTableModel>[] = [
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
        params.value.filter(
          (market: MarketTableDataType) =>
            market.status !== EditLenderFlowStatuses.DELETED,
        ).length !== activeBorrowerMarkets.length ? (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              padding: "14px 0",
            }}
          >
            {params.value.map((market: MarketTableT) => (
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
    <Box height="calc(100% - 52px - 43px - 44px)">
      <Box
        sx={{
          backgroundColor: COLORS.oasis,
          padding: "12px 16px",
          borderRadius: "12px",
          margin: "25px 0",

          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Coins />
        <Typography variant="text3" color={COLORS.butteredRum}>
          Please, keep in mind that once you submit this request you will be
          required to{" "}
          <span style={{ fontWeight: 700 }}>pay gas to confirm.</span>
        </Typography>
      </Box>

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
        rows={addedOrModifiedLenders}
        columns={columns}
      />

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          paddingTop: "10px",
        }}
      >
        <Button
          size="large"
          variant="text"
          onClick={handleClickEdit}
          sx={{ width: "140px" }}
        >
          Back
        </Button>

        <Button size="large" variant="contained" sx={{ width: "140px" }}>
          Confirm
        </Button>
      </Box>
    </Box>
  )
}
