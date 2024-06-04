import { MarketStatus } from "@/utils/marketStatus"

export enum SidebarMarketAssets {
  ALL = "All",
  WBTC = "WBTC",
  WETH = "WETH",
  USDT = "USDT",
  USDC = "USDC",
  DAI = "DAI",
}

export type TBorrowerSidebarType = {
  marketName: string
  status: MarketStatus | "All"
  underlyingAsset: SidebarMarketAssets
}
