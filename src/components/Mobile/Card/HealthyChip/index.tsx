import { Chip } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const HealthyChip = () => (
  <Chip
    label="Healthy"
    sx={{
      backgroundColor: COLORS.glitter,
      color: COLORS.ultramarineBlue,
    }}
  />
)
