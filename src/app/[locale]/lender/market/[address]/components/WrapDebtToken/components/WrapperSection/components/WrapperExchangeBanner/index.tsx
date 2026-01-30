import React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Change from "@/assets/icons/change_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export const WrapperExchangeBanner = () => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px",
        background: COLORS.hintOfRed,
        borderRadius: "12px",
        marginBottom: "24px",
      }}
    >
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Typography variant="text3" color={COLORS.manate}>
            Market tokens
          </Typography>
          <TooltipButton value="TBD" color={COLORS.manate} />
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "start-end",
            gap: "3px",
          }}
        >
          <Typography variant="title2">0.0056</Typography>
          <Typography
            variant="text4"
            color={COLORS.manate}
            sx={{ marginTop: "4px" }}
          >
            ETH
          </Typography>
        </Box>
      </Box>

      <SvgIcon>
        <Change />
      </SvgIcon>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Typography variant="text3" color={COLORS.manate}>
            Wrapped tokens
          </Typography>
          <TooltipButton value="TBD" color={COLORS.manate} />
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            gap: "3px",
          }}
        >
          <Typography variant="title2">0</Typography>
          <Typography
            variant="text4"
            color={COLORS.manate}
            sx={{ marginTop: "4px" }}
          >
            WETH
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
