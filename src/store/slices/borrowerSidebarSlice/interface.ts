export enum SidebarMarketAssets {
  ALL = "All",
  WBTC = "WBTC",
  WETH = "WETH",
  USDT = "USDT",
  USDC = "USDC",
  DAI = "DAI",
}

export type TBorrowerSidebarType = {
  status: string
  underlyingAsset: string
}
