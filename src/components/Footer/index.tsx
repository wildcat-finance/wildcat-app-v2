import { Box, Button, Typography } from "@mui/material"

import { ContentContainer, DownloadIcon } from "@/components/Footer/style"
import { TFunction } from "i18next"

export const Footer = ({ t }: { t: TFunction }) => (
  <Box sx={ContentContainer}>
    <Typography variant="text4Highlighted">
      Wildcat © {t("footer:rights")}. 2023
    </Typography>
    <Button variant="text" size="small">
      <Typography variant="text4Highlighted">
        {t("footer:agreement")}
      </Typography>
      <Box sx={DownloadIcon}>⇤</Box>
    </Button>
  </Box>
)
