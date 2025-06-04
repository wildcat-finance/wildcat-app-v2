import { Theme, SxProps } from "@mui/material"

export const MarketParametersContainer = (theme: Theme): SxProps<Theme> => ({
  width: "100%",
  display: "flex",
  flexDirection: "row",
  gap: "24px",
  justifyContent: "space-between",
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    gap: "0px",
  },
})
export const MarketParametersContainerColumn = (
  theme: Theme,
): SxProps<Theme> => ({
  width: "48%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
})
