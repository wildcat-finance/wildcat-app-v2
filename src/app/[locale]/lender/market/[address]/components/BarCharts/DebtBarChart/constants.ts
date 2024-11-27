export const MARKET_BAR_DATA = {
  locked: {
    id: "locked",
    label: "Locked",
    healthyBgColor: "#4971FF",
    delinquentBgColor: "#F1464B",
    healthyTextColor: "#FFFFFF",
    delinquentTextColor: "#FFFFFF",
  },
  liquid: {
    id: "liquid",
    label: "Liquid",
    healthyBgColor: "#E4EBFE",
    delinquentBgColor: "#F7BEC1",
    healthyTextColor: "#4971FF",
    delinquentTextColor: "#BD1D22",
  },
  borrowed: {
    id: "borrowed",
    label: "Borrowed",
    healthyBgColor: "#EFF0F4",
    delinquentBgColor: "#EFF0F4",
    healthyTextColor: "#4971FF",
    delinquentTextColor: "#4971FF",
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
