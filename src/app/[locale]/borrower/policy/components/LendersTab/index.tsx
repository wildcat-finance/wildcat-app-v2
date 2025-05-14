import React, { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  IconButton,
  InputAdornment,
  Skeleton,
  SvgIcon,
  TextField,
} from "@mui/material"
import { match, P } from "ts-pattern"

import { useSubmitUpdates } from "@/app/[locale]/borrower/policy/hooks/useSubmitUpdates"
import useTrackPolicyLendersChanges from "@/app/[locale]/borrower/policy/hooks/useTrackLendersChanges"
import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"

import { EditLendersTable } from "./components/EditLendersTable"
import { AddModal } from "./components/Modals/AddModal"
import { ConfirmModal } from "./components/Modals/ConfirmModal"
import { FinalModal } from "./components/Modals/FinalModal"
import { EditLenderFlowStatuses, LendersTabProps } from "./interface"

export const LendersTab = ({
  isLoading,
  policyName,
  policy,
  controller,
}: LendersTabProps) => {
  const initialLendersList = useAppSelector(
    (state) => state.policyLenders.initialLenders,
  )
  const lendersList = useAppSelector((state) => state.policyLenders.lenders)

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const [lendersFilter, setLendersFilter] = useState<string>("")

  const handleChangeLendersFilter = (evt: ChangeEvent<HTMLInputElement>) => {
    setLendersFilter(evt.target.value)
  }

  const handleClickErase = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    setLendersFilter("")
  }

  const filteredLenders = lendersList
    .filter(
      (lender) =>
        (lendersNames[lender.address.toLowerCase()] || lender.address)
          .toLowerCase()
          .includes(lendersFilter.toLowerCase()) ||
        lender.address.toLowerCase().includes(lendersFilter.toLowerCase()),
    )
    .filter((lender) => lender.isAuthorized && EditLenderFlowStatuses.OLD)

  const { isLendersHaveChanges } = useTrackPolicyLendersChanges(
    initialLendersList,
    lendersList,
  )

  const { submitUpdates, isSubmitting, isSuccess, isError } = useSubmitUpdates(
    policy ?? controller,
  )

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  const handleClickSubmit = () => {
    const newLenders = lendersList.filter(
      (lender) => lender.status === EditLenderFlowStatuses.NEW,
    )
    const removedLenders = lendersList.filter(
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

  useEffect(() => {
    setIsConfirmModalOpen(false)
  }, [isSubmitting])

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
          <AddModal disabled={isLoading || isSubmitting} />

          <ConfirmModal
            open={isConfirmModalOpen}
            setIsOpen={setIsConfirmModalOpen}
            policyName={policyName}
            disableConfirm={!isLendersHaveChanges || isLoading || isSubmitting}
            handleClickSubmit={handleClickSubmit}
          />
        </Box>
      </Box>

      {match({ isLoading, isSubmitting })
        .with({ isLoading: false, isSubmitting: false }, () => (
          <EditLendersTable
            filteredLenders={filteredLenders}
            isFiltered={!!lendersFilter}
          />
        ))
        .with(
          { isLoading: true, isSubmitting: P.any },
          { isLoading: P.any, isSubmitting: true },
          () => (
            <Box
              display="flex"
              flexDirection="column"
              padding="32px 16px"
              rowGap="8px"
            >
              <Skeleton
                height="52px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
              <Skeleton
                height="52px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
              <Skeleton
                height="52px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
              <Skeleton
                height="52px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            </Box>
          ),
        )
        .otherwise(() => null)}

      <FinalModal
        isLoading={isSubmitting}
        isSuccess={isSuccess}
        isError={isError}
        handleTryAgain={handleClickSubmit}
      />
    </Box>
  )
}
