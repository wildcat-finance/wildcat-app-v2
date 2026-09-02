import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
  MenuItemButtonSelected,
} from "@/components/Sidebar/style"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setEditStep } from "@/store/slices/editLendersListSlice/editLendersListSlice"

export const LenderListSidebar = () => {
  const { t } = useTranslation()

  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.editLendersList.step)

  const handleClickConfirm = () => {
    dispatch(setEditStep("confirm"))
  }

  const handleClickEdit = () => {
    dispatch(setEditStep("edit"))
  }

  return (
    <Box sx={ContentContainer}>
      {/*
        This is a link to the borrower markets page, not a history jump. It
        used to call `router.back()` unconditionally, so opening
        /borrower/edit-lenders-list directly sent the borrower to whatever the
        tab held before, which is the defect issue 32 reported on the lender
        side. The only reliable way into this page is the authorised-lenders
        table on /borrower, so that is where back goes.
      */}
      <BackButton
        title={t("common.buttons.back")}
        link={ROUTES.borrower.root}
      />
      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button
          variant="text"
          size="medium"
          sx={step === "edit" ? MenuItemButtonSelected : MenuItemButton}
          // onClick={handleClickEdit}
        >
          {t("borrower.editLenders.sidebar.editing")}
        </Button>

        <Button
          variant="text"
          size="medium"
          sx={step === "confirm" ? MenuItemButtonSelected : MenuItemButton}
          // onClick={handleClickConfirm}
        >
          {t("common.labels.confirmation")}
        </Button>
      </Box>
    </Box>
  )
}
