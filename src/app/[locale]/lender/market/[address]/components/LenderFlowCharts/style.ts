import { SxProps, Theme } from "@mui/material"

export const ChartsGrid = (isMobile: boolean): SxProps<Theme> => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
  gap: "12px",
  width: "100%",
})
