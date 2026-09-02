import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

const DAY_SECONDS = 24 * 60 * 60

const MAINNET_ACTIVITY_WINDOWS_DAYS = [30, 90] as const
const SEPOLIA_ACTIVITY_WINDOWS_DAYS = [7, 30, 90] as const

const getActivityWindows = (chainId: number): readonly number[] => {
  if (chainId === SupportedChainId.Mainnet) {
    return MAINNET_ACTIVITY_WINDOWS_DAYS
  }
  if (chainId === SupportedChainId.Sepolia) {
    return SEPOLIA_ACTIVITY_WINDOWS_DAYS
  }
  return []
}

type ActivityMarket = {
  market: {
    address: string
  }
}

const getActivityTier = (
  account: ActivityMarket,
  windows: readonly number[],
  now: number,
  latestDepositTimestampByMarket: Record<string, number>,
): number => {
  const latestDeposit =
    latestDepositTimestampByMarket[account.market.address.toLowerCase()]
  if (latestDeposit === undefined) return windows.length

  const tier = windows.findIndex(
    (days) => latestDeposit > now - days * DAY_SECONDS,
  )
  return tier === -1 ? windows.length : tier
}

export const rankMarketsByActivity = <T extends ActivityMarket>(
  markets: T[],
  chainId: number,
  now: number,
  latestDepositTimestampByMarket: Record<string, number>,
  compare: (a: T, b: T) => number,
): T[] => {
  const windows = getActivityWindows(chainId)

  return markets
    .map((account, index) => ({
      account,
      index,
      tier: getActivityTier(
        account,
        windows,
        now,
        latestDepositTimestampByMarket,
      ),
    }))
    .sort(
      (a, b) =>
        a.tier - b.tier || compare(a.account, b.account) || a.index - b.index,
    )
    .map(({ account }) => account)
}

/**
 * Activity decides which markets qualify for the limited Top Markets window;
 * the selected UI criterion decides how those markets are displayed.
 *
 * Keeping these as separate steps prevents activity tiers from making the
 * visible sort controls appear inert when each market belongs to a different
 * tier, which is common on Sepolia.
 */
export const selectTopMarketsByActivity = <T extends ActivityMarket>(
  markets: T[],
  chainId: number,
  now: number,
  latestDepositTimestampByMarket: Record<string, number>,
  compare: (a: T, b: T) => number,
  limit: number,
): T[] =>
  rankMarketsByActivity(
    markets,
    chainId,
    now,
    latestDepositTimestampByMarket,
    compare,
  )
    .slice(0, Math.max(0, limit))
    // Array#sort is stable, so activity remains the tie-breaker.
    .sort(compare)
