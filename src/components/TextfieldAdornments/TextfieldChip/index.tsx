import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type TextfieldChipProps = {
  text: string
}

export const TextfieldChip = ({ text }: TextfieldChipProps) => (
  <Box
    sx={{
      padding: "8px 12px",
      borderRadius: "8px",
      backgroundColor: COLORS.hintOfRed,
    }}
  >
    <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
      {text}
    </Typography>
  </Box>
)
