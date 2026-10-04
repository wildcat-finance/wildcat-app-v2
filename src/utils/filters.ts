import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { getMarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

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

export const excludedMarketsFilter = (): { excludeAddresses?: string[] } =>
  EXCLUDED_MARKETS.length > 0 ? { excludeAddresses: EXCLUDED_MARKETS } : {}

const matchesStatuses = (market: Market, statuses: SmallFilterSelectItem[]) =>
  statuses.length === 0 ||
  statuses
    .map((status) => status.name)
    .includes(
      getMarketStatus(
        market.isClosed,
        market.isDelinquent || market.willBeDelinquent,
        market.isIncurringPenalties,
      ),
    )

const matchesAssets = (market: Market, assets: SmallFilterSelectItem[]) =>
  assets.length === 0 ||
  assets.map((asset) => asset.name).includes(market.underlyingToken.symbol)

export const WITHDRAWAL_CYCLE_FILTER_OPTIONS = [
  { id: "0-86400", name: "≤ 24h" },
  { id: "86401-259200", name: "1 - 3 days" },
  { id: "259201-604800", name: "3 - 7 days" },
  { id: "604801-Infinity", name: "7+ days" },
]

const matchesWithdrawalCycles = (
  market: Market,
  withdrawalCycles: SmallFilterSelectItem[],
) =>
  withdrawalCycles.length === 0 ||
  withdrawalCycles.some((cycle) => {
    const [min, max] = cycle.id.split("-").map(Number)
    return (
      market.withdrawalBatchDuration >= min &&
      market.withdrawalBatchDuration <= max
    )
  })

// Term ids are HooksKind values (OpenTerm / PeriodicTerm / FixedTerm).
const matchesTerms = (market: Market, terms: SmallFilterSelectItem[]) =>
  terms.length === 0 ||
  terms.some((term) => term.id === getMarketTypeChip(market).kind)

export const filterMarkets = (
  markets: Market[] | undefined,
  {
    statuses = [],
    assets = [],
    withdrawalCycles = [],
    terms = [],
  }: {
    statuses?: SmallFilterSelectItem[]
    assets?: SmallFilterSelectItem[]
    withdrawalCycles?: SmallFilterSelectItem[]
    terms?: SmallFilterSelectItem[]
  },
) =>
  (markets ?? []).filter(
    (market) =>
      matchesStatuses(market, statuses) &&
      matchesAssets(market, assets) &&
      matchesWithdrawalCycles(market, withdrawalCycles) &&
      matchesTerms(market, terms),
  )

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

  if (filteredMarkets && search !== "") {
    const searchString = search.toLowerCase()

    filteredMarkets = filteredMarkets.filter(({ market }) => {
      const matchMarket =
        market.name.toLowerCase().includes(searchString) ||
        market.address.toLowerCase().includes(searchString) ||
        market.underlyingToken.symbol.toLowerCase().includes(searchString)

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

  return filteredMarkets.filter(
    ({ market }) =>
      matchesStatuses(market, statuses) &&
      matchesAssets(market, assets) &&
      matchesWithdrawalCycles(market, withdrawalCycles),
  )
}
