import { COLORS } from "@/theme/colors"

export const MARKET_BAR_DATA = {
  availableToBorrow: {
    id: "availableToBorrow",
    label: "Available to borrow",
    healthyBgColor: COLORS.blueRibbon,
    delinquentBgColor: "",
    healthyTextColor: COLORS.white,
    delinquentTextColor: "",
  },
  borrowed: {
    id: "borrowed",
    label: "Borrowed",
    healthyBgColor: COLORS.glitter,
    delinquentBgColor: COLORS.athensGrey,
    healthyTextColor: COLORS.blueRibbon,
    delinquentTextColor: COLORS.bunker03,
  },
  collateralObligations: {
    id: "collateralObligations",
    label: "Collateral Obligations",
    healthyBgColor: COLORS.athensGrey,
    delinquentBgColor: "",
    healthyTextColor: COLORS.bunker03,
    delinquentTextColor: "",
  },
  delinquentDebt: {
    id: "delinquentDebt",
    label: "Delinquent Debt",
    healthyBgColor: "",
    delinquentBgColor: COLORS.carminePink,
    healthyTextColor: "",
    delinquentTextColor: COLORS.white,
    hide: true,
    legendDotClassName: "delinquent_dot",
  },
  currentReserves: {
    id: "currentReserves",
    label: "Current Reserves",
    healthyBgColor: "",
    delinquentBgColor: COLORS.azalea,
    healthyTextColor: "",
    delinquentTextColor: "#BD1D22",
  },
}
export const MARKET_BAR_ORDER = {
  healthyBarchartOrder: [
    MARKET_BAR_DATA.availableToBorrow.id,
    MARKET_BAR_DATA.borrowed.id,
    MARKET_BAR_DATA.collateralObligations.id,
  ],
  delinquentBarsOrder: [
    MARKET_BAR_DATA.delinquentDebt.id,
    MARKET_BAR_DATA.currentReserves.id,
    MARKET_BAR_DATA.borrowed.id,
  ],
  healthyLegendOrder: [
    MARKET_BAR_DATA.availableToBorrow.id,
    MARKET_BAR_DATA.borrowed.id,
    MARKET_BAR_DATA.collateralObligations.id,
  ],
  delinquentLegendOrder: [
    MARKET_BAR_DATA.collateralObligations.id,
    MARKET_BAR_DATA.borrowed.id,
  ],
}
