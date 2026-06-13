import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

type BorrowerPenaltyWarningProps = {
  variant?: "page" | "modal"
}

export const BorrowerPenaltyWarning = ({
  variant = "page",
}: BorrowerPenaltyWarningProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const isModal = variant === "modal"

  const warning = (
    <Box
      sx={{
        width: "100%",
        border: `1px solid ${COLORS.cherub}`,
        borderRadius: isModal ? "8px" : { xs: "14px", md: "12px" },
        backgroundColor: COLORS.remy,
        padding: isModal ? "10px 12px" : { xs: "12px 16px", md: "12px 16px" },
      }}
    >
      <Typography
        variant={isMobile ? "mobText3" : "text3"}
        color={COLORS.dullRed}
        sx={{
          fontWeight: 600,
          lineHeight: isMobile ? "18px" : "20px",
          overflowWrap: "anywhere",
        }}
      >
        {t("lenderMarketDetails.borrowerPenaltyWarning")}
      </Typography>
    </Box>
  )

  if (isModal) {
    return (
      <Box
        sx={{
          width: "100%",
          padding: { xs: "0 20px", md: "0 36px" },
          marginBottom: "12px",
        }}
      >
        {warning}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: "100%",
        padding: { xs: "4px 0 0", md: "0 32.3% 12px 44px" },
      }}
    >
      {warning}
    </Box>
  )
}
