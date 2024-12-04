import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

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
              Add a description to your profile
            </Typography>
            <Typography variant="text3" color={COLORS.santasGrey}>
              Fulfil it to be more transparent for lenders
            </Typography>
          </Box>

          <Link href={ROUTES.borrower.editProfile}>
            <Button
              variant="contained"
              size="medium"
              sx={{ padding: "10px 23.5px", lineHeight: "20px" }}
            >
              Add Details
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
