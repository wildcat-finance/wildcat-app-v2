import { SxProps, Theme } from "@mui/material"

import { pageCalcHeights } from "@/utils/constants"

export const MarketHeaderUpperContainer = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: "20px",
  padding: "52px 32.3% 0 44px",
  "@media (max-width: 1000px)": {
    background: "white",
    flexDirection: "column-reverse",
    borderRadius: "14px",
  },
}

export const MarketHeaderInfoContainer = {
  display: "flex",
  flexDirection: "column",
  rowGap: "10px",
  minWidth: 0,
}

export const MarketHeaderTitleRow = {
  display: "flex",
  alignItems: "center",
  columnGap: "10px",
}

export const MarketHeaderDetailsRow = {
  display: "flex",
  alignItems: "center",
  columnGap: "4px",
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
