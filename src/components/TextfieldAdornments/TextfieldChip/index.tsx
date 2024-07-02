import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type TextfieldChipProps = {
  text: string
  size?: "small" | "regular"
  color?: string
  textColor?: string
}

export const TextfieldChip = ({
  text,
  size,
  color,
  textColor,
}: TextfieldChipProps) => (
  <Box
    sx={{
      padding: size === "regular" ? "8px 12px" : "6px 12px",
      borderRadius: "8px",
      backgroundColor: color || COLORS.hintOfRed,
    }}
  >
    <Typography variant="text2" sx={{ color: textColor || COLORS.santasGrey }}>
      {text}
    </Typography>
  </Box>
)
