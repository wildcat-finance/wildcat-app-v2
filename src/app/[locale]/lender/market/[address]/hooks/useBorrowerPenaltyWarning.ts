import { useMemo } from "react"

import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"

import { shouldMarketTriggerBorrowerPenaltyWarning } from "../utils"

type BorrowerPenaltyWarningResult = {
  shouldWarn: boolean
  triggeringMarkets: Market[]
}

const emptyBorrowerPenaltyWarningResult: BorrowerPenaltyWarningResult = {
  shouldWarn: false,
  triggeringMarkets: [],
}

export const getBorrowerPenaltyWarning = (
  currentMarket: Market | undefined,
  marketAccounts: MarketAccount[],
): BorrowerPenaltyWarningResult => {
  if (!currentMarket) return emptyBorrowerPenaltyWarningResult

  const borrower = currentMarket.borrower.toLowerCase()
  const marketsByAddress = new Map<string, Market>()

  marketAccounts.forEach(({ market }) => {
    if (
      market.chainId === currentMarket.chainId &&
      market.borrower.toLowerCase() === borrower
    ) {
      marketsByAddress.set(market.address.toLowerCase(), market)
    }
  })

  // The detail query refreshes every ten seconds, so prefer its copy of the
  // current market over the shared catalogue's sixty-second snapshot.
  marketsByAddress.set(currentMarket.address.toLowerCase(), currentMarket)

  const triggeringMarkets = Array.from(marketsByAddress.values()).filter(
    shouldMarketTriggerBorrowerPenaltyWarning,
  )

  return {
    shouldWarn: triggeringMarkets.length > 0,
    triggeringMarkets,
  }
}

export const useBorrowerPenaltyWarning = (market: Market | undefined) => {
  const { marketAccounts } = useLenderMarketsContext()

  return useMemo(
    () => getBorrowerPenaltyWarning(market, marketAccounts),
    [market, marketAccounts],
  )
}
