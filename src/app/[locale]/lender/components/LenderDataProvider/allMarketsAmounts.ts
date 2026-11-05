import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import {
  getKnownMarketOnboardingMode,
  MarketOnboardingByAddress,
  MarketOnboardingMode,
} from "@/utils/marketOnboarding"

export type AllMarketsAmounts = {
  selfOnboard: number
  manual: number
  terminatedOther: number
  defaultedOther: number
}

export const getAllMarketsAmounts = (
  accounts: MarketAccount[],
  onboardingByMarket: MarketOnboardingByAddress,
  isDefaulted: (marketAddress?: string) => boolean | undefined,
): AllMarketsAmounts =>
  accounts.reduce(
    (amounts, { market }) => {
      if (isDefaulted(market.address)) {
        amounts.defaultedOther += 1
        return amounts
      }
      if (market.isClosed) {
        amounts.terminatedOther += 1
        return amounts
      }

      const onboardingMode = getKnownMarketOnboardingMode(
        market.version,
        market.address,
        onboardingByMarket,
      )
      if (onboardingMode === MarketOnboardingMode.SelfOnboard)
        amounts.selfOnboard += 1
      if (onboardingMode === MarketOnboardingMode.BorrowerApproval)
        amounts.manual += 1
      return amounts
    },
    { selfOnboard: 0, manual: 0, terminatedOther: 0, defaultedOther: 0 },
  )
