import { Market } from "@wildcatfi/wildcat-sdk"

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
}

export const getPendingPeriodicAprChange = (
  market: Market,
  nowSec = Date.now() / 1000,
): PendingPeriodicAprChange | undefined => {
  const config = market.periodicHooksConfig
  if (!config?.pendingAprChangeProposalTimestamp) return undefined

  return {
    proposedAprBips: config.pendingAprChangeAnnualInterestBips,
    proposalTimestamp: config.pendingAprChangeProposalTimestamp,
    responseWindowStart: config.pendingAprChangeResponseWindowStart,
    responseWindowEnd: config.pendingAprChangeResponseWindowEnd,
    isResponseWindowElapsed: nowSec >= config.pendingAprChangeResponseWindowEnd,
    isResponseWindowOpen:
      nowSec >= config.pendingAprChangeResponseWindowStart &&
      nowSec < config.pendingAprChangeResponseWindowEnd,
  }
}
