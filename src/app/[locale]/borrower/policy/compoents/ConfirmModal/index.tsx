import * as React from "react"
import { useState } from "react"

import { Box, Button, Dialog, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { UseMutateFunction } from "@tanstack/react-query"
import { MarketController } from "@wildcatfi/wildcat-sdk"
import { HooksInstance } from "@wildcatfi/wildcat-sdk/dist/access"
import { useTranslation } from "react-i18next"

import { useSubmitUpdates } from "@/app/[locale]/borrower/edit-policy/hooks/useSubmitUpdates"
import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import { AddedDot } from "@/app/[locale]/borrower/policy/compoents/EditLendersTable/style"
import {
  EditLenderFlowStatuses,
  LendersItem,
} from "@/app/[locale]/borrower/policy/compoents/LendersTab"
import { SubmitPolicyUpdatesInputs } from "@/app/[locale]/borrower/policy/hooks/useSubmitUpdates"
import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import Coins from "@/assets/icons/coins_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type ConfirmModalProps = {
  lenders: LendersItem[]
  disableConfirm: boolean
  policyName?: string
  submitUpdates: UseMutateFunction<
    void,
    Error,
    SubmitPolicyUpdatesInputs,
    unknown
  >
}

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type EditLendersTableModel = {
  id: string
  name: string
  address: string
  isRemoved: string
}

export const ConfirmModal = ({
  lenders,
  disableConfirm,
  policyName,
  submitUpdates,
}: ConfirmModalProps) => {
  const { t } = useTranslation()

  const [isOpen, setIsOpen] = useState(false)

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const handleClose = () => {
    setIsOpen(false)
  }

  const rows = lenders.filter(
    (lender) => lender.status !== EditLenderFlowStatuses.OLD,
  )

  const columns: TypeSafeColDef<EditLendersTableModel>[] = [
    {
      field: "name",
      headerName: "Name",
      minWidth: 160,
      flex: 0.5,
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
      minWidth: 160,
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
      field: "isRemoved",
      headerName: "",
      disableColumnMenu: true,
      flex: 0.7,
      align: "right",
      renderCell: (params) => (
        <Typography variant="text3" color={COLORS.santasGrey}>
          {params.row.status === EditLenderFlowStatuses.DELETED
            ? "Removed"
            : ""}
        </Typography>
      ),
    },
  ]

  const handleClickSubmit = () => {
    const newLenders = lenders.filter(
      (lender) => lender.status === EditLenderFlowStatuses.NEW,
    )
    const removedLenders = lenders.filter(
      (lender) => lender.status === EditLenderFlowStatuses.DELETED,
    )
    let actionIndex = 1

    if (newLenders.length) {
      console.log(
        // eslint-disable-next-line no-plusplus
        `ACTION #${actionIndex++} - Add ${newLenders.length} new lenders`,
      )
    }
    if (removedLenders.length) {
      console.log(
        // eslint-disable-next-line no-plusplus
        `ACTION #${actionIndex++} - Remove ${removedLenders.length} lenders`,
      )
    }
    submitUpdates({
      addLenders: newLenders.map((l) => l.address),
      removeLenders: removedLenders.map((l) => l.address),
    })
  }

  return (
    <>
      <Button
        disabled={disableConfirm}
        onClick={() => setIsOpen(true)}
        variant="contained"
        size="small"
        sx={{
          height: "32px",
          width: "69px",
          fontSize: "13px",
          lineHeight: "16px",
          fontWeight: 600,
        }}
      >
        {t("editLendersList.forms.edit.submit")}
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        sx={{
          "& .MuiDialog-paper": {
            height: "660px",
            width: "620px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px",

            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
        }}
      >
        <Typography variant="title3">
          Confirm{" "}
          <Typography variant="title3" color={COLORS.ultramarineBlue}>
            {policyName}
          </Typography>{" "}
          Lenders Edits
        </Typography>

        <Box
          sx={{
            backgroundColor: COLORS.oasis,
            padding: "12px 16px",
            borderRadius: "12px",
            margin: "16px 0",

            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <Coins />
          <Typography variant="text3" color={COLORS.butteredRum}>
            {t("editLendersList.forms.confirm.keepInMind")}{" "}
            <span style={{ fontWeight: 700 }}>
              {t("editLendersList.forms.confirm.payGas")}
            </span>
          </Typography>
        </Box>

        <DataGrid
          columns={columns}
          rows={rows}
          columnHeaderHeight={40}
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

              "& .MuiDataGrid-columnHeaderTitleContainer": {
                margin: 0,
              },
            },
          }}
          getRowHeight={() => "auto"}
          disableColumnSorting
        />

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button
            onClick={handleClose}
            variant="text"
            size="large"
            sx={{
              gap: "6px",
              "&:hover": {
                "& .MuiSvgIcon-root": {
                  "& path": {
                    fill: COLORS.blackRock08,
                  },
                },
              },
            }}
          >
            <SvgIcon>
              <Arrow />
            </SvgIcon>
            Back
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleClickSubmit}
            sx={{ width: "144px" }}
          >
            Confirm
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
