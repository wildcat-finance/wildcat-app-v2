import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

const DAY_SECONDS = 24 * 60 * 60
const MAINNET_ACTIVITY_DAYS = 30
const SEPOLIA_ACTIVITY_WINDOWS = [7, 30, 90] as const

type ActivityMarket = {
  market: {
    latestDepositTimestamp?: number
  }
}

const depositedWithin = (
  account: ActivityMarket,
  days: number,
  now: number,
): boolean => {
  const latestDeposit = account.market.latestDepositTimestamp
  return latestDeposit !== undefined && latestDeposit > now - days * DAY_SECONDS
}

export const getActivityEligibleMarkets = <T extends ActivityMarket>(
  markets: T[],
  chainId: number,
  now: number,
): T[] => {
  if (chainId === SupportedChainId.Mainnet) {
    const recent = markets.filter((account) =>
      depositedWithin(account, MAINNET_ACTIVITY_DAYS, now),
    )
    return recent.length > 0 ? recent : markets
  }

  if (chainId === SupportedChainId.Sepolia) {
    const recent = SEPOLIA_ACTIVITY_WINDOWS.map((days) =>
      markets.filter((account) => depositedWithin(account, days, now)),
    ).find((candidates) => candidates.length > 0)
    if (recent) return recent
  }

  // Sepolia ultimately falls back to its catalogue; Plasma deliberately has
  // no day-based qualification because activity there is less frequent.
  return markets
}
