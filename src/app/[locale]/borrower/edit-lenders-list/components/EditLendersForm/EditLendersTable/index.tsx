import * as React from "react"
import { useState } from "react"

import { Box, Button, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetFilters,
  setLendersTableData,
} from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { TypeSafeColDef, EditLendersTableModel } from "./interface"
import {
  AddedDot,
  EditLendersTableStyles,
  NoLendersBox,
  ResetButtonStyles,
  UndoButton,
} from "./style"
import { TableSelect } from "./TableSelect"
import { EditLenderFlowStatuses } from "../../../interface"
import { DeleteModal } from "../Modals/DeleteModal"

export const EditLendersTable = () => {
  const dispatch = useAppDispatch()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false)
  const [lenderToDelete, setLenderToDelete] = useState<string>("")

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

  const noLenders = filteredLenders.length === 0

  const handleDeleteLender = (
    lenderAddress: string,
    lenderStatus: EditLenderFlowStatuses,
  ) => {
    if (lenderStatus === EditLenderFlowStatuses.NEW) {
      setLenderToDelete(lenderAddress)
      setIsDeleteModalOpen(true)
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
              <Box sx={AddedDot} />
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
      {!noLenders && (
        <DataGrid
          columns={columns}
          rows={filteredLenders}
          sx={EditLendersTableStyles}
          getRowHeight={() => "auto"}
          disableColumnSorting
        />
      )}

      {noLenders && (
        <Box sx={{ height: "100%", display: "flex" }}>
          <Box sx={NoLendersBox}>
            <Typography variant="text3" color={COLORS.santasGrey}>
              No lenders for this filters
            </Typography>
            <Button
              onClick={() => dispatch(resetFilters())}
              size="small"
              variant="text"
              sx={ResetButtonStyles}
            >
              Reset filters
            </Button>
          </Box>
        </Box>
      )}

      <DeleteModal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        lenderAddress={lenderToDelete}
      />
    </>
  )
}
