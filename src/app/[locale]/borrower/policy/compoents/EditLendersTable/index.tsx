import * as React from "react"
import { Dispatch, SetStateAction, useState } from "react"

import { Box, Button, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import {
  EditLenderFlowStatuses,
  LendersItem,
} from "@/app/[locale]/borrower/policy/compoents/LendersTab"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { TypeSafeColDef, EditLendersTableModel } from "./interface"
import {
  AddedDot,
  EditLendersTableStyles,
  NoLendersBox,
  UndoButton,
} from "./style"
import { DeleteModal } from "../DeleteModal"

export type EditLendersTableProps = {
  lenders: LendersItem[]
  setLenders: Dispatch<SetStateAction<LendersItem[]>>
}

export const EditLendersTable = ({
  lenders,
  setLenders,
}: EditLendersTableProps) => {
  const { t } = useTranslation()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false)
  const [lenderToDelete, setLenderToDelete] = useState<string>("")

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const noLenders = lenders.length === 0

  const handleDeleteLender = (
    lenderAddress: string,
    lenderStatus: EditLenderFlowStatuses,
  ) => {
    if (lenderStatus === EditLenderFlowStatuses.NEW) {
      setLenderToDelete(lenderAddress)
      setIsDeleteModalOpen(true)
    } else {
      setLenders(
        lenders.map((lender) => {
          if (lender.address === lenderAddress) {
            return {
              ...lender,
              status: EditLenderFlowStatuses.DELETED,
            }
          }

          return lender
        }),
      )
    }
  }

  const handleRestoreLender = (lenderAddress: string) => {
    setLenders(
      lenders.map((lender) => {
        if (lender.address === lenderAddress) {
          return {
            ...lender,
            status: EditLenderFlowStatuses.OLD,
          }
        }

        return lender
      }),
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
                ? t("editLendersList.forms.edit.table.addName")
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
              {t("editLendersList.forms.edit.table.undo")}
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
          rows={lenders}
          columnHeaderHeight={40}
          sx={EditLendersTableStyles}
          getRowHeight={() => "auto"}
          disableColumnSorting
        />
      )}

      {noLenders && (
        <Box sx={{ height: "100%", display: "flex" }}>
          <Box sx={NoLendersBox}>
            <Typography variant="text3" color={COLORS.santasGrey}>
              {t("editLendersList.forms.edit.table.noLenders")}
            </Typography>
          </Box>
        </Box>
      )}

      <DeleteModal
        lenders={lenders}
        setLenders={setLenders}
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        lenderAddress={lenderToDelete}
      />
    </>
  )
}
