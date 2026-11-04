import { Box, SxProps, Theme, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

export const DefaultedPositionsHeading = ({ sx }: { sx?: SxProps<Theme> }) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={[
        { display: "flex", flexDirection: "column", gap: "4px" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography variant="text1" color={COLORS.blackRock}>
        {t("defaultedMarkets.positions.title")}
      </Typography>
      <Typography
        variant="text3"
        color={COLORS.blackRock08}
        sx={{ maxWidth: "544px" }}
      >
        {t("defaultedMarkets.positions.subtitle")}
      </Typography>
    </Box>
  )
}
