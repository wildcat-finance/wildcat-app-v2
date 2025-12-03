export const FIXED_TERM_DURATION_LIMITS = {
  testnet: 365,
  mainnet: 730,
} as const

export const getMaxFixedTermDays = (isTestnet: boolean): number =>
  isTestnet
    ? FIXED_TERM_DURATION_LIMITS.testnet
    : FIXED_TERM_DURATION_LIMITS.mainnet
