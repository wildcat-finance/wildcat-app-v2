import { Box, Button } from "@mui/material"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
  MenuItemButtonSelected,
} from "@/components/Sidebar/style"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setEditStep } from "@/store/slices/editLendersSlice/editLendersSlice"

export const LenderListSidebar = () => {
  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.editLenders.step)

  const handleClickConfirm = () => {
    dispatch(setEditStep("confirm"))
  }

  const handleClickEdit = () => {
    dispatch(setEditStep("edit"))
  }

  return (
    <Box sx={ContentContainer}>
      <BackButton title="Back" />
      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button
          variant="text"
          size="medium"
          sx={step === "edit" ? MenuItemButtonSelected : MenuItemButton}
          onClick={handleClickEdit}
        >
          Editing Lenders List
        </Button>

        <Button
          variant="text"
          size="medium"
          sx={step === "confirm" ? MenuItemButtonSelected : MenuItemButton}
          onClick={handleClickConfirm}
        >
          Confirmation
        </Button>
      </Box>
    </Box>
  )
}
