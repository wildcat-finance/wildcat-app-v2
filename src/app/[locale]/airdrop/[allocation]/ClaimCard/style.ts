import { Theme, SxProps } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const containerBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  flexDirection: "column",
  padding: "16px",
  borderRadius: "10px",
  marginTop: "10px",
  backgroundColor: COLORS.blackHaze,
  [theme.breakpoints.down("sm")]: {
    padding: "16px",
  },
})

export const topBox: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: `1px solid ${COLORS.whiteLilac}`,
  paddingBottom: "24px",
}

export const middleBox: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "24px",
  paddingBottom: "24px",
  paddingTop: "24px",
  paddingLeft: "30px",
  position: "relative",
}

export const bottomBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  borderTop: `1px solid ${COLORS.whiteLilac}`,
  paddingTop: "24px",
  [theme.breakpoints.down("sm")]: {
    display: "none",
  },
})
