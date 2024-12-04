import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { EmptyAlertProps } from "@/app/[locale]/borrower/profile/components/EmptyAlert/interface"
import {
  ExternalAlertContainer,
  UserAlertContainer,
  UserTitleContainer,
} from "@/app/[locale]/borrower/profile/components/EmptyAlert/style"
import User from "@/assets/icons/profile_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export const EmptyAlert = ({ type, marginTop, alertText }: EmptyAlertProps) => {
  const { t } = useTranslation()

  switch (type) {
    case "user": {
      return (
        <Box
          sx={{
            ...UserAlertContainer,
            marginTop,
          }}
        >
          <Box sx={UserTitleContainer}>
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
    }
    case "external": {
      return (
        <Box
          sx={{
            ...ExternalAlertContainer,
            marginTop,
          }}
        >
          <SvgIcon sx={{ "& path": { fill: COLORS.santasGrey } }}>
            <User />
          </SvgIcon>

          <Typography variant="text2" color={COLORS.santasGrey}>
            {alertText}
          </Typography>
        </Box>
      )
    }
    default: {
      return (
        <Box
          sx={{
            ...ExternalAlertContainer,
            marginTop,
          }}
        >
          <SvgIcon sx={{ "& path": { fill: COLORS.santasGrey } }}>
            <User />
          </SvgIcon>

          <Typography variant="text2" color={COLORS.santasGrey}>
            {alertText}
          </Typography>
        </Box>
      )
    }
  }
}
