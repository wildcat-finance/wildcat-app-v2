import { Box, Dialog, IconButton, SvgIcon, Typography } from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import { Loader } from "@/components/Loader"

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
      <Loader />

      <Box sx={LoadingTypoBox}>
        <Typography variant="text1">Just wait a bit...</Typography>
        <Typography variant="text3" sx={LoadingSubtitle}>
          Transaction in process. You can close the window.
        </Typography>
      </Box>
    </Box>
  </Dialog>
)
