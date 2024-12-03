import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import User from "@/assets/icons/profile_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export type EmptyAlertProps = {
  type: "user" | "external"
  marginTop?: string
  alertText?: string
}

export const EmptyAlert = ({ type, marginTop, alertText }: EmptyAlertProps) => {
  const a = ""

  switch (type) {
    case "user": {
      return (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderRadius: "12px",
            backgroundColor: COLORS.hintOfRed,
            marginTop,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
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
            width: "100%",
            display: "flex",
            gap: "10px",
            borderRadius: "12px",
            padding: "12px 16px",
            backgroundColor: COLORS.hintOfRed,
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
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderRadius: "12px",
            padding: "12px 16px",
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
