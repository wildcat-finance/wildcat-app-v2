import {
  APR_REDUCTION_PROPOSAL_VALIDITY_PERIODS,
  Market,
} from "@wildcatfi/wildcat-sdk"

export type PendingPeriodicAprChange = {
  proposedAprBips: number
  proposalTimestamp: number
  responseWindowStart: number
  responseWindowEnd: number
  /**
   * Whether the lender response window has fully elapsed. This is the time-only
   * gate; it does NOT imply the change can be finalized on-chain — the contract
   * also requires `scaledPendingWithdrawals == 0` (UnpaidWithdrawalsExist).
   * Derive a true "can execute" from `marketAccount.previewSetAPR(...)`.
   */
  isResponseWindowElapsed: boolean
  isResponseWindowOpen: boolean
  /**
   * Unix seconds after which the proposal can no longer be executed on-chain
   * (template v2+ enforces `responseWindowEnd + validityPeriods * period`).
   */
  expiresAt: number
  isExpired: boolean
}

export const getPendingPeriodicAprChange = (
  market: Market,
  nowSec = Date.now() / 1000,
): PendingPeriodicAprChange | undefined => {
  const config = market.periodicHooksConfig
  if (!config?.pendingAprChangeProposalTimestamp) return undefined

  // Proposals are strict reductions on-chain, and both paths that bring the
  // market APR up to (execute) or above (increase) the proposed value delete
  // the proposal in the same transaction. So `proposed >= current` can only
  // mean the indexed proposal fields are lagging behind an APR update —
  // treat it as no pending change instead of rendering "8% to 8%" banners.
  if (config.pendingAprChangeAnnualInterestBips >= market.annualInterestBips) {
    return undefined
  }

  const expiresAt =
    config.pendingAprChangeResponseWindowEnd +
    config.periodDuration * APR_REDUCTION_PROPOSAL_VALIDITY_PERIODS

  return {
    proposedAprBips: config.pendingAprChangeAnnualInterestBips,
    proposalTimestamp: config.pendingAprChangeProposalTimestamp,
    responseWindowStart: config.pendingAprChangeResponseWindowStart,
    responseWindowEnd: config.pendingAprChangeResponseWindowEnd,
    isResponseWindowElapsed: nowSec >= config.pendingAprChangeResponseWindowEnd,
    isResponseWindowOpen:
      nowSec >= config.pendingAprChangeResponseWindowStart &&
      nowSec < config.pendingAprChangeResponseWindowEnd,
    expiresAt,
    isExpired: nowSec >= expiresAt,
  }
}
