import React, { ReactNode } from "react"

import { Box, SvgIcon } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type DepositAlertProps = {
  text: ReactNode
  icon?: ReactNode
}

export const DepositAlert = ({ text, icon }: DepositAlertProps) => (
  <Box
    sx={{
      width: "100%",
      padding: "12px",
      borderRadius: "8px",
      bgcolor: COLORS.whiteSmoke,
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
    }}
  >
    <SvgIcon
      sx={{
        fontSize: "16px",
        "& path": { fill: COLORS.greySuit },
        mt: "1px",
      }}
    >
      {icon}
    </SvgIcon>

    {text}
  </Box>
)
