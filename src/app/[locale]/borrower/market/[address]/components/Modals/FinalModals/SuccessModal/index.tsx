import { Box, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"

import {
  FinalModalCloseButton,
  FinalModalContentContainer,
  FinalModalHeader,
  FinalModalMainContainer,
  FinalModalSubtitle,
  FinalModalTypoBox,
} from "../style"

export const SuccessModal = ({ onClose }: { onClose: () => void }) => (
  <>
    <Box sx={FinalModalHeader}>
      <Box width="20px" height="20px" />
      <IconButton disableRipple onClick={onClose}>
        <SvgIcon fontSize="big" sx={FinalModalCloseButton}>
          <Cross />
        </SvgIcon>
      </IconButton>
    </Box>

    <Box padding="0 24px" sx={FinalModalContentContainer}>
      <Box margin="auto" sx={FinalModalMainContainer}>
        <SvgIcon fontSize="colossal">
          <CircledCheckBlue />
        </SvgIcon>

        <Box sx={FinalModalTypoBox}>
          <Typography variant="title3">Success!</Typography>
          <Typography variant="text3" sx={FinalModalSubtitle}>
            You can close the window.
          </Typography>
        </Box>
      </Box>
    </Box>
  </>
)
