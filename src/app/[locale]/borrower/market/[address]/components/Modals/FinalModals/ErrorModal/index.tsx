import { Box, Button, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"

import {
  FinalModalCloseButton,
  FinalModalContentContainer,
  FinalModalHeader,
  FinalModalMainContainer,
  FinalModalSubtitle,
  FinalModalTypoBox,
} from "../style"

export const ErrorModal = ({
  onTryAgain,
  onClose,
}: {
  onTryAgain: () => void
  onClose: () => void
}) => (
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
          <CircledCrossRed />
        </SvgIcon>

        <Box sx={FinalModalTypoBox}>
          <Typography variant="title3">Oops! Something goes wrong</Typography>
          <Typography variant="text3" sx={FinalModalSubtitle}>
            Explanatory message about the problem.
          </Typography>
        </Box>
      </Box>

      <Button variant="contained" size="large" onClick={onTryAgain} fullWidth>
        Try Again
      </Button>
    </Box>
  </>
)
