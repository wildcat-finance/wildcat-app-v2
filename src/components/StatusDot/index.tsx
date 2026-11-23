import { Box } from "@mui/material"

export const StatusDot = ({ color }: { color: string }) => (
  <Box
    sx={{
      width: "6px",
      height: "6px",
      flexShrink: 0,
      borderRadius: "50%",
      marginLeft: "6px",
      backgroundColor: color,
    }}
  />
)
