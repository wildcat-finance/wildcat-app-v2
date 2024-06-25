import { Box, Typography } from "@mui/material"

import { Loader } from "@/components/Loader"

import {
  FinalModalContentContainer,
  FinalModalSubtitle,
  FinalModalTypoBox,
} from "../style"

export const LoadingModal = () => (
  <Box sx={FinalModalContentContainer} rowGap="24px">
    <Loader />

    <Box sx={FinalModalTypoBox}>
      <Typography variant="text1">Just wait a bit ...</Typography>
      <Typography variant="text3" sx={FinalModalSubtitle}>
        Transaction is in process.
      </Typography>
    </Box>
  </Box>
)
