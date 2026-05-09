import { COLORS } from "@/theme/colors"

export const MARKET_BAR_DATA = {
  myLoan: {
    id: "myLoan",
    label: "Your Loan",
    healthyBgColor: COLORS.blueRibbon,
    delinquentBgColor: COLORS.blueRibbon,
    healthyTextColor: COLORS.staticWhite,
    delinquentTextColor: COLORS.staticWhite,
  },
  otherLoans: {
    id: "otherLoans",
    label: "Others",
    healthyBgColor: COLORS.athensGrey,
    delinquentBgColor: COLORS.athensGrey,
    healthyTextColor: COLORS.bunker03,
    delinquentTextColor: COLORS.bunker03,
  },
  loaned: {
    id: "loaned",
    label: "Loaned",
    healthyBgColor: COLORS.athensGrey,
    delinquentBgColor: COLORS.athensGrey,
    healthyTextColor: COLORS.bunker03,
    delinquentTextColor: COLORS.bunker03,
  },
  availableToLend: {
    id: "availableToLend",
    label: "Available to Lend",
    healthyBgColor: COLORS.glitter,
    delinquentBgColor: COLORS.glitter,
    healthyTextColor: COLORS.blueRibbon,
    delinquentTextColor: COLORS.blueRibbon,
  },
}

export const MARKET_BAR_ORDER = {
  healthyBarchartOrder: [
    MARKET_BAR_DATA.myLoan.id,
    MARKET_BAR_DATA.availableToLend.id,
    MARKET_BAR_DATA.otherLoans.id,
  ],
  healthyLegendOrder: [
    MARKET_BAR_DATA.myLoan.id,
    MARKET_BAR_DATA.availableToLend.id,
    MARKET_BAR_DATA.otherLoans.id,
  ],
  otherBarchartOrder: [
    MARKET_BAR_DATA.availableToLend.id,
    MARKET_BAR_DATA.loaned.id,
  ],
  otherLegendOrder: [
    MARKET_BAR_DATA.availableToLend.id,
    MARKET_BAR_DATA.loaned.id,
  ],
}
