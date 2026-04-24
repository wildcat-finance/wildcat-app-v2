import {
  DepositStatus,
  FixedTermHooksConfig,
  HooksKind,
} from "@wildcatfi/wildcat-sdk"

type MarketHooksConfigLike = {
  kind?: HooksKind
  hooksAddress?: string
  fixedTermEndTime?: number
}

type MarketLike = {
  controller?: string
  hooksConfig?: MarketHooksConfigLike
}

type MarketAccountLike = {
  depositAvailability?: DepositStatus
  hasEverInteracted?: boolean
  market: MarketLike
}

export const isHooksManagedMarket = (market: MarketLike): boolean =>
  market.hooksConfig?.hooksAddress !== undefined

export const getMarketPolicyAddress = (
  market: MarketLike,
): string | undefined => market.hooksConfig?.hooksAddress ?? market.controller

export const getFixedTermHooksConfig = (
  market: MarketLike,
): FixedTermHooksConfig | undefined =>
  market.hooksConfig?.kind === HooksKind.FixedTerm
    ? (market.hooksConfig as FixedTermHooksConfig)
    : undefined

export const isFixedTermMarket = (market: MarketLike): boolean =>
  getFixedTermHooksConfig(market) !== undefined

export const isSelfOnboardMarketAccount = (
  account: MarketAccountLike,
): boolean =>
  !account.hasEverInteracted &&
  isHooksManagedMarket(account.market) &&
  account.depositAvailability === DepositStatus.Ready
