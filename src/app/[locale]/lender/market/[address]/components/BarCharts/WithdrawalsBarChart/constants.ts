export const MARKET_BAR_DATA = {
  claimable: {
    id: "claimable",
    label: "Claimable",
    healthyBgColor: "#4971FF",
    delinquentBgColor: "#4971FF",
    healthyTextColor: "#FFFFFF",
    delinquentTextColor: "#FFFFFF",
  },
  ongoing: {
    id: "ongoing",
    label: "Ongoing",
    healthyBgColor: "#D6D6DE",
    delinquentBgColor: "#EFF0F4",
    healthyTextColor: "#1414144D",
    delinquentTextColor: "#1414144D",
  },
  outstanding: {
    id: "outstanding",
    label: "Outstanding",
    healthyBgColor: "#F7D7DA",
    delinquentBgColor: "#F7D7DA",
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
