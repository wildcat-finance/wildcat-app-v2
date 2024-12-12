import { ReactNode } from "react"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type HorizontalInputLabelProps = {
  label: string
  explainer?: string
  children: ReactNode
}

export const HorizontalInputLabel = ({
  label,
  explainer,
  children,
}: HorizontalInputLabelProps) => (
  <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
    <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <Typography variant="text3">{label}</Typography>
      <Typography variant="text4" color={COLORS.santasGrey}>
        {explainer}
      </Typography>
    </Box>

    {children}
  </Box>
)
