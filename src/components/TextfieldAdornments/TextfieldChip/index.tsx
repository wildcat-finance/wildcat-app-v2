import { Box, Typography } from "@mui/material"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export type TextfieldChipProps = {
  text: string
  size?: "small" | "regular"
  color?: string
  textColor?: string
  variant?: string
}

export const TextfieldChip = ({
  text,
  size,
  color,
  textColor,
  variant = "text3",
}: TextfieldChipProps) => {
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        padding: size === "regular" ? "8px 12px" : "6px 12px",
        borderRadius: "8px",
        backgroundColor: color || COLORS.hintOfRed,
      }}
    >
      <Typography
        variant={isMobile ? "mobText3" : "text3"}
        sx={{ color: textColor || COLORS.santasGrey }}
      >
        {text}
      </Typography>
    </Box>
  )
}
