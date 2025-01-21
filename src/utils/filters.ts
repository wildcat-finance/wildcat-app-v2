import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { getMarketStatus, MarketAssets } from "@/utils/marketStatus"

export const filterMarketAccounts = (
  marketAccounts: MarketAccount[] | undefined,
  name: string,
  statuses: SmallFilterSelectItem[],
  assets: SmallFilterSelectItem[],
) => {
  if (!marketAccounts) return []

  let filteredMarkets = marketAccounts

  const assetsNames = assets.map((asset) => asset.name)

  if (filteredMarkets && name !== "") {
    filteredMarkets = filteredMarkets.filter(({ market }) =>
      market.name.toLowerCase().includes(name.toLowerCase()),
    )
  }

  if (filteredMarkets && statuses.length > 0) {
    const statusesNames = statuses.map((status) => status.name)

    filteredMarkets = filteredMarkets.filter(({ market }) =>
      statusesNames.includes(
        getMarketStatus(
          market.isClosed,
          market.isDelinquent || market.willBeDelinquent,
          market.isIncurringPenalties,
        ),
      ),
    )
  }

  if (filteredMarkets && assets.length > 0) {
    filteredMarkets = filteredMarkets.filter(({ market }) =>
      assetsNames.includes(market.underlyingToken.symbol as MarketAssets),
    )
  }

  return filteredMarkets
}
