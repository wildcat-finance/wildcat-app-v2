import { Box, Button, Typography } from "@mui/material"

import { ContentContainer, DownloadIcon } from "@/components/Footer/style"

export const Footer = () => (
  <Box sx={ContentContainer}>
    <Typography variant="text4Highlighted">
      Wildcat © All Rights reserved. 2023
    </Typography>
    <Button variant="text" size="small">
      <Typography variant="text4Highlighted">Download Agreement</Typography>
      <Box sx={DownloadIcon}>⇤</Box>
    </Button>
  </Box>
)
