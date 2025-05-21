import { pageCalcHeights } from "@/utils/constants"

export const ContentContainer = {
  width: "100%",
  height: `calc(100vh - ${pageCalcHeights.page})`,
  overflow: "scroll",
}

export const MainContainer = {
  width: "69.88%",
  margin: "0 auto 0 0",
  padding: "52px 20px 24px 44px",
}

export const MarketParametersContainer = {
  width: "100%",
  display: "flex",
  columnGap: "24px",
  marginTop: "24px",
}

export const MarketParametersColumn = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  rowGap: "12px",
}

export const MarketParametersRowsDivider = { margin: "12px 0 0" }

export const ProfileHeaderButton = {
  height: "28px",
}
