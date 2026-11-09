import { ReactNode } from "react"

import { Box } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type MobileMarketsToolbarProps = {
  variant?: "page" | "embedded"
  left?: ReactNode
  right?: ReactNode
}

const VARIANT_SX = {
  page: {
    padding: "4px 0 11px",
    borderBottom: `1px solid ${COLORS.whiteLilac}`,
  },
  embedded: {
    minHeight: "48px",
    padding: "7px 0",
    borderTop: `1px solid ${COLORS.whiteLilac}`,
    borderBottom: `1px solid ${COLORS.whiteLilac}`,
  },
} as const

export const MobileMarketsToolbar = ({
  variant = "page",
  left,
  right,
}: MobileMarketsToolbarProps) => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "4px 2px",
      ...VARIANT_SX[variant],
    }}
  >
    {left || <Box />}

    {right && (
      <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {right}
      </Box>
    )}
  </Box>
)
