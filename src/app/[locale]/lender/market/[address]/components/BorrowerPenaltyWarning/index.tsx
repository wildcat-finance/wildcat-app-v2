import { Box, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Alert from "@/assets/icons/circledAlertRed_icon.svg"
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

  const warningBanner = (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "12px",
        borderRadius: isMobile && !isModal ? "14px" : "8px",
        border: `1px solid ${COLORS.cherub}`,
        backgroundColor: COLORS.remy,
      }}
    >
      <SvgIcon sx={{ fontSize: "16px" }}>
        <Alert />
      </SvgIcon>

      <Typography variant="text3" color={COLORS.dullRed}>
        {t("lenderMarketDetails.borrowerPenaltyWarning")}
      </Typography>
    </Box>
  )

  if (isModal) {
    return <Box paddingX={isMobile ? "20px" : "24px"}>{warningBanner}</Box>
  }

  return (
    <Box
      sx={{
        padding: { xs: "0", md: "0 32.3% 12px 44px" },
      }}
    >
      {warningBanner}
    </Box>
  )
}
