import { SxProps, Theme } from "@mui/material"

import { pageCalcHeights } from "@/utils/constants"

export const MarketHeaderUpperContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "20px",
  padding: "52px 36px 0 44px",
  "@media (max-width: 1000px)": {
    background: "white",
    flexDirection: "column-reverse",
    borderRadius: "14px",
  },
}

export const MarketHeaderTitleContainer = {
  display: "flex",
  columnGap: "8px",
}

export const MarketHeaderStatusContainer = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  columnGap: "12px",

  [theme.breakpoints.down("md")]: {
    padding: "12px 0",
    columnGap: "0px",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
})
