import { COLORS } from "@/theme/colors"

export const MARKET_BAR_DATA = {
  claimable: {
    id: "claimable",
    label: "Claimable",
    healthyBgColor: COLORS.blueRibbon,
    delinquentBgColor: COLORS.blueRibbon,
    healthyTextColor: COLORS.staticWhite,
    delinquentTextColor: COLORS.staticWhite,
  },
  ongoing: {
    id: "ongoing",
    label: "Ongoing",
    healthyBgColor: COLORS.iron,
    delinquentBgColor: COLORS.athensGrey,
    healthyTextColor: COLORS.bunker03,
    delinquentTextColor: COLORS.bunker03,
  },
  outstanding: {
    id: "outstanding",
    label: "Outstanding",
    healthyBgColor: COLORS.cherub,
    delinquentBgColor: COLORS.cherub,
    healthyTextColor: "",
    delinquentTextColor: "",
  },
}

export const MARKET_BAR_ORDER = {
  healthyBarchartOrder: [
    MARKET_BAR_DATA.claimable.id,
    MARKET_BAR_DATA.ongoing.id,
  ],
  delinquentBarchartOrder: [
    MARKET_BAR_DATA.claimable.id,
    MARKET_BAR_DATA.ongoing.id,
    MARKET_BAR_DATA.outstanding.id,
  ],
  healthyLegendOrder: [
    MARKET_BAR_DATA.claimable.id,
    MARKET_BAR_DATA.ongoing.id,
  ],
  delinquentLegendOrder: [
    MARKET_BAR_DATA.claimable.id,
    MARKET_BAR_DATA.ongoing.id,
    MARKET_BAR_DATA.outstanding.id,
  ],
}
