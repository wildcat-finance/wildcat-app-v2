import * as React from "react"

import { Box, Button, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"

import { UndoButton } from "@/app/[locale]/borrower/edit-lenders/components/EditLendersTable/style"
import { TableSelect } from "@/app/[locale]/borrower/edit-lenders-list/components/EditLendersForm/EditLendersTable/TableSelect"
import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLendersTableData } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { EditLenderFlowStatuses, MarketTableDataType } from "../../../interface"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type EditLendersTableModel = {
  id: string
  name: string
  address: string
  markets: MarketTableDataType[]
  delete: string
}

export const EditLendersTable = () => {
  const dispatch = useAppDispatch()

  const lendersTableData = useAppSelector(
    (state) => state.editLendersList.lendersTableData,
  )

  const lenderNameOrAddress = useAppSelector(
    (state) => state.editLendersList.lenderFilter,
  )

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const filteredLenders = lendersTableData.filter(
    (lender) =>
      (lendersNames[lender.address.toLowerCase()] || lender.address)
        .toLowerCase()
        .includes(lenderNameOrAddress.toLowerCase()) ||
      lender.address.toLowerCase().includes(lenderNameOrAddress.toLowerCase()),
  )

  const handleDeleteLender = (
    lenderAddress: string,
    lenderStatus: EditLenderFlowStatuses,
  ) => {
    if (lenderStatus === EditLenderFlowStatuses.NEW) {
      dispatch(
        setLendersTableData(
          lendersTableData.filter((lender) => lender.address !== lenderAddress),
        ),
      )
    } else {
      dispatch(
        setLendersTableData(
          lendersTableData.map((lender) => {
            if (lender.address === lenderAddress) {
              return {
                ...lender,
                markets: lender.markets
                  .filter(
                    (market) => market.status !== EditLenderFlowStatuses.NEW,
                  )
                  .map((market) => ({
                    ...market,
                    status: EditLenderFlowStatuses.DELETED,
                  })),
                status: EditLenderFlowStatuses.DELETED,
              }
            }
            return lender
          }),
        ),
      )
    }
  }

  const handleRestoreLender = (lenderAddress: string) => {
    dispatch(
      setLendersTableData(
        lendersTableData.map((lender) => {
          if (lender.address === lenderAddress) {
            return {
              ...lender,
              markets: lender.markets
                .filter(
                  (market) => market.status !== EditLenderFlowStatuses.NEW,
                )
                .map((market) => ({
                  ...market,
                  status: EditLenderFlowStatuses.OLD,
                })),
              status: EditLenderFlowStatuses.OLD,
            }
          }
          return lender
        }),
      ),
    )
  }

  const columns: TypeSafeColDef<EditLendersTableModel>[] = [
    {
      field: "name",
      headerName: "Name",
      disableColumnMenu: true,
      minWidth: 170,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <>
          {params.row.status === EditLenderFlowStatuses.DELETED && (
            <Typography
              color={COLORS.santasGrey}
              variant="text3"
              sx={{ textDecoration: "line-through" }}
            >
              {lendersNames[params.row.address.toLowerCase()] ===
              ("" || undefined)
                ? "Add name"
                : lendersNames[params.row.address.toLowerCase()]}
            </Typography>
          )}
          {params.row.status === EditLenderFlowStatuses.NEW && (
            <>
              <Box
                sx={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  marginRight: "4px",
                  backgroundColor: COLORS.ultramarineBlue,
                }}
              />
              <LenderName address={params.row.address} />
            </>
          )}
          {params.row.status === EditLenderFlowStatuses.OLD && (
            <LenderName address={params.row.address} />
          )}
        </>
      ),
    },
    {
      field: "address",
      headerName: "Wallet Address",
      disableColumnMenu: true,
      minWidth: 180,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box display="flex" gap="4px">
          <Typography
            sx={{
              minWidth: "80px",
              textDecoration:
                params.row.status === EditLenderFlowStatuses.DELETED
                  ? "line-through"
                  : "",
              color:
                params.row.status === EditLenderFlowStatuses.DELETED
                  ? COLORS.santasGrey
                  : "",
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
    },
    {
      field: "markets",
      headerName: "Assigned to Markets",
      disableColumnMenu: true,
      minWidth: 250,
      flex: 9,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <TableSelect
          lenderAddress={params.row.address}
          lenderStatus={params.row.status}
          lenderMarkets={params.value}
        />
      ),
    },
    {
      field: "delete",
      headerName: "",
      disableColumnMenu: true,
      flex: 0.0001,
      align: "right",
      renderCell: (params) => (
        <>
          {(params.row.status === EditLenderFlowStatuses.OLD ||
            params.row.status === EditLenderFlowStatuses.NEW) && (
            <IconButton
              sx={{ marginRight: "5px" }}
              onClick={() =>
                handleDeleteLender(params.row.address, params.row.status)
              }
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
          {params.row.status === EditLenderFlowStatuses.DELETED && (
            <Button
              sx={UndoButton}
              variant="text"
              onClick={() => handleRestoreLender(params.row.address)}
            >
              Undo
            </Button>
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <DataGrid
        columns={columns}
        rows={filteredLenders}
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
        disableColumnSorting
      />
      <Box />
    </>
  )
}
