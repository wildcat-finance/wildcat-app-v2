import { Theme, SxProps } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const containerBox = (
  theme: Theme,
  claimed: boolean,
): SxProps<Theme> => ({
  display: "flex",
  flexDirection: "column",
  padding: "16px",
  borderRadius: "10px",
  borderBottomRightRadius: claimed ? "4px" : "10px",
  borderBottomLeftRadius: claimed ? "4px" : "10px",
  marginTop: "10px",
  backgroundColor: COLORS.blackHaze,
  [theme.breakpoints.down("sm")]: {
    padding: "16px",
  },
})

export const mainContainerBox: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
}

export const topBox: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
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

export const blueBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  gap: "11px",
  backgroundColor: COLORS.glitter,
  color: COLORS.ultramarineBlue,
  padding: "16px",
  borderRadius: "10px",
  borderTopLeftRadius: "4px",
  borderTopRightRadius: "4px",
  [theme.breakpoints.down("sm")]: {},
})
