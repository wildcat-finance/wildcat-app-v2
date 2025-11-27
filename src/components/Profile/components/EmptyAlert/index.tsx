import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import User from "@/assets/icons/profile_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { EmptyAlertProps } from "./interface"
import {
  ExternalAlertContainer,
  InternalAlertContainer,
  InternalTextContainer,
} from "./style"

export const EmptyAlert = ({
  showAlert,
  isExternal,
  isMobile = false,
}: EmptyAlertProps) => {
  const { t } = useTranslation()

  if (showAlert && isExternal)
    return (
      <Box
        sx={{
          ...ExternalAlertContainer,
          marginTop: isMobile ? "12px" : "32px",
        }}
      >
        <SvgIcon sx={{ "& path": { fill: COLORS.santasGrey } }}>
          <User />
        </SvgIcon>

        <Typography variant="text2" color={COLORS.santasGrey}>
          {t("borrowerProfile.profile.emptyStates.external.noMarkets")}
        </Typography>
      </Box>
    )

  if (showAlert && !isExternal)
    return (
      <Box sx={InternalAlertContainer}>
        <Box sx={InternalTextContainer}>
          <Typography variant="text1">
            {t("borrowerProfile.profile.emptyStates.user.noInfo.title")}
          </Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {t("borrowerProfile.profile.emptyStates.user.noInfo.subtitle")}
          </Typography>
        </Box>

        <Link href={ROUTES.borrower.editProfile}>
          <Button
            variant="contained"
            size="medium"
            sx={{ padding: "10px 23.5px", lineHeight: "20px" }}
          >
            {t("borrowerProfile.profile.emptyStates.user.noInfo.button")}
          </Button>
        </Link>
      </Box>
    )

  return null
}
