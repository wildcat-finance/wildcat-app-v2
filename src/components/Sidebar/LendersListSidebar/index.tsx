import { Box, Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useRouter } from "next/navigation"

import BackArrow from "@/assets/icons/backArrow_icon.svg"
import {
  ContentContainer,
  MenuItemButton,
  MenuItemButtonSelected,
} from "@/components/Sidebar/style"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setEditStep } from "@/store/slices/editLendersSlice/editLendersSlice"
import { COLORS } from "@/theme/colors"

export const LenderListSidebar = () => {
  const router = useRouter()

  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.editLenders.step)

  const handleBackClick = () => {
    router.back()
  }

  const handleClickConfirm = () => {
    dispatch(setEditStep("confirm"))
  }

  const handleClickEdit = () => {
    dispatch(setEditStep("edit"))
  }

  return (
    <Box sx={ContentContainer}>
      <Button
        onClick={handleBackClick}
        fullWidth
        variant="text"
        size="medium"
        sx={{
          color: COLORS.santasGrey,
          fontWeight: 500,
          justifyContent: "flex-start",
          marginBottom: "14px",

          "&:hover": {
            "& .MuiSvgIcon-root": {
              "& path": {
                fill: `${COLORS.blackRock08}`,
              },
            },
          },
        }}
      >
        <SvgIcon
          fontSize="small"
          sx={{
            marginRight: "4px",
            "& path": {
              fill: `${COLORS.santasGrey}`,
              transition: "fill 0.2s",
            },
          }}
        >
          <BackArrow />
        </SvgIcon>
        Back
      </Button>
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
