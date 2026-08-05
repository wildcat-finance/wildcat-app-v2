"use client"

import { useCallback } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

const DAY_SECONDS = 24 * 60 * 60
const MAINNET_WINDOW_DAYS = 30
const TESTNET_WINDOW_DAYS = 3650

export const useMarketsWithRecentInflow = () => {
  const { isTestnet } = useCurrentNetwork()

  // Qualification is strictly event-based: a market appears in explore
  // categories only if a lender deposit landed inside the window. The market
  // catalogue carries each market's latest deposit timestamp, so this needs
  // no query of its own and can never lag behind the catalogue.
  const isMarketQualifying = useCallback(
    (account: MarketAccount): boolean => {
      const latestDeposit = account.market.latestDepositTimestamp
      if (latestDeposit === undefined) return false
      const windowDays = isTestnet ? TESTNET_WINDOW_DAYS : MAINNET_WINDOW_DAYS
      const windowStart =
        Math.floor(Date.now() / 1000) - windowDays * DAY_SECONDS
      return latestDeposit > windowStart
    },
    [isTestnet],
  )

  return { isMarketQualifying, isLoading: false, isError: false }
}
