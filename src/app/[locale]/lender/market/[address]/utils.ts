import { LenderRole, Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { LenderStatus } from "./interface"

export const getEffectiveLenderRole = (
  account: MarketAccount,
): LenderStatus => {
  switch (account.inferredRole) {
    case LenderRole.DepositAndWithdraw:
      return LenderStatus.DepositAndWithdraw
    case LenderRole.WithdrawOnly:
      return LenderStatus.WithdrawOnly
    case LenderRole.Blocked:
      return LenderStatus.Blocked
    case LenderRole.Null:
    default:
      return LenderStatus.Null
  }
}

export const borrowerPenaltyWarningThresholdSeconds = 30 * 24 * 60 * 60

export const getPenaltySecondsPastGrace = (market: Market) =>
  market.timeDelinquent - market.delinquencyGracePeriod

export const shouldMarketTriggerBorrowerPenaltyWarning = (market: Market) =>
  !market.isClosed &&
  market.isIncurringPenalties &&
  getPenaltySecondsPastGrace(market) >= borrowerPenaltyWarningThresholdSeconds

export const shouldShowLenderRequestBanner = ({
  isConnected,
  isDifferentChain,
  authorizedInMarket,
}: {
  isConnected: boolean
  isDifferentChain: boolean
  authorizedInMarket: boolean | undefined
}) => isConnected && !isDifferentChain && authorizedInMarket === false

export const getLenderMarketLoadingState = ({
  isMarketReady,
  isMarketLoading,
  apiLoading,
  isDiscoveringChainId,
  hasMarketAccount,
  isWithdrawalsLoading,
  authorizedInMarket,
  isDifferentChain,
}: {
  isMarketReady: boolean
  isMarketLoading: boolean
  apiLoading: boolean
  isDiscoveringChainId: boolean
  hasMarketAccount: boolean
  isWithdrawalsLoading: boolean
  authorizedInMarket: boolean
  isDifferentChain: boolean
}) => ({
  isPageLoading:
    !isMarketReady || isMarketLoading || apiLoading || isDiscoveringChainId,
  isTransactionsLoading:
    !hasMarketAccount ||
    (authorizedInMarket && !isDifferentChain && isWithdrawalsLoading),
  isBarChartsLoading: !hasMarketAccount || isWithdrawalsLoading,
})
