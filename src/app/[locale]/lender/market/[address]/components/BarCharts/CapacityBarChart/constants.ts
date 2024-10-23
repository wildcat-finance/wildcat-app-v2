export const MARKET_BAR_DATA = {
  myLoan: {
    id: "myLoan",
    label: "Your Loan",
    healthyBgColor: "#4971FF",
    delinquentBgColor: "#4971FF",
    healthyTextColor: "#FFFFFF",
    delinquentTextColor: "#FFFFFF",
  },
  otherLoans: {
    id: "otherLoans",
    label: "Others",
    healthyBgColor: "#EFF0F4",
    delinquentBgColor: "#EFF0F4",
    healthyTextColor: "#1414144D",
    delinquentTextColor: "#1414144D",
  },
  availableToLend: {
    id: "availableToLend",
    label: "Available to Lend",
    healthyBgColor: "#E4EBFE",
    delinquentBgColor: "#E4EBFE",
    healthyTextColor: "#4971FF",
    delinquentTextColor: "#4971FF",
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
}
