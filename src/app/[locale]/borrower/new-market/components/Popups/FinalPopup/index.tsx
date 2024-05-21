import {
  Box,
  Button,
  Dialog,
  IconButton,
  SvgIcon,
  Typography,
} from "@mui/material"

import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"

import {
  FinalButtonContainer,
  FinalCloseButtonIcon,
  FinalContentContainer,
  FinalDialogContainer,
  FinalSubtitle,
  FinalTitleContainer,
  FinalTypoBox,
} from "./style"
import { FinalPopupProps } from "./type"

export const FinalPopup = ({ variant, open, handleClose }: FinalPopupProps) => (
  <Dialog open={open} onClose={handleClose} sx={FinalDialogContainer}>
    <Box sx={FinalTitleContainer}>
      <Box width="20px" height="20px" />
      <IconButton disableRipple onClick={handleClose}>
        <SvgIcon fontSize="big" sx={FinalCloseButtonIcon}>
          <Cross />
        </SvgIcon>
      </IconButton>
    </Box>

    <Box sx={FinalContentContainer}>
      <SvgIcon fontSize="colossal">
        {variant === "success" ? <CircledCheckBlue /> : <CircledCrossRed />}
      </SvgIcon>

      <Box sx={FinalTypoBox}>
        <Typography variant="title3">
          {variant === "success"
            ? "Market was created"
            : "Oops! Something goes wrong"}
        </Typography>
        <Typography variant="text3" sx={FinalSubtitle}>
          {variant === "success"
            ? "Market successfully created. You can onboard Lenders and borrow money now."
            : "Explanatory message about the problem."}
        </Typography>
      </Box>
    </Box>
    <Box sx={FinalButtonContainer}>
      <Button variant="contained" color="secondary" size="large" fullWidth>
        {variant === "success"
          ? "View and download MLA"
          : "Back to review step"}
      </Button>
      <Button variant="contained" size="large" fullWidth>
        {variant === "error" ? "Go to the Market" : "Try Again"}
      </Button>
    </Box>
  </Dialog>
)
