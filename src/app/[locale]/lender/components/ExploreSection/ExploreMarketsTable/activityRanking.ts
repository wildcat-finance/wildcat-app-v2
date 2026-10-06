const DAY_SECONDS = 24 * 60 * 60

const MAINNET_ACTIVITY_WINDOWS_DAYS = [30, 90] as const
const TESTNET_ACTIVITY_WINDOWS_DAYS = [3650] as const

type ActivityMarket = {
  market: {
    latestDepositTimestamp?: number
  }
}

const getActivityTier = (
  account: ActivityMarket,
  windows: readonly number[],
  now: number,
): number => {
  const latestDeposit = account.market.latestDepositTimestamp
  if (latestDeposit === undefined) return windows.length

  const tier = windows.findIndex(
    (days) => latestDeposit > now - days * DAY_SECONDS,
  )
  return tier === -1 ? windows.length : tier
}

export const rankMarketsByActivity = <T extends ActivityMarket>(
  markets: T[],
  isTestnet: boolean,
  now: number,
  compare: (a: T, b: T) => number,
): T[] => {
  const windows = isTestnet
    ? TESTNET_ACTIVITY_WINDOWS_DAYS
    : MAINNET_ACTIVITY_WINDOWS_DAYS

  return markets
    .map((account, index) => ({
      account,
      index,
      tier: getActivityTier(account, windows, now),
    }))
    .sort(
      (a, b) =>
        a.tier - b.tier || compare(a.account, b.account) || a.index - b.index,
    )
    .map(({ account }) => account)
}
