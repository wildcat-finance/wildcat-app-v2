import { Box, SxProps, Theme, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const DefaultedPositionsHeading = ({ sx }: { sx?: SxProps<Theme> }) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={[
        { display: "flex", flexDirection: "column", gap: "4px" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        variant={isMobile ? "mobText1" : "text1"}
        color={COLORS.blackRock}
      >
        {t("defaultedMarkets.positions.title")}
      </Typography>
      <Typography
        variant={isMobile ? "mobText3" : "text3"}
        color={COLORS.blackRock08}
        sx={{ maxWidth: "544px" }}
      >
        {t("defaultedMarkets.positions.subtitle")}
      </Typography>
    </Box>
  )
}
