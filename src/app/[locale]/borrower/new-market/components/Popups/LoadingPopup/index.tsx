import { Box, Dialog, IconButton, SvgIcon, Typography } from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import { COLORS } from "@/theme/colors"

import {
  CloseButtonIcon,
  LoadingContentContainer,
  LoadingDialogContainer,
  LoadingSubtitle,
  LoadingTypoBox,
  TitleContainer,
} from "./style"
import { LoadingPopupProps } from "./type"

export const LoadingPopup = ({ open, handleClose }: LoadingPopupProps) => (
  <Dialog open={open} onClose={handleClose} sx={LoadingDialogContainer}>
    <Box sx={TitleContainer}>
      <Box width="20px" height="20px" />
      <IconButton disableRipple onClick={handleClose}>
        <SvgIcon fontSize="big" sx={CloseButtonIcon}>
          <Cross />
        </SvgIcon>
      </IconButton>
    </Box>

    <Box sx={LoadingContentContainer}>
      <Box width="40px" height="40px" bgcolor={COLORS.santasGrey} />

      <Box sx={LoadingTypoBox}>
        <Typography variant="text1">Just wait a bit...</Typography>
        <Typography variant="text3" sx={LoadingSubtitle}>
          Transaction in process. You can close the window.
        </Typography>
      </Box>
    </Box>
  </Dialog>
)
