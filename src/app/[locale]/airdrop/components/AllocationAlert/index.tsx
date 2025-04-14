import { Box, Button, SvgIcon, Typography } from "@mui/material"

import Clock from "@/assets/icons/clock_icon.svg"
import { COLORS } from "@/theme/colors"

export type AllocationAlertProps = {
  type: "expired" | "non-active" | "wrong"
  date?: string
  account?: string
  connectedAccount?: string
}

export const AllocationAlert = ({
  type,
  date,
  account,
  connectedAccount,
}: AllocationAlertProps) => {
  let alertConfig: {
    title: string
    description: string
    button: {
      title: string
      color: string
      border: string
      background: string
      hover: string
    } | null
    color: string
    iconColor: string
    backgroundColor: string
  }

  switch (type) {
    case "non-active": {
      alertConfig = {
        title: `Activate your allocation until ${date}`,
        description: "Not to lose your eligible tokens",
        button: {
          title: "Activate",
          color: COLORS.white,
          border: "none",
          background: COLORS.carminePink,
          hover: `${COLORS.carminePink}B3`,
        },
        color: COLORS.dullRed,
        iconColor: COLORS.carminePink,
        backgroundColor: COLORS.remy,
      }
      break
    }

    case "wrong": {
      alertConfig = {
        title: `This vesting is for ${account}`,
        description: `You connected with ${connectedAccount}`,
        button: {
          title: "Switch Account",
          color: COLORS.butteredRum,
          border: `1px solid ${COLORS.galliano04}`,
          background: "transparent",
          hover: `${COLORS.galliano}33`,
        },
        color: COLORS.butteredRum,
        iconColor: COLORS.galliano,
        backgroundColor: COLORS.citrus,
      }
      break
    }

    case "expired": {
      alertConfig = {
        title: `Sorry, your allocation is expired ${date}`,
        description: "There is nothing to claim",
        button: null,
        color: COLORS.blackRock,
        iconColor: "#8A8C9F",
        backgroundColor: COLORS.blackHaze,
      }
      break
    }

    default: {
      alertConfig = {
        title: `Activate your allocation until ${date}`,
        description: "Not to lose your eligible tokens",
        button: {
          title: "Activate",
          color: COLORS.white,
          border: "none",
          background: COLORS.carminePink,
          hover: COLORS.dullRed,
        },
        color: COLORS.dullRed,
        iconColor: COLORS.carminePink,
        backgroundColor: COLORS.remy,
      }
      break
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        padding: "12px 16px",
        borderRadius: "12px",
        backgroundColor: alertConfig.backgroundColor,
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", gap: "12px" }}>
        <SvgIcon
          sx={{ marginTop: "2px", "& path": { fill: alertConfig.iconColor } }}
        >
          <Clock />
        </SvgIcon>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Typography
            variant="text3"
            color={alertConfig.color}
            sx={{ fontWeight: 600 }}
          >
            {alertConfig.title}
          </Typography>

          <Typography variant="text3" color={alertConfig.color}>
            {alertConfig.description}
          </Typography>
        </Box>
      </Box>

      {alertConfig.button && (
        <Button
          size="small"
          sx={{
            color: alertConfig.button.color,
            border: alertConfig.button.border,
            background: alertConfig.button.background,

            "&:hover": {
              color: alertConfig.button.color,
              backgroundColor: alertConfig.button.hover,
            },
          }}
        >
          {alertConfig.button.title}
        </Button>
      )}
    </Box>
  )
}
