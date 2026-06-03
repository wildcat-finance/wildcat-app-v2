export const FIXED_TERM_DURATION_LIMITS = {
  testnet: 365,
  mainnet: 730,
} as const

export const getMaxFixedTermDays = (isTestnet: boolean): number =>
  isTestnet
    ? FIXED_TERM_DURATION_LIMITS.testnet
    : FIXED_TERM_DURATION_LIMITS.mainnet

/**
 * Periodic-term schedule bounds. These MUST mirror the constants enforced by the
 * deployed `PeriodicTermHooks` contract, or the create-market form will accept
 * values that revert on-chain.
 *
 *   MinimumPeriodDuration               = 6 minutes       (360s)  [testnet floor]
 *   MaximumPeriodDuration               = 365 days  (31_536_000s)
 *   MinimumWithdrawalWindowDuration     = 1 minute          (60s)
 *   MaximumInitialWithdrawalWindowDelay = 365 days  (31_536_000s)
 *   withdrawalWindowDuration < periodDuration (strict)
 *
 * NOTE: `minPeriodSeconds` is the testnet floor; when the protocol raises
 * `MinimumPeriodDuration` for mainnet, update this single constant.
 */
export const PERIODIC_TERM_LIMITS = {
  minPeriodSeconds: 360,
  maxPeriodSeconds: 31_536_000,
  minWindowSeconds: 60,
  maxInitialDelaySeconds: 31_536_000,
} as const
