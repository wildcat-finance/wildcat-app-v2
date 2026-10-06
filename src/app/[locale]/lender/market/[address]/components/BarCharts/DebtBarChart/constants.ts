import { COLORS } from "@/theme/colors"

export const MARKET_BAR_DATA = {
  locked: {
    id: "locked",
    label: "Locked",
    healthyBgColor: COLORS.blueRibbon,
    delinquentBgColor: COLORS.carminePink,
    healthyTextColor: COLORS.staticWhite,
    delinquentTextColor: COLORS.staticWhite,
  },
  liquid: {
    id: "liquid",
    label: "Liquid",
    healthyBgColor: COLORS.glitter,
    delinquentBgColor: COLORS.azalea,
    healthyTextColor: COLORS.blueRibbon,
    delinquentTextColor: COLORS.dullRed,
  },
  borrowed: {
    id: "borrowed",
    label: "Borrowed",
    healthyBgColor: COLORS.athensGrey,
    delinquentBgColor: COLORS.athensGrey,
    healthyTextColor: COLORS.blueRibbon,
    delinquentTextColor: COLORS.blueRibbon,
  },
}

export const MARKET_BAR_ORDER = {
  healthyBarchartOrder: [
    MARKET_BAR_DATA.locked.id,
    MARKET_BAR_DATA.liquid.id,
    MARKET_BAR_DATA.borrowed.id,
  ],
  healthyLegendOrder: [
    MARKET_BAR_DATA.locked.id,
    MARKET_BAR_DATA.liquid.id,
    MARKET_BAR_DATA.borrowed.id,
  ],
}
