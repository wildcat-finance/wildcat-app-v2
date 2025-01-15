import React, { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  SvgIcon,
  TextField,
} from "@mui/material"
import { MarketController } from "@wildcatfi/wildcat-sdk"
import { HooksInstance } from "@wildcatfi/wildcat-sdk/dist/access"
import { useTranslation } from "react-i18next"

import { useSubmitUpdates } from "@/app/[locale]/borrower/edit-policy/hooks/useSubmitUpdates"
import { ConfirmModal } from "@/app/[locale]/borrower/policy/compoents/ConfirmModal"
import useTrackPolicyLendersChanges from "@/app/[locale]/borrower/policy/hooks/useTrackLendersChanges"
import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

import { AddModal } from "../AddModal"
import { EditLendersTable } from "../EditLendersTable"

export enum EditLenderFlowStatuses {
  OLD = "old",
  NEW = "new",
  DELETED = "deleted",
}

export type LendersItem = {
  id: string
  address: string
  status: EditLenderFlowStatuses
  isAuthorized: boolean
}

export type LendersTabProps = {
  lenders: LendersItem[]
  policyName?: string
  isLoading: boolean
  policy?: HooksInstance
  controller?: MarketController
}

export const LendersTab = ({
  lenders,
  isLoading,
  policyName,
  policy,
  controller,
}: LendersTabProps) => {
  const { t } = useTranslation()

  const [lendersList, setLendersList] = useState<LendersItem[]>([])
  const [initialLendersList, setInitialLendersList] = useState<LendersItem[]>(
    [],
  )
  const [lendersFilter, setLendersFilter] = useState<string>("")

  const { submitUpdates, isSubmitting, isSuccess } = useSubmitUpdates(
    policy ?? controller,
  )

  useEffect(() => {
    setLendersList(lenders)
    setInitialLendersList(lenders)
  }, [isLoading])

  const { isLendersHaveChanges, addedOrModifiedLenders } =
    useTrackPolicyLendersChanges(initialLendersList, lendersList)

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const filteredLenders = lendersList
    .filter(
      (lender) =>
        (lendersNames[lender.address.toLowerCase()] || lender.address)
          .toLowerCase()
          .includes(lendersFilter.toLowerCase()) ||
        lender.address.toLowerCase().includes(lendersFilter.toLowerCase()),
    )
    .filter((lender) => lender.isAuthorized && EditLenderFlowStatuses.OLD)

  const handleChangeLendersFilter = (evt: ChangeEvent<HTMLInputElement>) => {
    setLendersFilter(evt.target.value)
  }

  const handleClickErase = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    setLendersFilter("")
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          margin: "28px 0 14px",
        }}
      >
        <TextField
          value={lendersFilter}
          onChange={handleChangeLendersFilter}
          size="small"
          placeholder="Search"
          sx={{
            width: "220px",

            "& .MuiInputBase-root": {
              paddingRight: "8px",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SvgIcon
                  fontSize="small"
                  sx={{
                    width: "20px",
                    "& path": { fill: `${COLORS.greySuit}` },
                  }}
                >
                  <Search />
                </SvgIcon>
              </InputAdornment>
            ),
            endAdornment: lendersFilter ? (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClickErase}
                  disableRipple
                  sx={{
                    padding: "0 2px 0 0",
                    "& path": {
                      fill: `${COLORS.greySuit}`,
                      transition: "fill 0.2s",
                    },
                    "& :hover": {
                      "& path": { fill: `${COLORS.santasGrey}` },
                    },
                  }}
                >
                  <SvgIcon fontSize="small">
                    <Cross />
                  </SvgIcon>
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Box sx={{ display: "flex", gap: "6px" }}>
          <AddModal lenders={lendersList} setLenders={setLendersList} />

          <ConfirmModal
            policyName={policyName}
            lenders={lendersList}
            disableConfirm={!isLendersHaveChanges}
            submitUpdates={submitUpdates}
          />
        </Box>
      </Box>

      {!isLoading && !isSubmitting && (
        <EditLendersTable
          lenders={filteredLenders}
          setLenders={setLendersList}
        />
      )}
    </Box>
  )
}
