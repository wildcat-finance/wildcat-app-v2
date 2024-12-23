import React from "react"

import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
  MenuItemButtonSelected,
} from "@/components/Sidebar/style"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setTab } from "@/store/slices/borrowerOverviewSlice/borrowerOverviewSlice"
import { BorrowerOverviewTabs } from "@/store/slices/borrowerOverviewSlice/interface"

export const EditPolicySidebar = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.editPolicy.step)

  const handleClickMarkets = () => {
    dispatch(setTab(BorrowerOverviewTabs.MARKETS))
  }

  return (
    <Box sx={ContentContainer}>
      <BackButton
        title={t("editPolicy.sidebar.back")}
        onClick={handleClickMarkets}
      />

      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button
          variant="text"
          size="medium"
          sx={step === "edit" ? MenuItemButtonSelected : MenuItemButton}
        >
          {t("editPolicy.sidebar.edit")}
        </Button>
      </Box>
    </Box>
  )
}
