import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import useTrackLendersChanges from "@/app/[locale]/borrower/edit-policy/hooks/useTrackLendersChanges"
import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "@/app/[locale]/borrower/edit-policy/interface"
import Coins from "@/assets/icons/coins_icon.svg"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setEditStep } from "@/store/slices/editPolicySlice/editPolicySlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import {
  ConfirmLendersFormProps,
  ConfirmLendersTableModel,
  TypeSafeColDef,
} from "./interface"
import {
  AddedDot,
  AlertBox,
  ButtonsBox,
  MarketsBox,
  TableStyles,
} from "./style"
import { useSubmitUpdates } from "../../hooks/useSubmitUpdates"

export const ConfirmLendersForm = ({
  originalPolicyName,
  pendingPolicyName,
  policy,
  controller,
}: ConfirmLendersFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const initialLendersTableData = useAppSelector(
    (state) => state.editPolicy.initialLendersTableData,
  )
  const lendersTableData = useAppSelector(
    (state) => state.editPolicy.lendersTableData,
  )

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const activeBorrowerMarkets = useAppSelector(
    (state) => state.editPolicy.activeBorrowerMarkets,
  )

  const handleClickEdit = () => {
    dispatch(setEditStep("edit"))
  }

  const { submitUpdates, isSubmitting } = useSubmitUpdates(policy ?? controller)

  const { addedOrModifiedLenders } = useTrackLendersChanges(
    initialLendersTableData,
    lendersTableData,
  )

  const handleClickSubmit = () => {
    const newLenders = addedOrModifiedLenders.filter(
      (lender) => lender.status === EditLenderFlowStatuses.NEW,
    )
    const removedLenders = addedOrModifiedLenders.filter(
      (lender) => lender.status === EditLenderFlowStatuses.DELETED,
    )
    const nameUpdated = originalPolicyName !== pendingPolicyName
    let actionIndex = 1
    if (nameUpdated) {
      console.log(
        // eslint-disable-next-line no-plusplus
        `ACTION #${actionIndex++} - Update policy name to ${pendingPolicyName}`,
      )
    }
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
          {params.row.status === "new" && <Box sx={AddedDot} />}
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
            {!lendersName[params.row.address.toLowerCase()]
              ? t("editLendersList.forms.confirm.addName")
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
  ]

  return (
    <Box height="calc(100% - 52px - 43px - 44px)">
      <Box sx={AlertBox}>
        <Coins />
        <Typography variant="text3" color={COLORS.butteredRum}>
          {t("editLendersList.forms.confirm.keepInMind")}{" "}
          <span style={{ fontWeight: 700 }}>
            {t("editLendersList.forms.confirm.payGas")}
          </span>
        </Typography>
      </Box>

      <DataGrid
        sx={TableStyles}
        getRowHeight={() => "auto"}
        rows={addedOrModifiedLenders}
        columns={columns}
      />

      <Box sx={ButtonsBox}>
        <Button
          size="large"
          variant="text"
          onClick={handleClickEdit}
          sx={{ width: "140px" }}
        >
          {t("editLendersList.forms.confirm.back")}
        </Button>

        <Button
          size="large"
          variant="contained"
          sx={{ width: "140px" }}
          onClick={handleClickSubmit}
          disabled={isSubmitting}
        >
          {t("editLendersList.forms.confirm.confirm")}
        </Button>
      </Box>
    </Box>
  )
}
