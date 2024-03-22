import { Box, Typography } from "@mui/material"
import { COLORS } from "@/theme/colors"
import { InfoBoxProps } from "@/components/InfoBox/type"

export const InfoBox = ({ color, text }: InfoBoxProps) => (
  <Box
    sx={{
      maxWidth: "460px",
      display: "flex",
      columnGap: "6px",
      alignItems: "center",
      padding: "12px",
      borderRadius: "12px",

      backgroundColor: color === "red" ? COLORS.remy : COLORS.glitter,
      color: color === "red" ? COLORS.dullRed : COLORS.ultramarineBlue,
    }}
  >
    <Box
      sx={{
        width: "4px",
        height: "4px",
        borderRadius: "50%",
        backgroundColor:
          color === "red" ? COLORS.dullRed : COLORS.ultramarineBlue,
      }}
    />
    <Typography variant="text2">{text}</Typography>
  </Box>
)
