import { Box, Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import BackArrow from "@/assets/icons/backArrow_icon.svg"
import {
  ContentContainer,
  MenuItemButton,
  MenuItemButtonSelected,
} from "@/components/Sidebar/style"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setEditStep } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"

export const LenderListSidebar = () => {
  const { t } = useTranslation()
  const router = useRouter()

  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.editLendersList.step)

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
        {t("lenderMarketList.sidebar.back")}
      </Button>
      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button
          variant="text"
          size="medium"
          sx={step === "edit" ? MenuItemButtonSelected : MenuItemButton}
          // onClick={handleClickEdit}
        >
          {t("lenderMarketList.sidebar.editingLenders")}
        </Button>

        <Button
          variant="text"
          size="medium"
          sx={step === "confirm" ? MenuItemButtonSelected : MenuItemButton}
          // onClick={handleClickConfirm}
        >
          {t("lenderMarketList.sidebar.confirm")}
        </Button>
      </Box>
    </Box>
  )
}
