import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

export const AllocationBox = ({ allocation }: { allocation: string }) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: "flex",
        padding: "12px",
        backgroundColor: COLORS.glitter,
        borderRadius: "12px",
        gap: "12px",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="text2" sx={{ color: COLORS.blueRibbon }}>
        {allocation}
      </Typography>
      <Button variant="text" size="small" sx={{ color: COLORS.blueRibbon }}>
        {t("airdrop.allocation.tryAnother")}
      </Button>
    </Box>
  )
}
