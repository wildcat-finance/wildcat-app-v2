/* eslint-disable camelcase */
import {
  Market,
  MarketAccount,
  SubgraphMarket_Filter,
} from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { getMarketStatus } from "@/utils/marketStatus"

import { EXCLUDED_MARKETS, EXCLUDED_BORROWERS } from "./constants"

export const isExcludedMarket = (market: Market | string) => {
  if (typeof market === "string") {
    return EXCLUDED_MARKETS.includes(market.toLowerCase())
  }
  return (
    EXCLUDED_MARKETS.includes(market.address.toLowerCase()) ||
    EXCLUDED_BORROWERS.includes(market.borrower.toLowerCase())
  )
}

export const isNotExcludedMarket = (market: Market | string) =>
  !isExcludedMarket(market)

export const combineFilters = (
  _filters: (SubgraphMarket_Filter | null | undefined)[],
) => {
  const filters = _filters.filter(
    (filter) => filter && Object.keys(filter).length > 0,
  ) as SubgraphMarket_Filter[]
  if (filters.length === 0) return undefined
  if (filters.length === 1) return filters[0]
  return { and: filters }
}

export const filterMarketAccounts = (
  marketAccounts: MarketAccount[] | undefined,
  search: string,
  statuses: SmallFilterSelectItem[],
  assets: SmallFilterSelectItem[],
  borrowers: BorrowerWithName[] | undefined,
  withdrawalCycles: SmallFilterSelectItem[] = [],
) => {
  if (!marketAccounts) return []

  let filteredMarkets = marketAccounts

  const assetsNames = assets.map((asset) => asset.name)

  if (filteredMarkets && search !== "") {
    const searchString = search.toLowerCase()

    filteredMarkets = filteredMarkets.filter(({ market }) => {
      const matchMarket =
        market.name.toLowerCase().includes(searchString) ||
        market.address.toLowerCase().includes(searchString)

      let matchBorrower = false
      if (borrowers) {
        const borrower = borrowers.find(
          (b) => b.address.toLowerCase() === market.borrower.toLowerCase(),
        )

        const norm = (s?: string) => (s ?? "").toLowerCase()

        if (borrower) {
          const a = norm(borrower.address)
          const n = norm(borrower.name)
          const al = norm(borrower.alias)

          matchBorrower =
            a.includes(searchString) ||
            n.includes(searchString) ||
            al.includes(searchString)
        }
      }

      return matchMarket || matchBorrower
    })
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
      assetsNames.includes(market.underlyingToken.symbol),
    )
  }

  if (filteredMarkets && withdrawalCycles.length > 0) {
    filteredMarkets = filteredMarkets.filter(({ market }) =>
      withdrawalCycles.some((cycle) => {
        const [min, max] = cycle.id.split("-").map(Number)
        return (
          market.withdrawalBatchDuration >= min &&
          market.withdrawalBatchDuration <= max
        )
      }),
    )
  }

  return filteredMarkets
}
